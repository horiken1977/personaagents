'use client';

import { useEffect, useState } from 'react';

// 新しい構造に対応した型定義
interface InterviewPurpose {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  context: string;
  key_aspects: string[];
}

interface PersonaCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  target_market: string;
  personas: Persona[];
}

interface PersonaFile {
  id: string;
  file: string;
  name: string;
  icon: string;
  description: string;
  target_market: string;
}

interface Persona {
  id: number;
  name: string;
  basic_demographics: {
    age: number;
    gender: string;
    location: string;
    household_income: string;
    family_status: string;
    occupation: string;
    education: string;
  };
  psychological_traits: {
    decision_making_style: string;
    risk_tolerance: string;
    information_processing: string;
    social_influence: string;
    change_adaptability: string;
  };
  lifestyle: {
    daily_routine: string;
    hobbies: string;
    media_consumption: string;
    shopping_habits: string;
  };
  values_and_motivations: {
    core_values: string[];
    life_goals: string[];
    pain_points: string[];
    aspirations: string[];
  };
  cultural_background: {
    ethnicity: string;
    cultural_values: string[];
    language: string;
    cultural_influences: string;
  };
  communication_style: {
    verbal_style: string;
    detail_preference: string;
    emotional_expression: string;
    preferred_channels: string;
  };
}

interface ApiStatus {
  available: boolean;
  tested: boolean;
  testing: boolean;
  connected?: boolean;
}

// 利用可能なペルソナファイル
const PERSONA_FILES: PersonaFile[] = [
  { 
    id: 'north_america_consumers', 
    file: '/personas/persona/north_america_consumers.json', 
    name: '北米消費者', 
    icon: '🇺🇸', 
    description: '北米市場の多様な消費者層を代表する10のペルソナ', 
    target_market: '北米市場' 
  },
  { 
    id: 'japanese_manufacturing_workers', 
    file: '/personas/persona/japanese_manufacturing_workers.json', 
    name: '日本製造業従業員', 
    icon: '🏭', 
    description: '日本の素材・化学製造業で働く多様な従業員層を代表する10のペルソナ', 
    target_market: '日本市場' 
  }
];

