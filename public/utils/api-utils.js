/**
 * API関連共通ユーティリティ
 * API呼び出し、接続テスト、エラーハンドリングなどの共通機能
 */

/**
 * API接続をテスト
 * @param {string} provider - プロバイダー名 ('openai', 'claude', 'gemini')
 * @param {string} apiKey - APIキー
 * @returns {Promise<Object>} テスト結果 {success: boolean, message: string}
 */
async function testApiConnection(provider, apiKey) {
    if (!provider || !apiKey) {
        return {
            success: false,
            message: 'プロバイダーとAPIキーが必要です'
        };
    }
    
    try {
        const response = await fetch('/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider: provider,
                prompt: 'テスト用の短いメッセージです。「OK」と返答してください。',
                test: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                message: errorData.error || `HTTP ${response.status}: ${response.statusText}`
            };
        }

        const data = await response.json();
        
        if (data.success) {
            return {
                success: true,
                message: `${provider} API接続成功`
            };
        } else {
            return {
                success: false,
                message: data.error || 'API接続に失敗しました'
            };
        }
        
    } catch (error) {
        console.error('API connection test failed:', error);
        return {
            success: false,
            message: `ネットワークエラー: ${error.message}`
        };
    }
}

/**
 * APIキーの存在を確認
 * @returns {Promise<Object>} APIキーの存在状況
 */
async function checkApiKeys() {
    try {
        const response = await fetch('/api?action=get_api_keys');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Failed to check API keys:', error);
        return {
            openai: false,
            claude: false,
            gemini: false
        };
    }
}

/**
 * LLM APIにリクエストを送信
 * @param {Object} requestData - リクエストデータ
 * @returns {Promise<string>} AI応答
 */
async function callLLMApi(requestData) {
    const { provider, prompt, personaId, purposeId } = requestData;
    
    if (!provider || !prompt) {
        throw new Error('プロバイダーとプロンプトが必要です');
    }
    
    try {
        const response = await fetch('/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider,
                prompt,
                personaId: personaId ? String(personaId) : undefined,
                purposeId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}: ${errorText}`;
            
            // JSON形式のエラーレスポンスを解析
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // JSONでない場合はそのまま使用
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        return data.response || '応答の生成に失敗しました。';

    } catch (error) {
        console.error('LLM API call failed:', error);
        throw error;
    }
}

/**
 * APIリクエストのレート制限チェック
 * @param {string} endpoint - エンドポイント
 * @param {number} maxRequests - 最大リクエスト数
 * @param {number} windowMs - 時間窓（ミリ秒）
 * @returns {boolean} リクエスト可能かどうか
 */
function checkRateLimit(endpoint, maxRequests = 60, windowMs = 60000) {
    const now = Date.now();
    const key = `rateLimit_${endpoint}`;
    
    // ローカルストレージから履歴を取得
    let requests = [];
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            requests = JSON.parse(saved);
        }
    } catch (error) {
        console.warn('Failed to load rate limit data:', error);
    }
    
    // 時間窓外のリクエストを除外
    requests = requests.filter(time => now - time < windowMs);
    
    // 制限チェック
    if (requests.length >= maxRequests) {
        return false;
    }
    
    // 新しいリクエストを記録
    requests.push(now);
    
    try {
        localStorage.setItem(key, JSON.stringify(requests));
    } catch (error) {
        console.warn('Failed to save rate limit data:', error);
    }
    
    return true;
}

/**
 * APIエラーメッセージを整形
 * @param {Error} error - エラーオブジェクト
 * @param {string} provider - プロバイダー名
 * @returns {string} 整形されたエラーメッセージ
 */
function formatApiError(error, provider) {
    const message = error.message || 'Unknown error';
    
    // 一般的なエラーパターンに応じて分かりやすいメッセージに変換
    if (message.includes('401') || message.includes('Unauthorized')) {
        return `${provider} APIキーが無効です。正しいAPIキーを設定してください。`;
    } else if (message.includes('403') || message.includes('Forbidden')) {
        return `${provider} APIへのアクセスが拒否されました。APIキーの権限を確認してください。`;
    } else if (message.includes('429') || message.includes('Rate limit')) {
        return `${provider} APIのレート制限に達しました。しばらく時間をおいてから再試行してください。`;
    } else if (message.includes('404')) {
        return `${provider} APIのエンドポイントまたはモデルが見つかりません。`;
    } else if (message.includes('timeout') || message.includes('TIMEOUT')) {
        return `${provider} APIのリクエストがタイムアウトしました。再試行してください。`;
    } else if (message.includes('network') || message.includes('NetworkError')) {
        return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
    } else {
        return `${provider} API エラー: ${message}`;
    }
}

/**
 * APIレスポンスのキャッシュ管理
 */
class ApiCache {
    constructor(maxSize = 100, maxAge = 300000) { // 5分間
        this.cache = new Map();
        this.maxSize = maxSize;
        this.maxAge = maxAge;
    }
    
    _generateKey(requestData) {
        return JSON.stringify({
            provider: requestData.provider,
            prompt: requestData.prompt,
            personaId: requestData.personaId,
            purposeId: requestData.purposeId
        });
    }
    
    get(requestData) {
        const key = this._generateKey(requestData);
        const cached = this.cache.get(key);
        
        if (!cached) return null;
        
        // 期限切れチェック
        if (Date.now() - cached.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.response;
    }
    
    set(requestData, response) {
        const key = this._generateKey(requestData);
        
        // キャッシュサイズ制限
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            response,
            timestamp: Date.now()
        });
    }
    
    clear() {
        this.cache.clear();
    }
}

// グローバルキャッシュインスタンス
const globalApiCache = new ApiCache();

// グローバルに関数をエクスポート
window.ApiUtils = {
    testApiConnection,
    checkApiKeys,
    callLLMApi,
    checkRateLimit,
    formatApiError,
    ApiCache,
    cache: globalApiCache
};

console.log('ApiUtils: API utilities loaded');