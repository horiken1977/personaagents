// ペルソナデータと選択されたペルソナを管理
let personas = [];
let selectedPersona = null;

// DOM読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', function() {
    loadPersonas();
    initializeEventListeners();
    loadSettings();
    loadSavedApiKeys();
});

// ペルソナデータの読み込み
async function loadPersonas() {
    try {
        const response = await fetch('personas.json');
        const data = await response.json();
        personas = data.personas;
        renderPersonaGrid();
    } catch (error) {
        console.error('ペルソナデータの読み込みに失敗しました:', error);
        showErrorMessage('ペルソナデータを読み込めませんでした。');
    }
}

// ペルソナグリッドのレンダリング
function renderPersonaGrid() {
    const grid = document.getElementById('personaGrid');
    if (!grid) return;

    grid.innerHTML = '';

    personas.forEach((persona, index) => {
        const card = createPersonaCard(persona, index);
        grid.appendChild(card);
    });
}

// ペルソナカードの作成
function createPersonaCard(persona, index) {
    const card = document.createElement('div');
    card.className = 'persona-card';
    card.setAttribute('data-persona-id', persona.id);
    
    // アニメーション遅延を設定
    card.style.animationDelay = `${index * 0.1}s`;

    card.innerHTML = `
        <div class="persona-header">
            <div class="persona-avatar">
                ${getPersonaInitials(persona.name)}
            </div>
            <div class="persona-info">
                <h3>${persona.name}</h3>
                <span class="persona-age">${persona.age}歳 | ${persona.location}</span>
            </div>
        </div>
        <div class="persona-segment">${persona.segment}</div>
        <div class="persona-details">
            <p><strong>世帯収入:</strong> ${persona.household_income}</p>
            <p><strong>家族構成:</strong> ${persona.family_status}</p>
            <p><strong>料理頻度:</strong> ${persona.cooking_frequency}</p>
            <p><strong>主な関心:</strong> ${persona.key_motivations}</p>
        </div>
    `;

    card.addEventListener('click', () => selectPersona(persona));
    
    return card;
}

// ペルソナ名からイニシャルを取得
function getPersonaInitials(name) {
    return name.split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .substring(0, 2);
}

// ペルソナ選択処理
function selectPersona(persona) {
    selectedPersona = persona;
    showConfirmModal(persona);
}