export default function Home() {
  // 状態管理
  const [purposes, setPurposes] = useState<InterviewPurpose[]>([]);
  const [categories, setCategories] = useState<PersonaCategory[]>([]);
  const [selectedPurpose, setSelectedPurpose] = useState<InterviewPurpose | null>(null);
  const [selectedPersonaFile, setSelectedPersonaFile] = useState<PersonaFile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PersonaCategory | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLLM, setSelectedLLM] = useState('openai');
  const [apiStatus, setApiStatus] = useState<Record<string, ApiStatus>>({
    openai: { available: false, tested: false, testing: false },
    claude: { available: false, tested: false, testing: false },
    gemini: { available: false, tested: false, testing: false }
  });

  useEffect(() => {
    loadData();
    checkApiStatus();
  }, []);

  useEffect(() => {
    // URLパラメータからカテゴリとペルソナを復元
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    const purposeParam = urlParams.get('purpose');
    
    console.log('現在のURL:', window.location.href);
    console.log('URLパラメータ purpose:', purposeParam);
    console.log('URLパラメータ category:', categoryParam);
    
    if (purposeParam && purposes.length > 0) {
      const purpose = purposes.find(p => p.id === purposeParam);
      if (purpose) {
        setSelectedPurpose(purpose);
      }
    }
    
    if (categoryParam && categories.length > 0) {
      const category = categories.find(c => c.id === categoryParam);
      if (category) {
        setSelectedCategory(category);
      }
    }
  }, [purposes, categories]);

  const loadData = async () => {
    try {
      // 調査目的を読み込み
      const purposesRes = await fetch('/personas/setting/interview_purposes.json');
      const purposesData = await purposesRes.json();
      setPurposes(purposesData.purposes || []);
      setLoading(false);
    } catch (err) {
      setError('データの読み込みに失敗しました。');
      setLoading(false);
    }
  };

  const loadPersonaCategory = async (personaFile: PersonaFile) => {
    try {
      setLoading(true);
      const response = await fetch(personaFile.file);
      const data = await response.json();
      const categories = data.categories || [];
      
      // カテゴリが1つしかない場合は直接選択
      if (categories.length === 1) {
        setSelectedCategory(categories[0]);
      } else {
        setCategories(categories);
      }
      
      setSelectedPersonaFile(personaFile);
      setLoading(false);
    } catch (err) {
      setError('ペルソナデータの読み込みに失敗しました。');
      setLoading(false);
    }
  };

  const checkApiStatus = async () => {
    try {
      const response = await fetch('/api?action=get_api_keys');
      if (response.ok) {
        const hasKeys: { openai: boolean; claude: boolean; gemini: boolean } = await response.json();
        setApiStatus(prev => ({
          openai: { ...prev.openai, available: hasKeys.openai },
          claude: { ...prev.claude, available: hasKeys.claude },
          gemini: { ...prev.gemini, available: hasKeys.gemini }
        }));
      }
    } catch (error) {
      console.error('API status check failed:', error);
    }
  };

  const testApiConnection = async (provider: string) => {
    if (!apiStatus[provider]) return;
    
    setApiStatus(prev => ({
      ...prev,
      [provider]: { ...prev[provider], testing: true }
    }));

    try {
      const response = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: provider,
          prompt: 'Hello, this is a test message.',
          test: true
        })
      });

      const success = response.ok;
      setApiStatus(prev => ({
        ...prev,
        [provider]: { 
          ...prev[provider], 
          testing: false,
          tested: true,
          connected: success
        }
      }));
    } catch (error) {
      setApiStatus(prev => ({
        ...prev,
        [provider]: { 
          ...prev[provider], 
          testing: false,
          tested: true,
          connected: false
        }
      }));
    }
  };

  const selectPurpose = (purpose: InterviewPurpose) => {
    setSelectedPurpose(purpose);
    setSelectedPersonaFile(null);
    setSelectedCategory(null);
    setSelectedPersona(null);
  };

  const selectCategory = (category: PersonaCategory) => {
    setSelectedCategory(category);
    setSelectedPersona(null);
  };

  const selectPersona = (persona: Persona) => {
    setSelectedPersona(persona);
    // チャットページにリダイレクト（調査目的も含める）
    window.location.href = `/chat-new.html?personaId=${persona.id}&categoryId=${selectedCategory?.id}&purposeId=${selectedPurpose?.id}&llmProvider=${selectedLLM}`;
  };

  const goBack = () => {
    if (selectedPersona) {
      setSelectedPersona(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
      // カテゴリが1つしかない場合はペルソナファイル選択に戻る
      if (categories.length === 1) {
        setSelectedPersonaFile(null);
        setCategories([]);
      }
    } else if (selectedPersonaFile) {
      setSelectedPersonaFile(null);
      setCategories([]);
    } else if (selectedPurpose) {
      setSelectedPurpose(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ color: 'red' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.6, color: '#333' }}>
      <header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>汎用インタビューAIエージェント</h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '1.2rem', opacity: 0.9 }}>
          様々な調査目的に対応する多様なペルソナとの対話システム
        </p>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* LLM選択とAPI状態パネル */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2rem', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                LLMプロバイダー選択:
              </label>
              <select
                value={selectedLLM}
                onChange={(e) => setSelectedLLM(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '1rem',
                  minWidth: '200px'
                }}
              >
                <option value="openai">OpenAI GPT-4</option>
                <option value="claude">Anthropic Claude</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {Object.entries(apiStatus).map(([provider, status]: [string, ApiStatus]) => {
                const isSelected = provider === selectedLLM;
                const statusColor = !status.available ? '#dc3545' : 
                                  status.testing ? '#ffc107' : 
                                  status.tested ? (status.connected ? '#28a745' : '#dc3545') : '#6c757d';
                
                return (
                  <div key={provider} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: `2px solid ${isSelected ? '#007bff' : '#e0e0e0'}`,
                    backgroundColor: isSelected ? '#f8f9fa' : 'white'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: statusColor
                    }}></div>
                    <span style={{ fontSize: '0.9rem', fontWeight: isSelected ? 'bold' : 'normal' }}>
                      {provider.toUpperCase()}
                    </span>
                    {status.available && (
                      <button
                        onClick={() => testApiConnection(provider)}
                        disabled={status.testing}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007bff',
                          cursor: status.testing ? 'not-allowed' : 'pointer',
                          fontSize: '0.8rem',
                          textDecoration: 'underline',
                          opacity: status.testing ? 0.6 : 1
                        }}
                      >
                        {status.testing ? 'テスト中...' : 'テスト'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* API状態の説明 */}
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <span><span style={{color: '#28a745'}}>●</span> 接続OK</span>
              <span><span style={{color: '#dc3545'}}>●</span> 未設定/エラー</span>
              <span><span style={{color: '#ffc107'}}>●</span> テスト中</span>
              <span><span style={{color: '#6c757d'}}>●</span> 未テスト</span>
            </div>
          </div>
        </div>

        {/* ナビゲーション */}
        {(selectedPurpose || selectedPersonaFile || selectedCategory) && (
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={goBack}
              style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                marginBottom: '1rem'
              }}
            >
              ← 戻る
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              {selectedPurpose && (
                <>
                  <span>{selectedPurpose.icon} {selectedPurpose.name}</span>
                  {selectedPersonaFile && <span> → </span>}
                </>
              )}
              {selectedPersonaFile && (
                <>
                  <span>{selectedPersonaFile.icon} {selectedPersonaFile.name}</span>
                  {selectedCategory && categories.length > 1 && <span> → </span>}
                </>
              )}
              {selectedCategory && categories.length > 1 && (
                <span>{selectedCategory.icon} {selectedCategory.name}</span>
              )}
            </div>
          </div>
        )}

        {/* コンテンツ表示 */}
        {!selectedPurpose ? (
          // 調査目的選択
          <section>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>調査目的を選択してください</h2>
              <p style={{ fontSize: '1.1rem', color: '#666' }}>インタビューの目的を選択してください。</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {purposes.map((purpose) => (
                <div
                  key={purpose.id}
                  onClick={() => selectPurpose(purpose)}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid #e0e0e0'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 12px 25px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '3rem', marginRight: '1rem' }}>{purpose.icon}</div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>{purpose.name}</h3>
                  </div>
                  <p style={{ color: '#666', marginBottom: '1.5rem', lineHeight: 1.6 }}>{purpose.description}</p>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ display: 'inline-block', marginRight: '0.5rem' }}>📁</span>
                      <span style={{ color: '#555' }}>カテゴリ: {purpose.category}</span>
                    </div>
                    <div>
                      <span style={{ display: 'inline-block', marginRight: '0.5rem' }}>🎯</span>
                      <span style={{ color: '#555' }}>
                        重点項目: {purpose.key_aspects.slice(0, 3).join(', ')}...
                      </span>
                    </div>
                  </div>
                  <button
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'opacity 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    この目的で開始
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : !selectedPersonaFile ? (
          // ペルソナファイル選択
          <section>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>ペルソナグループを選択してください</h2>
              <p style={{ fontSize: '1.1rem', color: '#666' }}>対話したいペルソナのグループを選択してください。</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
              {PERSONA_FILES.map((personaFile) => (
                <div
                  key={personaFile.id}
                  onClick={() => loadPersonaCategory(personaFile)}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid #e0e0e0'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 12px 25px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '3rem', marginRight: '1rem' }}>{personaFile.icon}</div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>{personaFile.name}</h3>
                  </div>
                  <p style={{ color: '#666', marginBottom: '1.5rem', lineHeight: 1.6 }}>{personaFile.description}</p>
                  <div style={{ marginBottom: '1rem' }}>
                    <div>
                      <span style={{ display: 'inline-block', marginRight: '0.5rem' }}>🌍</span>
                      <span style={{ color: '#555' }}>ターゲット市場: {personaFile.target_market}</span>
                    </div>
                  </div>
                  <button
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'opacity 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    このグループを選択
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : !selectedCategory && categories.length > 1 ? (
          // ペルソナカテゴリ選択（複数カテゴリがある場合のみ表示）
          <section>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>カテゴリを選択してください</h2>
              <p style={{ fontSize: '1.1rem', color: '#666' }}>ペルソナのカテゴリを選択してください。</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => selectCategory(category)}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid #e0e0e0'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 12px 25px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '3rem', marginRight: '1rem' }}>{category.icon}</div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>{category.name}</h3>
                  </div>
                  <p style={{ color: '#666', marginBottom: '1.5rem', lineHeight: 1.6 }}>{category.description}</p>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ display: 'inline-block', marginRight: '0.5rem' }}>🌍</span>
                      <span style={{ color: '#555' }}>{category.target_market}</span>
                    </div>
                    <div>
                      <span style={{ display: 'inline-block', marginRight: '0.5rem' }}>👥</span>
                      <span style={{ color: '#555' }}>{category.personas.length}人のペルソナ</span>
                    </div>
                  </div>
                  <button
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'opacity 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    このカテゴリを選択
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          // ペルソナ選択
          <section>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{selectedCategory?.name || selectedPersonaFile?.name}から選択</h2>
              <p style={{ fontSize: '1.1rem', color: '#666' }}>対話したいペルソナを選択してください。</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {(selectedCategory?.personas || []).map((persona) => (
                <div
                  key={persona.id}
                  onClick={() => selectPersona(persona)}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid #e0e0e0'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '3rem', marginRight: '1rem' }}>👤</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#333' }}>{persona.name}</h3>
                      <p style={{ margin: '0.25rem 0 0', color: '#666' }}>
                        {persona.basic_demographics.age}歳・{persona.basic_demographics.occupation}
                      </p>
                    </div>
                  </div>
                  <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                    {persona.basic_demographics.location} | {persona.basic_demographics.family_status}
                  </p>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                      <strong>性格:</strong> {persona.psychological_traits.decision_making_style}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                      <strong>価値観:</strong> {persona.values_and_motivations.core_values.slice(0, 2).join(', ')}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      <strong>ライフスタイル:</strong> {persona.lifestyle.hobbies.split('、')[0]}
                    </div>
                  </div>
                  <button
                    style={{
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    チャット開始
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}