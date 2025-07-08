/**
 * フォーム関連共通ユーティリティ
 * 入力検証、文字数カウント、フォームイベント処理などの共通機能
 */

/**
 * 文字数カウントを更新
 * @param {string|HTMLElement} inputSelector - 入力要素のセレクタまたは要素
 * @param {string|HTMLElement} counterSelector - カウンタ要素のセレクタまたは要素
 * @param {number} maxLength - 最大文字数（デフォルト: 1000）
 */
function updateCharCount(inputSelector, counterSelector, maxLength = 1000) {
    const inputElement = typeof inputSelector === 'string' ? 
        document.querySelector(inputSelector) : inputSelector;
    const counterElement = typeof counterSelector === 'string' ? 
        document.querySelector(counterSelector) : counterSelector;
    
    if (!inputElement || !counterElement) {
        console.warn('Input or counter element not found');
        return;
    }
    
    const count = inputElement.value.length;
    counterElement.textContent = `${count}/${maxLength}`;
    
    // 文字数に応じて色を変更
    if (count > maxLength * 0.9) {
        counterElement.style.color = '#dc3545'; // 赤
    } else if (count > maxLength * 0.8) {
        counterElement.style.color = '#ffc107'; // 黄
    } else {
        counterElement.style.color = '#666'; // グレー
    }
}

/**
 * 入力値の検証
 * @param {string} value - 検証する値
 * @param {Object} rules - 検証ルール
 * @returns {Object} {isValid: boolean, errors: string[]}
 */
function validateInput(value, rules = {}) {
    const errors = [];
    
    // 必須チェック
    if (rules.required && (!value || value.trim() === '')) {
        errors.push('この項目は必須です');
    }
    
    // 最小長チェック
    if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${rules.minLength}文字以上で入力してください`);
    }
    
    // 最大長チェック
    if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${rules.maxLength}文字以内で入力してください`);
    }
    
    // パターンチェック
    if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(rules.patternMessage || '入力形式が正しくありません');
    }
    
    // カスタム検証関数
    if (rules.validator && typeof rules.validator === 'function') {
        const customResult = rules.validator(value);
        if (customResult !== true) {
            errors.push(customResult || '入力値が無効です');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * フォーム要素にリアルタイム検証を設定
 * @param {string|HTMLElement} formSelector - フォーム要素のセレクタまたは要素
 * @param {Object} fieldRules - フィールド別検証ルール
 */
function setupFormValidation(formSelector, fieldRules = {}) {
    const form = typeof formSelector === 'string' ? 
        document.querySelector(formSelector) : formSelector;
    
    if (!form) {
        console.warn('Form element not found');
        return;
    }
    
    Object.keys(fieldRules).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!field) return;
        
        const rules = fieldRules[fieldName];
        
        // エラー表示用要素を作成
        let errorElement = form.querySelector(`.error-${fieldName}`);
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = `error-${fieldName} field-error`;
            errorElement.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin-top: 0.25rem; display: none;';
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
        
        // 検証関数
        const validate = () => {
            const result = validateInput(field.value, rules);
            
            if (result.isValid) {
                field.classList.remove('is-invalid');
                field.classList.add('is-valid');
                errorElement.style.display = 'none';
            } else {
                field.classList.remove('is-valid');
                field.classList.add('is-invalid');
                errorElement.textContent = result.errors[0];
                errorElement.style.display = 'block';
            }
            
            return result.isValid;
        };
        
        // イベントリスナー設定
        field.addEventListener('blur', validate);
        field.addEventListener('input', () => {
            // 入力中はエラーをクリア
            if (field.classList.contains('is-invalid')) {
                setTimeout(validate, 500); // 500ms後に再検証
            }
        });
    });
}

/**
 * APIキー入力フィールドの検証
 * @param {string} value - APIキー
 * @param {string} provider - プロバイダー ('openai', 'claude', 'gemini')
 * @returns {Object} 検証結果
 */
function validateApiKey(value, provider) {
    const rules = {
        required: true,
        minLength: 10
    };
    
    // プロバイダー別の詳細検証
    switch (provider) {
        case 'openai':
            rules.pattern = /^sk-[A-Za-z0-9]{20,}$/;
            rules.patternMessage = 'OpenAI APIキーは "sk-" で始まる必要があります';
            break;
        case 'claude':
            rules.pattern = /^sk-ant-[A-Za-z0-9_-]{10,}$/;
            rules.patternMessage = 'Claude APIキーは "sk-ant-" で始まる必要があります';
            break;
        case 'gemini':
            rules.pattern = /^[A-Za-z0-9_-]{30,}$/;
            rules.patternMessage = 'Gemini APIキーは30文字以上の英数字である必要があります';
            break;
    }
    
    return validateInput(value, rules);
}

/**
 * フォーム送信前の全体検証
 * @param {string|HTMLElement} formSelector - フォーム要素
 * @param {Object} fieldRules - フィールド別検証ルール
 * @returns {boolean} 検証結果
 */
function validateForm(formSelector, fieldRules = {}) {
    const form = typeof formSelector === 'string' ? 
        document.querySelector(formSelector) : formSelector;
    
    if (!form) {
        console.warn('Form element not found');
        return false;
    }
    
    let isValid = true;
    
    Object.keys(fieldRules).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!field) return;
        
        const result = validateInput(field.value, fieldRules[fieldName]);
        if (!result.isValid) {
            isValid = false;
            
            // エラー表示
            field.classList.add('is-invalid');
            const errorElement = form.querySelector(`.error-${fieldName}`);
            if (errorElement) {
                errorElement.textContent = result.errors[0];
                errorElement.style.display = 'block';
            }
        }
    });
    
    return isValid;
}

/**
 * 入力フィールドの自動リサイズ設定
 * @param {string|HTMLElement} textareaSelector - textarea要素
 * @param {number} minHeight - 最小高さ（px）
 * @param {number} maxHeight - 最大高さ（px）
 */
function setupAutoResize(textareaSelector, minHeight = 60, maxHeight = 300) {
    const textarea = typeof textareaSelector === 'string' ? 
        document.querySelector(textareaSelector) : textareaSelector;
    
    if (!textarea || textarea.tagName !== 'TEXTAREA') {
        console.warn('Textarea element not found');
        return;
    }
    
    textarea.style.minHeight = `${minHeight}px`;
    textarea.style.maxHeight = `${maxHeight}px`;
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';
    
    const adjustHeight = () => {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        
        if (scrollHeight > maxHeight) {
            textarea.style.height = `${maxHeight}px`;
            textarea.style.overflow = 'auto';
        } else {
            textarea.style.height = `${Math.max(scrollHeight, minHeight)}px`;
            textarea.style.overflow = 'hidden';
        }
    };
    
    textarea.addEventListener('input', adjustHeight);
    textarea.addEventListener('paste', () => setTimeout(adjustHeight, 0));
    
    // 初期調整
    adjustHeight();
}

// グローバルに関数をエクスポート
window.FormUtils = {
    updateCharCount,
    validateInput,
    setupFormValidation,
    validateApiKey,
    validateForm,
    setupAutoResize
};

console.log('FormUtils: Form utilities loaded');