// チャット画面の状態管理
console.log('chat_new.js読み込み開始');
let currentPersona = null;
let currentPurpose = null;
let chatHistory = [];
let isInputConfirmed = false; // 入力確定状態を管理

// DOM読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded イベント発火');
    initializeChat();
    loadDataFromUrl();
    initializeEventListeners();
    loadChatHistory();
    checkApiKeysAndHideInputs();
});

// チャット初期化
function initializeChat() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// URLパラメータからペルソナと調査目的を読み込み
async function loadDataFromUrl() {
    try {
        // 共通ユーティリティを使用してデータを読み込み
        const { persona, purpose, params } = await PersonaUtils.loadPersonaAndPurposeFromUrl();
        
        currentPersona = persona;
        currentPurpose = purpose;
        
        console.log('読み込まれたペルソナ:', currentPersona);
        console.log('読み込まれた調査目的:', currentPurpose);
        console.log('URLパラメータ:', params);
        
        // 表示を更新
        PersonaUtils.updatePersonaDisplay(currentPersona, currentPurpose);
        
        // LLMプロバイダーをセッションに保存
        if (params.llmProvider) {
            StorageUtils.saveToSessionStorage('llmProvider', params.llmProvider);
        }

        // 初期メッセージを表示
        displayWelcomeMessage();

    } catch (error) {
        console.error('データの読み込みに失敗:', error);
        MessageUtils.showErrorMessage('データの読み込みに失敗しました。');
        setTimeout(() => window.location.href = '/', 2000);
    }
}

// 表示の更新（共通ユーティリティに移行済み - PersonaUtils.updatePersonaDisplay使用）
// この関数は後方互換性のため残しておく
function updateDisplay() {
    if (PersonaUtils) {
        PersonaUtils.updatePersonaDisplay(currentPersona, currentPurpose);
    }
}

// ウェルカムメッセージを表示
function displayWelcomeMessage() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages || !currentPurpose) return;

    const welcomeDiv = chatMessages.querySelector('.welcome-message');
    if (welcomeDiv) {
        const welcomeContent = welcomeDiv.querySelector('.welcome-content');
        if (welcomeContent) {
            welcomeContent.innerHTML = `
                <h3>${currentPurpose.name}へようこそ</h3>
                <p>${currentPurpose.specific_prompts?.introduction || currentPurpose.context}</p>
                <div style="margin-top: 1rem; text-align: left;">
                    <strong>重点項目:</strong>
                    <ul style="margin: 0.5rem 0;">
                        ${currentPurpose.key_aspects.slice(0, 4).map(aspect => `<li>${aspect}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    }
}

// ペルソナ名からイニシャルを取得（共通ユーティリティに移行済み）
function getPersonaInitials(name) {
    return PersonaUtils ? PersonaUtils.getPersonaInitials(name) : 'NA';
}

// イベントリスナーの初期化
function initializeEventListeners() {
    console.log('イベントリスナー初期化開始');
    
    // 送信ボタン
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        console.log('送信ボタン見つかりました');
        sendBtn.addEventListener('click', sendMessage);
    } else {
        console.error('送信ボタンが見つかりません');
    }

    // チャット入力フィールド
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        console.log('チャット入力フィールド見つかりました');
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEnterKey();
            }
        });

        chatInput.addEventListener('input', function() {
            updateCharCount();
            resetInputConfirmedState();
        });
    } else {
        console.error('チャット入力フィールドが見つかりません');
    }

    // 戻るボタン - 共通部品を使用
    if (window.NavigationUtils) {
        window.NavigationUtils.setupBackButton();
    } else {
        console.warn('NavigationUtils not available, using fallback');
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                const urlParams = new URLSearchParams(window.location.search);
                const categoryId = urlParams.get('categoryId');
                const purposeId = urlParams.get('purposeId');
                
                if (categoryId && purposeId) {
                    window.location.href = `/?purpose=${purposeId}&category=${categoryId}`;
                } else {
                    window.location.href = '/';
                }
            });
        }
    }

    // その他のイベントリスナー（省略形）
    setupSidebarListeners();
    setupExportListeners();
    setupHistoryListeners();
}

