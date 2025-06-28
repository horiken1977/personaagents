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
    checkApiKeysAndHideInputs();
    
    // Google Identity Services (GIS) マネージャーを使用
    if (window.googleGISManager) {
        console.log('Starting Google GIS initialization...');
        setTimeout(() => {
            window.googleGISManager.init().catch(error => {
                console.error('Google GIS initialization failed:', error);
                disableGoogleFeatures();
            });
        }, 1000); // 1秒遅延で開始
    } else {
        console.log('Google GIS manager not available');
        disableGoogleFeatures();
    }
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

// 旧Google API初期化コード（削除済み - 新しいマネージャーシステムを使用）

// Google API状態回復の試行（削除済み - 新しいマネージャーシステムを使用）

// Google Client ID検証
function validateGoogleClientId(clientId) {
    if (!clientId || typeof clientId !== 'string') {
        return { valid: false, error: 'Client IDが空または無効です' };
    }
    
    // 基本的な形式チェック
    const clientIdPattern = /^[0-9]+-[a-zA-Z0-9_]+\.apps\.googleusercontent\.com$/;
    if (!clientIdPattern.test(clientId)) {
        return { 
            valid: false, 
            error: 'Client IDの形式が正しくありません。正しい形式: xxxxx.apps.googleusercontent.com' 
        };
    }
    
    // 現在のドメインチェック
    const currentDomain = window.location.hostname;
    console.log('Current domain:', currentDomain);
    
    // リダイレクトURIの妥当性チェック（開発用の警告）
    if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
        console.warn('Warning: Running on localhost. Make sure your Google OAuth Client ID includes localhost in authorized domains.');
    } else if (!currentDomain.includes('sakura.ne.jp')) {
        console.warn('Warning: Current domain may not be authorized in Google OAuth settings.');
    }
    
    return { valid: true, error: null };
}

// Google機能を無効化
function disableGoogleFeatures() {
    const saveToSheetsBtn = document.getElementById('saveToSheetsBtn');
    if (saveToSheetsBtn) {
        saveToSheetsBtn.style.display = 'none';
    }
    console.log('Google Sheets features disabled');
}

// Google機能を有効化
function enableGoogleFeatures() {
    const saveToSheetsBtn = document.getElementById('saveToSheetsBtn');
    if (saveToSheetsBtn) {
        saveToSheetsBtn.style.display = 'inline-block';
    }
    console.log('Google Sheets features enabled');
}

