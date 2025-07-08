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
    const urlParams = new URLSearchParams(window.location.search);
    const personaId = urlParams.get('personaId');
    const purposeId = urlParams.get('purposeId');
    const categoryId = urlParams.get('categoryId');
    const llmProvider = urlParams.get('llmProvider');

    if (!personaId || !purposeId) {
        showErrorMessage('ペルソナまたは調査目的が選択されていません。');
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }

    try {
        // ペルソナと調査目的を並行して読み込み
        const [personasRes, purposesRes] = await Promise.all([
            fetch('personas/persona/north_america_consumers.json'),
            fetch('personas/setting/interview_purposes.json')
        ]);
        
        const personasData = await personasRes.json();
        const purposesData = await purposesRes.json();
        
        // ペルソナを探す
        let allPersonas = [];
        if (personasData.categories) {
            personasData.categories.forEach(category => {
                if (category.personas) {
                    allPersonas = allPersonas.concat(category.personas);
                }
            });
        }
        
        currentPersona = allPersonas.find(p => p.id == personaId);
        
        // 調査目的を探す
        currentPurpose = purposesData.purposes.find(p => p.id === purposeId);

        if (!currentPersona || !currentPurpose) {
            throw new Error('ペルソナまたは調査目的が見つかりません。');
        }

        updateDisplay();
        
        // LLMプロバイダーをセッションに保存
        if (llmProvider) {
            sessionStorage.setItem('llmProvider', llmProvider);
        }

        // 初期メッセージを表示
        displayWelcomeMessage();

    } catch (error) {
        console.error('データの読み込みに失敗:', error);
        showErrorMessage('データの読み込みに失敗しました。');
        setTimeout(() => window.location.href = '/', 2000);
    }
}

// 表示の更新
function updateDisplay() {
    if (!currentPersona || !currentPurpose) return;

    const personaAvatar = document.getElementById('personaAvatar');
    const personaName = document.getElementById('personaName');
    const personaDescription = document.getElementById('personaDescription');

    if (personaAvatar) {
        personaAvatar.textContent = getPersonaInitials(currentPersona.name);
    }

    if (personaName) {
        personaName.textContent = `${currentPersona.name} - ${currentPurpose.name}`;
    }

    if (personaDescription) {
        const demographics = currentPersona.basic_demographics;
        personaDescription.textContent = `${demographics.age}歳 | ${demographics.occupation} | ${demographics.location}`;
    }

    // ページタイトルも更新
    document.title = `${currentPersona.name} - ${currentPurpose.name} | インタビューAI`;
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

// ペルソナ名からイニシャルを取得
function getPersonaInitials(name) {
    return name.split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .substring(0, 2);
}

// イベントリスナーの初期化（既存のコードをそのまま使用）
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
                handleEnterKey();
            }
        });

        chatInput.addEventListener('input', function() {
            updateCharCount();
            resetInputConfirmedState();
        });
    }

    // 戻るボタン
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

    // その他の既存イベントリスナーは省略（既存のchat.jsから流用）
}

// AIレスポンス取得（新しいプロンプト生成ロジック）
async function getAIResponse(userMessage) {
    const llmProvider = sessionStorage.getItem('llmProvider') || 'openai';
    const prompt = createEnhancedPersonaPrompt(userMessage);
    
    console.log('Sending request with provider:', llmProvider);
    console.log('Prompt length:', prompt.length);

    try {
        const requestData = {
            provider: llmProvider,
            prompt: prompt,
            personaId: String(currentPersona.id),
            purposeId: currentPurpose.id
        };
        
        console.log('Request data:', requestData);
        
        const response = await fetch('/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
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
- 言語: ${culture.language}
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

質問: ${userMessage}`;
}

// メッセージ送信（既存のコードをそのまま使用）
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (!chatInput || !sendBtn) return;

    const message = chatInput.value.trim();
    if (!message) {
        showErrorMessage('メッセージを入力してください。');
        return;
    }

    if (!currentPersona || !currentPurpose) {
        showErrorMessage('ペルソナまたは調査目的が設定されていません。');
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
            purposeId: currentPurpose.id,
            purposeName: currentPurpose.name,
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

// 以下、既存のchat.jsから必要な関数をコピー（省略）
// updateCharCount, handleEnterKey, confirmInput, resetInputConfirmedState, 
// updateInputStatus, addMessageToChat, showLoadingOverlay, hideLoadingOverlay,
// showErrorMessage, showSuccessMessage, etc...