// 確認モーダル表示
function showConfirmModal(persona) {
    const modal = document.getElementById('confirmModal');
    const info = document.getElementById('selectedPersonaInfo');
    
    info.innerHTML = `
        <div class="selected-persona-preview">
            <h4>${persona.name} (${persona.age}歳)</h4>
            <p><strong>セグメント:</strong> ${persona.segment}</p>
            <p><strong>居住地:</strong> ${persona.location}</p>
            <p><strong>特徴:</strong> ${persona.key_motivations}</p>
            <p><strong>課題:</strong> ${persona.pain_points}</p>
        </div>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// 確認モーダルを閉じる
function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    selectedPersona = null;
}

// 対話開始処理
function startChat() {
    if (!selectedPersona) {
        showErrorMessage('ペルソナが選択されていません。');
        return;
    }

    const llmProvider = document.getElementById('llmProvider').value;
    const apiKey = document.getElementById('apiKey').value;

    if (!apiKey.trim()) {
        showErrorMessage('APIキーを入力してください。');
        return;
    }

    // 設定を保存
    saveSettings(llmProvider, apiKey);

    // チャット画面に遷移
    const params = new URLSearchParams({
        personaId: selectedPersona.id,
        llmProvider: llmProvider
    });
    
    window.location.href = `chat.html?${params.toString()}`;
}

// イベントリスナーの初期化
function initializeEventListeners() {
    // 確認ボタン
    const confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', startChat);
    }

    // キャンセルボタン
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeConfirmModal);
    }

    // モーダル外クリックで閉じる
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeConfirmModal();
            }
        });
    }

    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeConfirmModal();
        }
    });

    // LLMプロバイダー変更時の処理
    const llmProvider = document.getElementById('llmProvider');
    if (llmProvider) {
        llmProvider.addEventListener('change', function() {
            updateApiKeyPlaceholder(this.value);
            loadSavedApiKey(this.value);
        });
    }

    // APIキー入力時の処理
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', function() {
            const hasKey = this.value.trim().length > 0;
            document.getElementById('testApiBtn').disabled = !hasKey;
            document.getElementById('saveApiBtn').disabled = !hasKey;
        });
    }

    // API疎通確認ボタン
    const testApiBtn = document.getElementById('testApiBtn');
    if (testApiBtn) {
        testApiBtn.addEventListener('click', testApiConnection);
    }

    // API保存ボタン
    const saveApiBtn = document.getElementById('saveApiBtn');
    if (saveApiBtn) {
        saveApiBtn.addEventListener('click', saveApiKey);
    }
}

// APIキーのプレースホルダー更新
function updateApiKeyPlaceholder(provider) {
    const apiKeyInput = document.getElementById('apiKey');
    if (!apiKeyInput) return;

    const placeholders = {
        'openai': 'sk-...',
        'claude': 'sk-ant-...',
        'gemini': 'AIza...'
    };

    apiKeyInput.placeholder = placeholders[provider] || 'APIキーを入力してください';
}

// 設定の保存（セッションストレージ）
function saveSettings(llmProvider, apiKey) {
    try {
        sessionStorage.setItem('llmProvider', llmProvider);
        sessionStorage.setItem('apiKey', apiKey);
    } catch (error) {
        console.warn('設定の保存に失敗しました:', error);
    }
}

// 設定の読み込み
function loadSettings() {
    try {
        const savedProvider = sessionStorage.getItem('llmProvider');
        const savedApiKey = sessionStorage.getItem('apiKey');

        if (savedProvider) {
            const providerSelect = document.getElementById('llmProvider');
            if (providerSelect) {
                providerSelect.value = savedProvider;
                updateApiKeyPlaceholder(savedProvider);
            }
        }

        if (savedApiKey) {
            const apiKeyInput = document.getElementById('apiKey');
            if (apiKeyInput) {
                apiKeyInput.value = savedApiKey;
            }
        }
    } catch (error) {
        console.warn('設定の読み込みに失敗しました:', error);
    }
}

// エラーメッセージ表示
function showErrorMessage(message) {
    // 既存のエラーメッセージを削除
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    // エラーメッセージ要素を作成
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 1001;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);

    // 3秒後に自動削除
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => errorDiv.remove(), 300);
        }
    }, 3000);
}

// APIキー保存機能
function saveApiKey() {
    const provider = document.getElementById('llmProvider').value;
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
        showErrorMessage('APIキーを入力してください');
        return;
    }
    
    try {
        localStorage.setItem(`apiKey_${provider}`, apiKey);
        showSuccessMessage('APIキーを保存しました');
    } catch (error) {
        console.error('APIキー保存エラー:', error);
        showErrorMessage('APIキーの保存に失敗しました');
    }
}

// 保存されたAPIキーの読み込み
function loadSavedApiKeys() {
    const provider = document.getElementById('llmProvider').value;
    loadSavedApiKey(provider);
}

function loadSavedApiKey(provider) {
    try {
        const savedKey = localStorage.getItem(`apiKey_${provider}`);
        const apiKeyInput = document.getElementById('apiKey');
        
        if (savedKey && apiKeyInput) {
            apiKeyInput.value = savedKey;
            document.getElementById('testApiBtn').disabled = false;
            document.getElementById('saveApiBtn').disabled = false;
        } else if (apiKeyInput) {
            apiKeyInput.value = '';
            document.getElementById('testApiBtn').disabled = true;
            document.getElementById('saveApiBtn').disabled = true;
        }
    } catch (error) {
        console.warn('APIキー読み込みエラー:', error);
    }
}

// API疎通確認
async function testApiConnection() {
    const provider = document.getElementById('llmProvider').value;
    const apiKey = document.getElementById('apiKey').value.trim();
    const resultDiv = document.getElementById('apiTestResult');
    
    if (!apiKey) {
        showErrorMessage('APIキーを入力してください');
        return;
    }
    
    // テスト中表示
    resultDiv.className = 'api-test-result testing';
    resultDiv.textContent = 'API接続をテスト中...';
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider: provider,
                apiKey: apiKey,
                prompt: 'Hello, please respond with "Test successful" if you receive this message.',
                personaId: 1,
                test: true
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.response) {
            resultDiv.className = 'api-test-result success';
            resultDiv.textContent = '✅ API接続に成功しました';
        } else {
            resultDiv.className = 'api-test-result error';
            resultDiv.textContent = `❌ API接続に失敗: ${result.error || '不明なエラー'}`;
        }
    } catch (error) {
        console.error('API接続テストエラー:', error);
        resultDiv.className = 'api-test-result error';
        resultDiv.textContent = '❌ 接続エラーが発生しました';
    }
}

// 成功メッセージ表示
function showSuccessMessage(message) {
    const existingMessage = document.querySelector('.success-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 1001;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;
    successDiv.textContent = message;

    document.body.appendChild(successDiv);

    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => successDiv.remove(), 300);
        }
    }, 2000);
}

// CSS アニメーション追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .selected-persona-preview {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 15px;
    }
    .selected-persona-preview h4 {
        color: #2c3e50;
        margin-bottom: 15px;
        font-size: 1.2rem;
    }
    .selected-persona-preview p {
        margin-bottom: 8px;
        color: #555;
    }
    .selected-persona-preview strong {
        color: #2c3e50;
    }
`;
document.head.appendChild(style);