// 文字数カウント更新（共通ユーティリティに移行済み）
function updateCharCount() {
    if (FormUtils) {
        FormUtils.updateCharCount('#chatInput', '.char-count', 1000);
    }
}

// Enterキー処理（ダブルEnter方式）
function handleEnterKey() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    
    if (!isInputConfirmed) {
        // 1回目のEnter: 入力確定
        confirmInput();
    } else {
        // 2回目のEnter: メッセージ送信
        sendMessage();
    }
}

// 入力確定処理
function confirmInput() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput || !chatInput.value.trim()) return;
    
    isInputConfirmed = true;
    updateInputStatus();
    
    // カーソルを末尾に移動
    chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
}

// 入力確定状態をリセット
function resetInputConfirmedState() {
    if (isInputConfirmed) {
        isInputConfirmed = false;
        updateInputStatus();
    }
}

// 入力状態の視覚的フィードバック
function updateInputStatus() {
    const chatInput = document.getElementById('chatInput');
    const statusIndicator = document.getElementById('inputStatus');
    
    if (!chatInput) return;
    
    if (isInputConfirmed) {
        chatInput.style.borderColor = '#28a745';
        chatInput.style.borderWidth = '2px';
        if (statusIndicator) {
            statusIndicator.textContent = '✓ 確定済み - もう一度Enterで送信';
            statusIndicator.style.color = '#28a745';
            statusIndicator.style.display = 'block';
        }
    } else {
        chatInput.style.borderColor = '';
        chatInput.style.borderWidth = '';
        if (statusIndicator) {
            statusIndicator.style.display = 'none';
        }
    }
}

// AIレスポンス取得（共通ユーティリティを使用）
async function getAIResponse(userMessage) {
    const llmProvider = StorageUtils.loadFromSessionStorage('llmProvider', 'openai');
    const prompt = createEnhancedPersonaPrompt(userMessage);
    
    console.log('Sending request with provider:', llmProvider);
    console.log('Prompt length:', prompt.length);

    const requestData = {
        provider: llmProvider,
        prompt: prompt,
        personaId: String(currentPersona.id),
        purposeId: currentPurpose.id
    };
    
    console.log('Request data:', requestData);
    
    try {
        return await ApiUtils.callLLMApi(requestData);
    } catch (error) {
        console.error('API呼び出しエラー:', error);
        throw error;
    }
}

// 強化されたペルソナプロンプト作成
function createEnhancedPersonaPrompt(userMessage) {
    const demo = currentPersona.basic_demographics;
    const psych = currentPersona.psychological_traits;
    const lifestyle = currentPersona.lifestyle;
    const values = currentPersona.values_and_motivations;
    const culture = currentPersona.cultural_background;
    const comm = currentPersona.communication_style;

    return `${currentPurpose.context}

あなたは${currentPersona.name}という人物です。以下の特性を持ち、その人物になりきって回答してください：

【基本情報】
- 年齢: ${demo.age}歳
- 性別: ${demo.gender}
- 職業: ${demo.occupation}
- 学歴: ${demo.education}
- 居住地: ${demo.location}
- 世帯収入: ${demo.household_income}
- 家族構成: ${demo.family_status}

【心理的特性】
- 意思決定スタイル: ${psych.decision_making_style}
- リスク許容度: ${psych.risk_tolerance}
- 情報処理: ${psych.information_processing}
- 社会的影響: ${psych.social_influence}
- 変化への適応性: ${psych.change_adaptability}

【ライフスタイル】
- 日常: ${lifestyle.daily_routine}
- 趣味: ${lifestyle.hobbies}
- メディア消費: ${lifestyle.media_consumption}
- 買い物習慣: ${lifestyle.shopping_habits}

【価値観と動機】
- 核となる価値観: ${values.core_values.join(', ')}
- 人生の目標: ${values.life_goals.join(', ')}
- 悩み・課題: ${values.pain_points.join(', ')}
- 願望: ${values.aspirations.join(', ')}

【文化的背景】
- 民族性: ${culture.ethnicity}
- 文化的価値観: ${culture.cultural_values.join(', ')}
- 文化的影響: ${culture.cultural_influences}

【コミュニケーションスタイル】
- 話し方: ${comm.verbal_style}
- 詳細志向: ${comm.detail_preference}
- 感情表現: ${comm.emotional_expression}

【今回の調査について】
調査テーマ: ${currentPurpose.description}
重要な観点: ${currentPurpose.key_aspects.join(', ')}

上記の人物設定に基づいて、以下の質問に対して${currentPersona.name}として自然に回答してください。
${comm.verbal_style}な話し方で、${comm.emotional_expression}な感情表現を心がけてください。

【重要な指示】
このインタビューは日本語で実施されています。あなたの母語や出身国に関係なく、回答は必ず日本語で行ってください。
英語やその他の言語は一切使用せず、すべて日本語で自然に会話してください。

質問: ${userMessage}`;
}

