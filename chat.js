// チャット画面の状態管理
let currentPersona = null;
let chatHistory = [];
let isAuthenticated = false;
let gapi = null;

// DOM読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeChat();
    loadPersonaFromUrl();
    initializeEventListeners();
    loadChatHistory();
    initializeGoogleAPI();
    checkApiKeysAndHideInputs();
});

// チャット初期化
function initializeChat() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// URLパラメータからペルソナ情報を読み込み
async function loadPersonaFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const personaId = urlParams.get('personaId');
    const llmProvider = urlParams.get('llmProvider');

    if (!personaId) {
        showErrorMessage('ペルソナが選択されていません。');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }

    try {
        const response = await fetch('personas.json');
        const data = await response.json();
        currentPersona = data.personas.find(p => p.id == personaId);

        if (!currentPersona) {
            throw new Error('ペルソナが見つかりません。');
        }

        updatePersonaDisplay();
        
        // LLMプロバイダーをセッションに保存
        if (llmProvider) {
            sessionStorage.setItem('llmProvider', llmProvider);
        }

    } catch (error) {
        console.error('ペルソナデータの読み込みに失敗:', error);
        showErrorMessage('ペルソナデータの読み込みに失敗しました。');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
}

// ペルソナ表示の更新
function updatePersonaDisplay() {
    if (!currentPersona) return;

    const personaAvatar = document.getElementById('personaAvatar');
    const personaName = document.getElementById('personaName');
    const personaDescription = document.getElementById('personaDescription');

    if (personaAvatar) {
        personaAvatar.textContent = getPersonaInitials(currentPersona.name);
    }

    if (personaName) {
        personaName.textContent = currentPersona.name;
    }

    if (personaDescription) {
        personaDescription.textContent = `${currentPersona.age}歳 | ${currentPersona.segment} | ${currentPersona.location}`;
    }
}

// ペルソナ名からイニシャルを取得
function getPersonaInitials(name) {
    return name.split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .substring(0, 2);
}

// イベントリスナーの初期化
function initializeEventListeners() {
    // 送信ボタン
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    // チャット入力フィールド
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        chatInput.addEventListener('input', updateCharCount);
    }

    // 戻るボタン
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // サイドバー関連
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');

    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', toggleSidebar);
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeSidebar);
    }

    // サイドバー外クリックで閉じる
    document.addEventListener('click', function(e) {
        if (sidebar && sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !toggleSidebarBtn.contains(e.target)) {
            closeSidebar();
        }
    });

    // Google Sheets保存関連
    const saveToSheetsBtn = document.getElementById('saveToSheetsBtn');
    const authenticateBtn = document.getElementById('authenticateBtn');
    const saveNowBtn = document.getElementById('saveNowBtn');
    const cancelSaveBtn = document.getElementById('cancelSaveBtn');

    if (saveToSheetsBtn) {
        saveToSheetsBtn.addEventListener('click', showSheetsModal);
    }

    if (authenticateBtn) {
        authenticateBtn.addEventListener('click', authenticateGoogle);
    }

    if (saveNowBtn) {
        saveNowBtn.addEventListener('click', saveToSheets);
    }

    if (cancelSaveBtn) {
        cancelSaveBtn.addEventListener('click', closeSheetsModal);
    }

    // 履歴管理
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearChatHistory);
    }

    if (exportHistoryBtn) {
        exportHistoryBtn.addEventListener('click', exportChatHistory);
    }
}

// 文字数カウント更新
function updateCharCount() {
    const chatInput = document.getElementById('chatInput');
    const charCount = document.querySelector('.char-count');
    
    if (chatInput && charCount) {
        const count = chatInput.value.length;
        charCount.textContent = `${count}/1000`;
        
        if (count > 900) {
            charCount.style.color = '#dc3545';
        } else if (count > 800) {
            charCount.style.color = '#ffc107';
        } else {
            charCount.style.color = '#666';
        }
    }
}

