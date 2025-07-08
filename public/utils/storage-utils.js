/**
 * ローカルストレージ共通ユーティリティ
 * localStorage, sessionStorage, APIキー管理などの共通機能
 */

/**
 * ローカルストレージにデータを保存
 * @param {string} key - キー
 * @param {any} value - 値（JSONシリアライズされる）
 * @returns {boolean} 成功可否
 */
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
        return false;
    }
}

/**
 * ローカルストレージからデータを読み込み
 * @param {string} key - キー
 * @param {any} defaultValue - デフォルト値
 * @returns {any} 読み込まれた値またはデフォルト値
 */
function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
        console.warn('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

/**
 * セッションストレージにデータを保存
 * @param {string} key - キー
 * @param {any} value - 値
 * @returns {boolean} 成功可否
 */
function saveToSessionStorage(key, value) {
    try {
        sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn('Failed to save to sessionStorage:', error);
        return false;
    }
}

/**
 * セッションストレージからデータを読み込み
 * @param {string} key - キー
 * @param {any} defaultValue - デフォルト値
 * @returns {any} 読み込まれた値またはデフォルト値
 */
function loadFromSessionStorage(key, defaultValue = null) {
    try {
        const saved = sessionStorage.getItem(key);
        if (!saved) return defaultValue;
        
        // JSON文字列かどうか判定
        if (saved.startsWith('{') || saved.startsWith('[')) {
            return JSON.parse(saved);
        }
        return saved;
    } catch (error) {
        console.warn('Failed to load from sessionStorage:', error);
        return defaultValue;
    }
}

/**
 * APIキーを保存
 * @param {string} provider - プロバイダー名 ('openai', 'claude', 'gemini')
 * @param {string} apiKey - APIキー
 * @returns {boolean} 成功可否
 */
function saveApiKey(provider, apiKey) {
    const key = `${provider}_api_key`;
    return saveToLocalStorage(key, apiKey);
}

/**
 * APIキーを読み込み
 * @param {string} provider - プロバイダー名
 * @returns {string|null} APIキーまたはnull
 */
function loadApiKey(provider) {
    const key = `${provider}_api_key`;
    return loadFromLocalStorage(key, null);
}

/**
 * 全てのAPIキーを読み込み
 * @returns {Object} プロバイダー別APIキー
 */
function loadAllApiKeys() {
    return {
        openai: loadApiKey('openai'),
        claude: loadApiKey('claude'),
        gemini: loadApiKey('gemini')
    };
}

/**
 * APIキーを削除
 * @param {string} provider - プロバイダー名
 * @returns {boolean} 成功可否
 */
function removeApiKey(provider) {
    try {
        const key = `${provider}_api_key`;
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn('Failed to remove API key:', error);
        return false;
    }
}

/**
 * 設定を保存
 * @param {Object} settings - 設定オブジェクト
 * @returns {boolean} 成功可否
 */
function saveSettings(settings) {
    return saveToLocalStorage('app_settings', settings);
}

/**
 * 設定を読み込み
 * @param {Object} defaultSettings - デフォルト設定
 * @returns {Object} 設定オブジェクト
 */
function loadSettings(defaultSettings = {}) {
    return loadFromLocalStorage('app_settings', defaultSettings);
}

/**
 * チャット履歴を保存
 * @param {Array} history - チャット履歴配列
 * @returns {boolean} 成功可否
 */
function saveChatHistory(history) {
    return saveToLocalStorage('chatHistory', history);
}

/**
 * チャット履歴を読み込み
 * @returns {Array} チャット履歴配列
 */
function loadChatHistory() {
    return loadFromLocalStorage('chatHistory', []);
}

/**
 * チャット履歴をクリア
 * @returns {boolean} 成功可否
 */
function clearChatHistory() {
    try {
        localStorage.removeItem('chatHistory');
        return true;
    } catch (error) {
        console.warn('Failed to clear chat history:', error);
        return false;
    }
}

/**
 * ストレージ使用量をチェック
 * @returns {Object} ストレージ使用量情報
 */
function getStorageUsage() {
    try {
        let totalSize = 0;
        let itemCount = 0;
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length;
                itemCount++;
            }
        }
        
        return {
            totalSize,
            itemCount,
            sizeInMB: (totalSize / 1024 / 1024).toFixed(2)
        };
    } catch (error) {
        console.warn('Failed to get storage usage:', error);
        return { totalSize: 0, itemCount: 0, sizeInMB: '0.00' };
    }
}

// グローバルに関数をエクスポート
window.StorageUtils = {
    saveToLocalStorage,
    loadFromLocalStorage,
    saveToSessionStorage,
    loadFromSessionStorage,
    saveApiKey,
    loadApiKey,
    loadAllApiKeys,
    removeApiKey,
    saveSettings,
    loadSettings,
    saveChatHistory,
    loadChatHistory,
    clearChatHistory,
    getStorageUsage
};

console.log('StorageUtils: Storage utilities loaded');