// メッセージ送信
async function sendMessage() {
    console.log('sendMessage関数が呼び出されました');
    
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (!chatInput || !sendBtn) {
        console.error('必要な要素が見つかりません:', { chatInput, sendBtn });
        return;
    }

    const message = chatInput.value.trim();
    if (!message) {
        MessageUtils.showErrorMessage('メッセージを入力してください。');
        return;
    }

    if (!currentPersona || !currentPurpose) {
        MessageUtils.showErrorMessage('ペルソナまたは調査目的が設定されていません。');
        return;
    }

    console.log('メッセージ送信開始:', message);

    // UI更新
    sendBtn.disabled = true;
    chatInput.disabled = true;
    
    // ユーザーメッセージを表示
    addMessageToChat('user', message);
    chatInput.value = '';
    updateCharCount();

    // ローディング表示
    MessageUtils.showLoadingOverlay();

    try {
        // AIからの応答を取得
        const response = await getAIResponse(message);
        
        // AI応答を表示
        addMessageToChat('assistant', response);
        
        // 履歴に保存
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('categoryId');
        
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            personaId: currentPersona.id,
            personaName: currentPersona.name,
            purposeId: currentPurpose.id,
            purposeName: currentPurpose.name,
            categoryId: categoryId,
            question: message,
            answer: response
        };
        
        chatHistory.push(historyItem);
        saveChatHistory();
        updateHistoryDisplay();
        
        // 入力確定状態をリセット
        resetInputConfirmedState();

    } catch (error) {
        console.error('AI応答の取得に失敗:', error);
        MessageUtils.showErrorMessage('AI応答の取得に失敗しました。APIキーや設定を確認してください。');
        addMessageToChat('assistant', 'すみません、応答の生成に失敗しました。しばらく時間をおいてから再度お試しください。');
    } finally {
        // UI復旧
        sendBtn.disabled = false;
        chatInput.disabled = false;
        MessageUtils.hideLoadingOverlay();
        chatInput.focus();
    }
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

// サイドバー関連のイベントリスナー設定
function setupSidebarListeners() {
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
}

// エクスポート関連のイベントリスナー設定
function setupExportListeners() {
    const exportToExcelBtn = document.getElementById('exportToExcelBtn');
    if (exportToExcelBtn) {
        exportToExcelBtn.addEventListener('click', () => {
            const exportManager = new ExportManager();
            exportManager.exportToCSV();
        });
    }
}

// 履歴関連のイベントリスナー設定
function setupHistoryListeners() {
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearChatHistory);
    }
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

// 履歴関連（目的×ペルソナグループごとに管理）
function loadChatHistory() {
    if (StorageUtils && currentPurpose && currentPersona) {
        // URLパラメータからカテゴリIDを取得
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('categoryId');
        
        if (categoryId) {
            chatHistory = StorageUtils.loadChatHistory(currentPurpose.id, categoryId);
            updateHistoryDisplay();
        }
    }
}

function saveChatHistory() {
    if (StorageUtils && currentPurpose && currentPersona) {
        // URLパラメータからカテゴリIDを取得
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('categoryId');
        
        if (categoryId) {
            StorageUtils.saveChatHistory(chatHistory, currentPurpose.id, categoryId);
        }
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
            showHistoryDetail(item);
        });

        historyList.appendChild(historyItem);
    });
}