// メッセージ送信
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (!chatInput || !sendBtn) return;

    const message = chatInput.value.trim();
    if (!message) {
        showErrorMessage('メッセージを入力してください。');
        return;
    }

    if (!currentPersona) {
        showErrorMessage('ペルソナが設定されていません。');
        return;
    }

    // UI更新
    sendBtn.disabled = true;
    chatInput.disabled = true;
    
    // ユーザーメッセージを表示
    addMessageToChat('user', message);
    chatInput.value = '';
    updateCharCount();

    // ローディング表示
    showLoadingOverlay();

    try {
        // AIからの応答を取得
        const response = await getAIResponse(message);
        
        // AI応答を表示
        addMessageToChat('assistant', response);
        
        // 履歴に保存
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            personaId: currentPersona.id,
            personaName: currentPersona.name,
            question: message,
            answer: response
        };
        
        chatHistory.push(historyItem);
        saveChatHistory();
        updateHistoryDisplay();

    } catch (error) {
        console.error('AI応答の取得に失敗:', error);
        showErrorMessage('AI応答の取得に失敗しました。APIキーや設定を確認してください。');
        addMessageToChat('assistant', 'すみません、応答の生成に失敗しました。しばらく時間をおいてから再度お試しください。');
    } finally {
        // UI復旧
        sendBtn.disabled = false;
        chatInput.disabled = false;
        hideLoadingOverlay();
        chatInput.focus();
    }
}

// AIレスポンス取得
async function getAIResponse(userMessage) {
    const llmProvider = sessionStorage.getItem('llmProvider') || 'openai';
    const prompt = createPersonaPrompt(userMessage);

    try {
        const response = await fetch('/persona/api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider: llmProvider,
                prompt: prompt,
                personaId: currentPersona.id
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        return data.response || '応答の生成に失敗しました。';

    } catch (error) {
        console.error('API呼び出しエラー:', error);
        throw error;
    }
}

// ペルソナプロンプト作成
function createPersonaPrompt(userMessage) {
    return `あなたは${currentPersona.name}という${currentPersona.age}歳の${currentPersona.segment}です。以下の特徴を持つ人物として回答してください：

【基本情報】
- 年齢: ${currentPersona.age}歳
- 居住地: ${currentPersona.location}
- 世帯収入: ${currentPersona.household_income}
- 家族構成: ${currentPersona.family_status}

【生活スタイル】
- 料理頻度: ${currentPersona.cooking_frequency}
- 健康への関心: ${currentPersona.health_concerns}
- 買い物行動: ${currentPersona.shopping_behavior}
- 食べ物の好み: ${currentPersona.food_preferences}

【調味料の使用状況】
- ${currentPersona.condiment_usage}

【価格感度】
- ${currentPersona.price_sensitivity}

【主な動機・価値観】
- ${currentPersona.key_motivations}

【悩み・課題】
- ${currentPersona.pain_points}

【日本食への接触経験】
- ${currentPersona.japanese_food_exposure}

【購入決定要因】
- ${currentPersona.purchase_drivers}

この人物になりきって、日系調味料メーカーの市場調査のための質問に答えてください。回答は自然で具体的な表現を使い、この人物の立場や価値観を反映させてください。

質問: ${userMessage}`;
}

// チャットにメッセージを追加
function addMessageToChat(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    // ウェルカムメッセージを削除
    const welcomeMessage = chatMessages.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    bubbleDiv.textContent = message;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';
    metaDiv.textContent = new Date().toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageDiv.appendChild(bubbleDiv);
    messageDiv.appendChild(metaDiv);
    chatMessages.appendChild(messageDiv);

    // スクロール
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// サイドバー表示/非表示
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.remove('open');
    }
}

// 履歴関連
function loadChatHistory() {
    try {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            chatHistory = JSON.parse(saved);
        }
        updateHistoryDisplay();
    } catch (error) {
        console.warn('履歴の読み込みに失敗:', error);
        chatHistory = [];
    }
}

