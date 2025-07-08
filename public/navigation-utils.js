/**
 * ナビゲーション共通ユーティリティ
 * 戻るボタンなどの共通機能を提供
 */

/**
 * URLパラメータを解析してナビゲーション情報を取得
 * @returns {Object} ナビゲーション情報
 */
function getNavigationParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        personaId: urlParams.get('personaId'),
        purposeId: urlParams.get('purposeId'),
        categoryId: urlParams.get('categoryId'),
        llmProvider: urlParams.get('llmProvider')
    };
}

/**
 * 戻るボタンの動作を共通化
 * チャット画面からペルソナ選択画面または目的選択画面に戻る
 */
function handleBackNavigation() {
    const params = getNavigationParams();
    
    console.log('Navigation: 戻るボタンクリック', params);
    console.log('Navigation: 現在のURL:', window.location.href);
    
    if (params.categoryId && params.purposeId) {
        // ペルソナ選択画面に戻る
        const targetUrl = `/?purpose=${params.purposeId}&category=${params.categoryId}`;
        console.log('Navigation: ペルソナ選択画面にリダイレクト:', targetUrl);
        window.location.href = targetUrl;
    } else {
        // 目的選択画面に戻る
        console.log('Navigation: 目的選択画面に戻る');
        window.location.href = '/';
    }
}

/**
 * 戻るボタンのイベントリスナーを設定
 * 既存のイベントリスナーを削除してから新しいリスナーを追加
 * @param {string} buttonId - 戻るボタンのID（デフォルト: 'backBtn'）
 */
function setupBackButton(buttonId = 'backBtn') {
    const backBtn = document.getElementById(buttonId);
    
    if (!backBtn) {
        console.warn('Navigation: 戻るボタンが見つかりません:', buttonId);
        return;
    }
    
    console.log('Navigation: 戻るボタンを設定中:', buttonId);
    
    // 既存のイベントリスナーを削除するためにボタンを複製
    const newBackBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);
    
    // 新しいイベントリスナーを追加
    newBackBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleBackNavigation();
    });
    
    console.log('Navigation: 戻るボタンの設定完了:', buttonId);
}

/**
 * DOMContentLoaded後に戻るボタンを自動設定
 */
function initializeBackButton() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setupBackButton());
    } else {
        setupBackButton();
    }
}

// グローバルに関数をエクスポート
window.NavigationUtils = {
    getNavigationParams,
    handleBackNavigation,
    setupBackButton,
    initializeBackButton
};

console.log('Navigation: NavigationUtils loaded');