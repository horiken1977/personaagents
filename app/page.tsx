'use client';

import { useEffect, useState } from 'react';
import { Metadata } from 'next';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  target_market: string;
  focus_area: string;
  personas: Persona[];
}

interface Persona {
  id: number;
  name: string;
  age: number;
  background: string;
  interests: string[];
  shopping_habits: string;
  decision_factors: string[];
  communication_style: string;
  avatar: string;
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/personas.json');
      const data = await response.json();
      setCategories(data.categories || []);
      setLoading(false);
    } catch (err) {
      setError('カテゴリデータの読み込みに失敗しました。');
      setLoading(false);
    }
  };

  const selectCategory = (category: Category) => {
    setSelectedCategory(category);
    setSelectedPersona(null);
  };

  const selectPersona = (persona: Persona) => {
    setSelectedPersona(persona);
    // チャットページにリダイレクト
    window.location.href = `/chat.html?personaId=${persona.id}&categoryId=${selectedCategory?.id}`;
  };

  const goBack = () => {
    if (selectedCategory && !selectedPersona) {
      setSelectedCategory(null);
    } else if (selectedPersona) {
      setSelectedPersona(null);
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
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>北米市場調査AIエージェント</h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '1.2rem', opacity: 0.9 }}>
          日系調味料メーカーの北米進出を支援するAIペルソナとの対話システム
        </p>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {!selectedCategory ? (
          <section>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>カテゴリを選択してください</h2>
              <p style={{ fontSize: '1.1rem', color: '#666' }}>対話したいペルソナのカテゴリを選択してください。</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {categories.map((category, index) => (
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
                    border: '1px solid #e0e0e0',
                    animationDelay: `${index * 0.2}s`
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
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ display: 'inline-block', marginRight: '0.5rem' }}>🎯</span>
                      <span style={{ color: '#555' }}>{category.focus_area}</span>
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
          <section>
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
                ← カテゴリ選択に戻る
              </button>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{selectedCategory.name}</h2>
              <p style={{ color: '#666', fontSize: '1.1rem' }}>対話したいペルソナを選択してください。</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {selectedCategory.personas.map((persona, index) => (
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
                    <div style={{ fontSize: '3rem', marginRight: '1rem' }}>{persona.avatar}</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#333' }}>{persona.name}</h3>
                      <p style={{ margin: '0.25rem 0 0', color: '#666' }}>{persona.age}歳</p>
                    </div>
                  </div>
                  <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                    {persona.background}
                  </p>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                      <strong>興味・関心:</strong> {persona.interests.join(', ')}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      <strong>コミュニケーション:</strong> {persona.communication_style}
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