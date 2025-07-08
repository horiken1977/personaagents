'use client';

import { useEffect } from 'react';

export default function SetupPage() {
  useEffect(() => {
    // このページは廃止されました。ホームページにリダイレクト
    window.location.href = '/';
  }, []);
  
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h2>ページが移動しました</h2>
        <p>設定機能はメインページに統合されました。</p>
        <p><a href="/" style={{ color: '#007bff' }}>ホームページに移動</a></p>
      </div>
    </div>
  );
}