function clearChatHistory() {
    MessageUtils.showConfirmDialog(
        '本当に対話履歴をクリアしますか？この操作は取り消せません。',
        () => {
            chatHistory = [];
            saveChatHistory();
            updateHistoryDisplay();
            MessageUtils.showSuccessMessage('対話履歴をクリアしました。');
        }
    );
}

// ExportManagerクラス
class ExportManager {
    exportToCSV() {
        if (chatHistory.length === 0) {
            MessageUtils.showErrorMessage('エクスポートする履歴がありません。');
            return;
        }

        try {
            // CSVヘッダー
            const headers = [
                'タイムスタンプ',
                'ペルソナ名',
                'ペルソナID',
                '調査目的',
                'ペルソナグループ',
                '質問',
                '回答'
            ];

            // CSVデータ作成
            const csvData = [headers];
            
            // URLパラメータからカテゴリIDを取得
            const urlParams = new URLSearchParams(window.location.search);
            const categoryId = urlParams.get('categoryId');
            
            chatHistory.forEach(item => {
                const row = [
                    new Date(item.timestamp).toLocaleString('ja-JP'),
                    item.personaName || currentPersona?.name || '',
                    item.personaId || currentPersona?.id || '',
                    item.purposeName || currentPurpose?.name || '',
                    item.categoryId || categoryId || '',
                    this.escapeCsvValue(item.question || ''),
                    this.escapeCsvValue(item.answer || '')
                ];
                csvData.push(row);
            });

            // CSV文字列に変換
            const csvString = csvData.map(row => row.join(',')).join('\n');
            
            // BOMを追加してUTF-8エンコーディングを明示
            const bom = '\uFEFF';
            const blob = new Blob([bom + csvString], {
                type: 'text/csv;charset=utf-8'
            });

            // ダウンロード実行
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // ファイル名に目的とカテゴリを含める
            const purposeName = currentPurpose?.name || '未知の目的';
            const categoryName = categoryId || '未知のカテゴリ';
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `chat-history_${purposeName}_${categoryName}_${dateStr}.csv`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            MessageUtils.showSuccessMessage(`${chatHistory.length}件の履歴をCSV形式でエクスポートしました。`);

        } catch (error) {
            console.error('CSV エクスポート エラー:', error);
            MessageUtils.showErrorMessage('CSVエクスポートに失敗しました: ' + error.message);
        }
    }

    // CSV用の値をエスケープ
    escapeCsvValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        const stringValue = String(value);
        
        // ダブルクォート、カンマ、改行が含まれている場合はエスケープが必要
        if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
            // ダブルクォートを二重にしてエスケープし、全体をダブルクォートで囲む
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        
        return stringValue;
    }
}

// APIキーの状態をチェックして入力フィールドを非表示にする
async function checkApiKeysAndHideInputs() {
    try {
        const response = await fetch('/api?action=get_api_keys');
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
                    <a href="/" class="btn btn-secondary btn-sm">LLM設定変更</a>
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

// ユーティリティ関数（共通ユーティリティに移行済み）
function truncateText(text, maxLength) {
    return PersonaUtils ? PersonaUtils.truncateText(text, maxLength) : text;
}

function showHistoryDetail(item) {
    // 履歴詳細表示のモーダルを実装
    alert(`質問: ${item.question}\\n\\n回答: ${item.answer}`);
}

// ローディング関連（共通ユーティリティに移行済み）
function showLoadingOverlay(message = 'AI が回答を生成中...') {
    if (MessageUtils) {
        MessageUtils.showLoadingOverlay(message);
    }
}

function hideLoadingOverlay() {
    if (MessageUtils) {
        MessageUtils.hideLoadingOverlay();
    }
}

// メッセージ表示関連（共通ユーティリティに移行済み）
function showErrorMessage(message) {
    if (MessageUtils) {
        MessageUtils.showErrorMessage(message);
    }
}

function showSuccessMessage(message) {
    if (MessageUtils) {
        MessageUtils.showSuccessMessage(message);
    }
}

function showMessage(message, type) {
    if (MessageUtils) {
        MessageUtils.showMessage(message, type);
    }
}