function saveChatHistory() {
    try {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    } catch (error) {
        console.warn('履歴の保存に失敗:', error);
    }
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    historyList.innerHTML = '';

    if (chatHistory.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">まだ対話履歴がありません</p>';
        return;
    }

    chatHistory.slice().reverse().forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-item-question">${truncateText(item.question, 50)}</div>
            <div class="history-item-preview">${truncateText(item.answer, 80)}</div>
            <div class="history-item-time">${new Date(item.timestamp).toLocaleString('ja-JP')}</div>
        `;

        historyItem.addEventListener('click', () => {
            // 履歴アイテムクリック時の処理（詳細表示など）
            showHistoryDetail(item);
        });

        historyList.appendChild(historyItem);
    });
}

function clearChatHistory() {
    if (confirm('本当に対話履歴をクリアしますか？この操作は取り消せません。')) {
        chatHistory = [];
        saveChatHistory();
        updateHistoryDisplay();
        showSuccessMessage('対話履歴をクリアしました。');
    }
}

function exportChatHistory() {
    if (chatHistory.length === 0) {
        showErrorMessage('エクスポートする履歴がありません。');
        return;
    }

    const exportData = {
        exportDate: new Date().toISOString(),
        totalItems: chatHistory.length,
        history: chatHistory
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSuccessMessage('履歴をエクスポートしました。');
}

// Google API初期化
function initializeGoogleAPI() {
    // Google APIが読み込まれていない場合は初期化しない
    if (typeof gapi === 'undefined' || !gapi || !gapi.load) {
        console.log('Google API is not loaded or not available');
        return;
    }
    
    // クライアントIDが設定されているか確認
    fetch('/persona/api.php?action=get_google_config')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch Google config');
            }
            return response.json();
        })
        .then(data => {
            if (data.client_id && data.client_id !== '') {
                gapi.load('auth2', function() {
                    gapi.auth2.init({
                        client_id: data.client_id
                    });
                });
            } else {
                console.log('Google Client ID not configured');
            }
        })
        .catch(error => {
            console.log('Google API configuration not available:', error);
        });
}

// APIキーの状態をチェックして入力フィールドを非表示にする
async function checkApiKeysAndHideInputs() {
    try {
        const response = await fetch('/persona/api.php?action=get_api_keys');
        if (response.ok) {
            const hasKeys = await response.json();
            
            // いずれかのAPIキーが設定されている場合は入力フィールドを非表示
            if (hasKeys.openai || hasKeys.claude || hasKeys.gemini) {
                const apiKeySection = document.querySelector('.api-key-section');
                if (apiKeySection) {
                    apiKeySection.style.display = 'none';
                }
                
                // 設定済みメッセージを表示
                const settingsMessage = document.createElement('div');
                settingsMessage.className = 'settings-message';
                settingsMessage.innerHTML = `
                    <p>✅ APIキーが設定済みです</p>
                    <a href="setup.php" class="btn btn-secondary btn-sm">設定を変更</a>
                `;
                settingsMessage.style.cssText = `
                    background: #d4edda;
                    color: #155724;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                `;
                
                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer) {
                    chatContainer.insertBefore(settingsMessage, chatContainer.firstChild);
                }
            }
        }
    } catch (error) {
        console.log('Failed to check API keys:', error);
    }
}

// Google Sheets関連
function showSheetsModal() {
    const modal = document.getElementById('sheetsModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeSheetsModal() {
    const modal = document.getElementById('sheetsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function authenticateGoogle() {
    try {
        showLoadingOverlay();
        
        // Google OAuth2認証の実装
        // 実際の実装では、google_auth.php を通じて認証を行う
        const response = await fetch('google_auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'authenticate'
            })
        });

        const data = await response.json();
        
        if (data.success) {
            isAuthenticated = true;
            updateAuthStatus(true);
            document.getElementById('saveNowBtn').disabled = false;
            showSuccessMessage('Google認証が完了しました。');
        } else {
            throw new Error(data.error || '認証に失敗しました。');
        }

    } catch (error) {
        console.error('Google認証エラー:', error);
        showErrorMessage('Google認証に失敗しました。');
    } finally {
        hideLoadingOverlay();
    }
}

async function saveToSheets() {
    if (!isAuthenticated) {
        showErrorMessage('先にGoogle認証を完了してください。');
        return;
    }

    if (chatHistory.length === 0) {
        showErrorMessage('保存する対話データがありません。');
        return;
    }

    try {
        showLoadingOverlay();

        const spreadsheetId = document.getElementById('spreadsheetId').value.trim();
        
        const response = await fetch('sheets_integration.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'save',
                spreadsheetId: spreadsheetId,
                data: chatHistory
            })
        });

        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage(`データをGoogle Sheetsに保存しました。スプレッドシートID: ${result.spreadsheetId}`);
            closeSheetsModal();
        } else {
            throw new Error(result.error || '保存に失敗しました。');
        }

    } catch (error) {
        console.error('Sheets保存エラー:', error);
        showErrorMessage('Google Sheetsへの保存に失敗しました。');
    } finally {
        hideLoadingOverlay();
    }
}

function updateAuthStatus(authenticated) {
    const authStatus = document.getElementById('authStatus');
    if (authStatus) {
        if (authenticated) {
            authStatus.textContent = '認証済み';
            authStatus.classList.add('authenticated');
        } else {
            authStatus.textContent = '未認証';
            authStatus.classList.remove('authenticated');
        }
    }
}

// ユーティリティ関数
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function showHistoryDetail(item) {
    // 履歴詳細表示のモーダルを実装
    alert(`質問: ${item.question}\\n\\n回答: ${item.answer}`);
}

function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showMessage(message, type) {
    const existingMessage = document.querySelector('.toast-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-message';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        word-wrap: break-word;
        ${type === 'error' ? 'background: #dc3545;' : 'background: #28a745;'}
    `;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => messageDiv.remove(), 300);
        }
    }, 3000);
}