// Google API状態の詳細診断（削除済み - 新しいマネージャーシステムを使用）

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
        showLoadingOverlay('Google認証中...');
        
        // Google Identity Services (GIS) マネージャーを使用
        if (!window.googleGISManager) {
            throw new Error('Google Identity Servicesが利用できません。ページを再読み込みしてください。');
        }
        
        // 初期化が完了していない場合は初期化を実行
        if (!window.googleGISManager.initialized) {
            console.log('Google GIS not initialized, starting initialization...');
            await window.googleGISManager.init();
        }
        
        console.log('Starting Google Identity Services authentication...');
        showLoadingOverlay('Googleアカウント認証中...');
        
        // GISを使用してアクセストークンを取得
        const accessToken = await window.googleGISManager.requestAccessToken();
        
        console.log('Access token received successfully');
        
        // ユーザー情報を取得
        const userInfo = await fetchGoogleUserInfo(accessToken);
        
        // 認証状態を更新
        isAuthenticated = true;
        window.googleAccessToken = accessToken; // トークンを保存
        window.googleUserInfo = userInfo; // ユーザー情報を保存
        updateAuthStatus(true);
        
        const saveBtn = document.getElementById('saveNowBtn');
        if (saveBtn) saveBtn.disabled = false;
        
        showSuccessMessage('Google認証が完了しました。');

    } catch (error) {
        console.error('Google認証エラー:', error);
        isAuthenticated = false;
        updateAuthStatus(false);
        showErrorMessage('Google認証に失敗しました: ' + error.message);
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
        showLoadingOverlay('Google Sheetsに保存中...');

        // GISで取得したアクセストークンを使用
        if (!window.googleAccessToken) {
            throw new Error('有効なアクセストークンがありません。再度認証してください。');
        }
        
        const accessToken = window.googleAccessToken;
        const userInfo = window.googleUserInfo || { email: 'Unknown', name: 'Unknown User' };
        const llmProvider = sessionStorage.getItem('llmProvider') || 'Unknown';

        // 設定からスプレッドシートIDを取得
        const configResponse = await fetch('/persona/api.php?action=get_google_config');
        if (!configResponse.ok) {
            throw new Error('スプレッドシート設定の取得に失敗しました。');
        }
        
        const configData = await configResponse.json();
        let spreadsheetId = configData.spreadsheet_id;
        
        // スプレッドシートIDが設定されていない場合は新規作成
        if (!spreadsheetId) {
            console.log('スプレッドシートIDが設定されていないため、新規作成します...');
            
            const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    properties: {
                        title: 'PersonaAgent対話履歴'
                    },
                    sheets: [{
                        properties: {
                            title: 'チャット履歴'
                        }
                    }]
                })
            });

            if (!createResponse.ok) {
                const errorData = await createResponse.json().catch(() => ({}));
                throw new Error(`スプレッドシート作成に失敗: ${createResponse.status} - ${errorData.error?.message || createResponse.statusText}`);
            }

            const createResult = await createResponse.json();
            spreadsheetId = createResult.spreadsheetId;
            
            // スプレッドシートIDを保存
            await fetch('/persona/api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'save_spreadsheet_id',
                    spreadsheet_id: spreadsheetId
                })
            });
            
            console.log('新しいスプレッドシートを作成しました:', spreadsheetId);
        }
        
        // 現在のデータ範囲を取得して最終行を特定
        const rangeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:F`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        let nextRow = 2; // ヘッダーの次の行から開始
        let existingData = [];
        let hasHeaders = false;
        
        if (rangeResponse.ok) {
            const rangeData = await rangeResponse.json();
            if (rangeData.values && rangeData.values.length > 0) {
                // 最初の行がヘッダーかどうかチェック
                const firstRow = rangeData.values[0];
                hasHeaders = firstRow.includes('タイムスタンプ') || firstRow.includes('Googleアカウント');
                
                if (hasHeaders) {
                    existingData = rangeData.values.slice(1); // ヘッダーを除く既存データ
                    nextRow = rangeData.values.length + 1; // 最終行の次の行
                } else {
                    existingData = rangeData.values; // 全てがデータ行
                    nextRow = rangeData.values.length + 2; // ヘッダー分も考慮
                }
            }
        }
        
        // ヘッダーが存在しない場合は追加
        if (!hasHeaders) {
            console.log('ヘッダーが存在しないため、追加します...');
            const headers = ['タイムスタンプ', 'Googleアカウント', 'LLM名', 'ペルソナ名', '質問', '回答'];
            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:F1?valueInputOption=RAW`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [headers]
                })
            });
            
            // 既存のデータがある場合は1行下にシフト
            if (existingData.length > 0) {
                await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:F${existingData.length + 1}?valueInputOption=RAW`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: existingData
                    })
                });
                nextRow = existingData.length + 2;
            } else {
                nextRow = 2;
            }
        }
        
        // 既存データと比較して新しい対話のみを特定
        const newRows = [];
        
        chatHistory.forEach(item => {
            const rowData = [
                new Date(item.timestamp).toLocaleString('ja-JP'),
                userInfo.email,
                llmProvider.toUpperCase(),
                item.personaName || currentPersona?.name || '',
                item.question || '',
                item.answer || ''
            ];
            
            // 既存データに同じタイムスタンプと質問の組み合わせがないかチェック
            const isDuplicate = existingData.some(existingRow => 
                existingRow[0] === rowData[0] && // タイムスタンプ
                existingRow[4] === rowData[4]    // 質問
            );
            
            if (!isDuplicate) {
                newRows.push(rowData);
            }
        });
        
        if (newRows.length === 0) {
            showSuccessMessage('新しいデータがないため、保存をスキップしました。');
            closeSheetsModal();
            return;
        }

        // 新しいデータを一括追加
        const appendResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A${nextRow}:F${nextRow + newRows.length - 1}?valueInputOption=RAW`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: newRows
            })
        });

        if (!appendResponse.ok) {
            const errorData = await appendResponse.json().catch(() => ({}));
            throw new Error(`データ追加に失敗: ${appendResponse.status} - ${errorData.error?.message || appendResponse.statusText}`);
        }

        showSuccessMessage(`${newRows.length}件の対話データをGoogle Sheetsに保存しました。`);
        closeSheetsModal();
        
        // スプレッドシートを開くオプション
        if (confirm('スプレッドシートを開いて確認しますか？')) {
            window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, '_blank');
        }

    } catch (error) {
        console.error('Sheets保存エラー:', error);
        
        // トークンエラーの場合は再認証を促す
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
            isAuthenticated = false;
            window.googleAccessToken = null;
            updateAuthStatus(false);
            showErrorMessage('認証が期限切れです。再度Google認証を行ってください。');
        } else {
            showErrorMessage('Google Sheetsへの保存に失敗しました: ' + error.message);
        }
    } finally {
        hideLoadingOverlay();
    }
}

// Googleユーザー情報を取得
async function fetchGoogleUserInfo(accessToken) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user info: ${response.status}`);
        }
        
        const userInfo = await response.json();
        console.log('Google user info retrieved:', userInfo);
        
        return {
            email: userInfo.email || '',
            name: userInfo.name || '',
            id: userInfo.id || ''
        };
    } catch (error) {
        console.warn('Failed to fetch Google user info:', error);
        return {
            email: 'Unknown',
            name: 'Unknown User',
            id: 'unknown'
        };
    }
}

function updateAuthStatus(authenticated) {
    const authStatus = document.getElementById('authStatus');
    if (authStatus) {
        if (authenticated) {
            const userEmail = window.googleUserInfo ? window.googleUserInfo.email : '';
            authStatus.textContent = userEmail ? `認証済み (${userEmail})` : '認証済み';
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

function showLoadingOverlay(message = 'AI が回答を生成中...') {
    const overlay = document.getElementById('loadingOverlay');
    const messageElement = document.getElementById('loadingMessage');
    if (overlay) {
        if (messageElement) {
            messageElement.textContent = message;
        }
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