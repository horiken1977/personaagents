/**
 * メッセージ表示共通ユーティリティ
 * エラーメッセージ、成功メッセージ、ローディング表示などの共通機能
 */

/**
 * エラーメッセージを表示
 * @param {string} message - 表示するメッセージ
 */
function showErrorMessage(message) {
    showMessage(message, 'error');
}

/**
 * 成功メッセージを表示
 * @param {string} message - 表示するメッセージ
 */
function showSuccessMessage(message) {
    showMessage(message, 'success');
}

/**
 * メッセージを表示（共通処理）
 * @param {string} message - 表示するメッセージ
 * @param {string} type - メッセージタイプ ('error' | 'success' | 'info' | 'warning')
 * @param {number} duration - 表示時間（ミリ秒、デフォルト: 3000）
 */
function showMessage(message, type = 'info', duration = 3000) {
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.toast-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // メッセージ要素を作成
    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-message';
    
    // メッセージタイプに応じた背景色
    let backgroundColor;
    switch (type) {
        case 'error':
            backgroundColor = '#dc3545';
            break;
        case 'success':
            backgroundColor = '#28a745';
            break;
        case 'warning':
            backgroundColor = '#ffc107';
            break;
        case 'info':
        default:
            backgroundColor = '#17a2b8';
            break;
    }
    
    // スタイル設定
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
        background: ${backgroundColor};
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    messageDiv.textContent = message;

    // アニメーション用CSSが未定義の場合は定義
    if (!document.getElementById('message-animations')) {
        const style = document.createElement('style');
        style.id = 'message-animations';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // メッセージをDOMに追加
    document.body.appendChild(messageDiv);

    // 自動削除タイマー
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }
    }, duration);
}

/**
 * ローディングオーバーレイを表示
 * @param {string} message - 表示するメッセージ（デフォルト: 'AI が回答を生成中...'）
 */
function showLoadingOverlay(message = 'AI が回答を生成中...') {
    const overlay = document.getElementById('loadingOverlay');
    const messageElement = document.getElementById('loadingMessage');
    
    if (overlay) {
        if (messageElement) {
            messageElement.textContent = message;
        }
        overlay.style.display = 'flex';
    } else {
        console.warn('Loading overlay element not found');
    }
}

/**
 * ローディングオーバーレイを非表示
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    } else {
        console.warn('Loading overlay element not found');
    }
}

/**
 * 確認ダイアログを表示
 * @param {string} message - 確認メッセージ
 * @param {function} onConfirm - 確認時のコールバック
 * @param {function} onCancel - キャンセル時のコールバック（省略可能）
 */
function showConfirmDialog(message, onConfirm, onCancel = null) {
    if (confirm(message)) {
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    } else {
        if (typeof onCancel === 'function') {
            onCancel();
        }
    }
}

// グローバルに関数をエクスポート
window.MessageUtils = {
    showErrorMessage,
    showSuccessMessage,
    showMessage,
    showLoadingOverlay,
    hideLoadingOverlay,
    showConfirmDialog
};

console.log('MessageUtils: Message utilities loaded');