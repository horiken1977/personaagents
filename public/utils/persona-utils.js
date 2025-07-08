/**
 * ペルソナ関連共通ユーティリティ
 * ペルソナデータの処理、表示、初期化などの共通機能
 */

/**
 * ペルソナ名からイニシャルを取得
 * @param {string} name - ペルソナ名
 * @returns {string} 2文字のイニシャル
 */
function getPersonaInitials(name) {
    if (!name || typeof name !== 'string') {
        return 'NA';
    }
    
    return name.split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .substring(0, 2);
}

/**
 * JSONファイルからペルソナデータを読み込み
 * @param {string} jsonPath - JSONファイルのパス
 * @returns {Promise<Object>} ペルソナデータ
 */
async function loadPersonasFromJson(jsonPath = 'personas/persona/north_america_consumers.json') {
    try {
        const response = await fetch(jsonPath);
        if (!response.ok) {
            throw new Error(`Failed to load personas: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading personas:', error);
        throw error;
    }
}

/**
 * JSONファイルから調査目的データを読み込み
 * @param {string} jsonPath - JSONファイルのパス
 * @returns {Promise<Object>} 調査目的データ
 */
async function loadPurposesFromJson(jsonPath = 'personas/setting/interview_purposes.json') {
    try {
        const response = await fetch(jsonPath);
        if (!response.ok) {
            throw new Error(`Failed to load purposes: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading purposes:', error);
        throw error;
    }
}

/**
 * カテゴリIDから全ペルソナを取得
 * @param {Object} personasData - ペルソナデータ
 * @param {string} categoryId - カテゴリID（省略時は全ペルソナ）
 * @returns {Array} ペルソナ配列
 */
function getAllPersonas(personasData, categoryId = null) {
    if (!personasData || !personasData.categories) {
        return [];
    }
    
    let allPersonas = [];
    
    personasData.categories.forEach(category => {
        if (!categoryId || category.id === categoryId) {
            if (category.personas) {
                allPersonas = allPersonas.concat(category.personas);
            }
        }
    });
    
    return allPersonas;
}

/**
 * ペルソナIDでペルソナを検索
 * @param {Object} personasData - ペルソナデータ
 * @param {string|number} personaId - ペルソナID
 * @returns {Object|null} ペルソナオブジェクトまたはnull
 */
function findPersonaById(personasData, personaId) {
    const allPersonas = getAllPersonas(personasData);
    return allPersonas.find(p => p.id == personaId) || null;
}

/**
 * 目的IDで調査目的を検索
 * @param {Object} purposesData - 調査目的データ
 * @param {string} purposeId - 目的ID
 * @returns {Object|null} 調査目的オブジェクトまたはnull
 */
function findPurposeById(purposesData, purposeId) {
    if (!purposesData || !purposesData.purposes) {
        return null;
    }
    return purposesData.purposes.find(p => p.id === purposeId) || null;
}

/**
 * ペルソナ表示要素を更新
 * @param {Object} persona - ペルソナオブジェクト
 * @param {Object} purpose - 調査目的オブジェクト（省略可能）
 */
function updatePersonaDisplay(persona, purpose = null) {
    if (!persona) {
        console.warn('Persona data is required for display update');
        return;
    }
    
    // アバター更新
    const personaAvatar = document.getElementById('personaAvatar');
    if (personaAvatar) {
        personaAvatar.textContent = getPersonaInitials(persona.name);
    }
    
    // 名前更新
    const personaName = document.getElementById('personaName');
    if (personaName) {
        if (purpose) {
            personaName.textContent = `${persona.name} - ${purpose.name}`;
        } else {
            personaName.textContent = persona.name;
        }
    }
    
    // 説明更新
    const personaDescription = document.getElementById('personaDescription');
    if (personaDescription && persona.basic_demographics) {
        const demo = persona.basic_demographics;
        personaDescription.textContent = `${demo.age}歳 | ${demo.occupation} | ${demo.location}`;
    }
    
    // ページタイトル更新
    if (purpose) {
        document.title = `${persona.name} - ${purpose.name} | インタビューAI`;
    } else {
        document.title = `${persona.name} | インタビューAI`;
    }
}

/**
 * ペルソナとPurpose情報をURL Parametersから読み込んで取得
 * @returns {Promise<Object>} {persona, purpose, params}
 */
async function loadPersonaAndPurposeFromUrl() {
    try {
        // NavigationUtilsが利用可能な場合は使用
        const params = window.NavigationUtils ? 
            window.NavigationUtils.getNavigationParams() : 
            (() => {
                const urlParams = new URLSearchParams(window.location.search);
                return {
                    personaId: urlParams.get('personaId'),
                    purposeId: urlParams.get('purposeId'),
                    categoryId: urlParams.get('categoryId'),
                    llmProvider: urlParams.get('llmProvider')
                };
            })();
        
        if (!params.personaId || !params.purposeId) {
            throw new Error('ペルソナまたは調査目的が選択されていません。');
        }
        
        // データを並行して読み込み
        const [personasData, purposesData] = await Promise.all([
            loadPersonasFromJson(),
            loadPurposesFromJson()
        ]);
        
        const persona = findPersonaById(personasData, params.personaId);
        const purpose = findPurposeById(purposesData, params.purposeId);
        
        if (!persona || !purpose) {
            throw new Error('ペルソナまたは調査目的が見つかりません。');
        }
        
        return { persona, purpose, params };
        
    } catch (error) {
        console.error('Failed to load persona and purpose from URL:', error);
        throw error;
    }
}

/**
 * テキストを指定長で切り詰め
 * @param {string} text - 対象テキスト
 * @param {number} maxLength - 最大長
 * @param {string} suffix - 切り詰め時の接尾語（デフォルト: '...'）
 * @returns {string} 切り詰められたテキスト
 */
function truncateText(text, maxLength, suffix = '...') {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength) + suffix;
}

// グローバルに関数をエクスポート
window.PersonaUtils = {
    getPersonaInitials,
    loadPersonasFromJson,
    loadPurposesFromJson,
    getAllPersonas,
    findPersonaById,
    findPurposeById,
    updatePersonaDisplay,
    loadPersonaAndPurposeFromUrl,
    truncateText
};

console.log('PersonaUtils: Persona utilities loaded');