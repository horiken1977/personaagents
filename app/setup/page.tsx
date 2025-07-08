'use client';

import { useState, useEffect } from 'react';

export default function SetupPage() {
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasExistingKeys, setHasExistingKeys] = useState({
    openai: false,
    anthropic: false,
    google: false
  });

  useEffect(() => {
    checkExistingKeys();
  }, []);

  const checkExistingKeys = async () => {
    try {
      const response = await fetch('/api?action=get_api_keys');
      if (response.ok) {
        const keys = await response.json();
        setHasExistingKeys(keys);
      }
    } catch (error) {
      console.error('Failed to check existing keys:', error);
    }
  };

  const handleInputChange = (provider: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: 'info', text: 'APIキーの設定状況を確認中...' });

    try {
      // 実際には、Next.jsアプリでは環境変数としてAPIキーを設定する必要があることを説明
      const configuredCount = Object.values(hasExistingKeys).filter(Boolean).length;
      
      setMessage({
        type: 'success',
        text: `現在 ${configuredCount} 個のAPIキーが環境変数として設定されています。新しいAPIキーを追加するには、Vercelダッシュボードで環境変数を設定してください。`
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'APIキーの確認に失敗しました。'
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (provider: string) => {
    setLoading(true);
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

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: `${provider.toUpperCase()} API接続テストが成功しました！`
        });
      } else {
        const errorText = await response.text();
        setMessage({
          type: 'error',
          text: `${provider.toUpperCase()} API接続テストが失敗しました: ${errorText}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `${provider.toUpperCase()} API接続テストでエラーが発生しました。`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.6, color: '#333' }}>
      <header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>API設定</h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '1.2rem', opacity: 0.9 }}>
          AIプロバイダーのAPIキー設定と接続テスト
        </p>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        {message && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            backgroundColor: message.type === 'success' ? '#d4edda' : message.type === 'error' ? '#f8d7da' : '#d1ecf1',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : message.type === 'error' ? '#f5c6cb' : '#bee5eb'}`,
            color: message.type === 'success' ? '#155724' : message.type === 'error' ? '#721c24' : '#0c5460'
          }}>
            {message.text}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>現在の設定状況</h2>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(hasExistingKeys).map(([provider, isConfigured]) => (
              <div key={provider} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                border: '1px solid #e0e0e0',
                borderRadius: '8px'
              }}>
                <div>
                  <strong>{provider.toUpperCase()} API</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
                    {isConfigured ? '✅ 設定済み' : '❌ 未設定'}
                  </p>
                </div>
                {isConfigured && (
                  <button
                    onClick={() => testConnection(provider)}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    接続テスト
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>APIキーの設定方法</h2>
          
          <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#495057' }}>🔧 Vercelでの環境変数設定</h3>
            <ol style={{ paddingLeft: '1.5rem', lineHeight: 1.8 }}>
              <li><a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>Vercelダッシュボード</a> にアクセス</li>
              <li>プロジェクト「personaagents」を選択</li>
              <li>Settings → Environment Variables に移動</li>
              <li>以下の環境変数を追加:</li>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li><code>OPENAI_API_KEY</code> - OpenAI APIキー</li>
                <li><code>ANTHROPIC_API_KEY</code> - Anthropic APIキー</li>
                <li><code>GOOGLE_AI_API_KEY</code> - Google AI APIキー</li>
              </ul>
              <li>保存後、デプロイメントを再実行</li>
            </ol>
          </div>

          <div style={{ background: '#fff3cd', padding: '1.5rem', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
            <h3 style={{ marginBottom: '1rem', color: '#856404' }}>⚠️ 重要な注意事項</h3>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: '#856404' }}>
              <li>APIキーは環境変数として安全に管理されます</li>
              <li>ブラウザやログにAPIキーが表示されることはありません</li>
              <li>環境変数の変更後は必ずデプロイメントを再実行してください</li>
              <li>開発環境では <code>.env.local</code> ファイルでAPIキーを設定できます</li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            ← ホームに戻る
          </button>
        </div>
      </main>
    </div>
  );
}