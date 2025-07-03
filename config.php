<?php
/**
 * アプリケーション設定ファイル
 * 環境変数と設定定数を管理
 */

// カスタムエラーハンドラーの読み込み
require_once __DIR__ . '/error_handler.php';

// .envファイルの読み込み（存在する場合）
if (file_exists(__DIR__ . '/.env')) {
    $envLines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($envLines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

// logsディレクトリの作成（存在しない場合）
$logsDir = __DIR__ . '/logs';
if (!is_dir($logsDir)) {
    @mkdir($logsDir, 0755, true);
}

// エラー報告設定（本番環境では無効にする）
error_reporting(E_ALL);
ini_set('display_errors', 0);

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');

// CORS設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// プリフライトリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// LLMプロバイダー設定
const LLM_PROVIDERS = [
    'openai' => [
        'name' => 'OpenAI GPT-4',
        'endpoint' => 'https://api.openai.com/v1/chat/completions',
        'model' => 'gpt-4',
        'max_tokens' => 1000,
        'temperature' => 0.7
    ],
    'claude' => [
        'name' => 'Anthropic Claude',
        'endpoint' => 'https://api.anthropic.com/v1/messages',
        'model' => 'claude-3-haiku-20240307',
        'max_tokens' => 1000,
        'temperature' => 0.7
    ],
    'gemini' => [
        'name' => 'Google Gemini',
        'endpoint' => 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        'model' => 'gemini-1.5-flash',
        'max_tokens' => 1000,
        'temperature' => 0.7
    ]
];

// Google API設定を動的に生成
// Google API関連設定は削除済み

// セキュリティ設定
const SECURITY_CONFIG = [
    'rate_limit' => [
        'requests_per_minute' => 60,
        'requests_per_hour' => 1000
    ],
    'allowed_origins' => [
        'http://localhost',
        'https://localhost',
        // 本番ドメインを追加
    ],
    'api_key_validation' => true,
    'csrf_protection' => true
];

// ログ設定
define('LOG_CONFIG', [
    'error_log' => __DIR__ . '/logs/error.log',
    'access_log' => __DIR__ . '/logs/access.log',
    'debug_mode' => getenv('DEBUG_MODE') === 'true'
]);

// データベース設定（将来の拡張用）
define('DB_CONFIG', [
    'host' => getenv('DB_HOST') ?: 'localhost',
    'name' => getenv('DB_NAME') ?: 'personaagent',
    'user' => getenv('DB_USER') ?: 'root',
    'pass' => getenv('DB_PASS') ?: '',
    'charset' => 'utf8mb4'
]);

/**
 * 設定値を取得する関数
 */
function getConfig($key, $default = null) {
    $configs = [
        'llm_providers' => LLM_PROVIDERS,
        'security' => SECURITY_CONFIG,
        'log' => LOG_CONFIG,
        'database' => DB_CONFIG
    ];
    
    return $configs[$key] ?? $default;
}

/**
 * Google SpreadsheetIDを取得
 */
// Google Spreadsheet関連機能は削除済み

/**
 * 環境変数または設定ファイルからAPIキーを取得
 */
function getApiKey($provider) {
    // まずJSONファイルから読み込みを試みる
    $apiKeysFile = __DIR__ . '/api_keys.json';
    if (file_exists($apiKeysFile)) {
        $content = file_get_contents($apiKeysFile);
        if ($content) {
            $keys = json_decode($content, true);
            if ($keys && is_array($keys)) {
                switch ($provider) {
                    case 'openai':
                        if (isset($keys['openai']) && !empty(trim($keys['openai']))) {
                            return trim($keys['openai']);
                        }
                        break;
                    case 'claude':
                    case 'anthropic':
                        if (isset($keys['anthropic']) && !empty(trim($keys['anthropic']))) {
                            return trim($keys['anthropic']);
                        }
                        break;
                    case 'gemini':
                        if (isset($keys['google']) && !empty(trim($keys['google']))) {
                            return trim($keys['google']);
                        }
                        break;
                }
            }
        }
    }
    
    // JSONファイルになければ環境変数から取得
    switch ($provider) {
        case 'openai':
            $key = getenv('OPENAI_API_KEY');
            return $key ? trim($key) : null;
        case 'claude':
        case 'anthropic':
            $key = getenv('ANTHROPIC_API_KEY');
            return $key ? trim($key) : null;
        case 'gemini':
            $key = getenv('GOOGLE_AI_API_KEY');
            return $key ? trim($key) : null;
        default:
            return null;
    }
}

/**
 * ログディレクトリの作成
 */
function ensureLogDirectory() {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
}

/**
 * ログ記録関数
 */
function writeLog($message, $level = 'INFO', $file = null) {
    ensureLogDirectory();
    $logFile = $file ?: LOG_CONFIG['error_log'];
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
}

/**
 * APIレスポンスを返す関数
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * エラーレスポンスを返す関数
 */
function sendErrorResponse($message, $statusCode = 400, $details = null) {
    $response = [
        'error' => $message,
        'status' => $statusCode,
        'timestamp' => date('c')
    ];
    
    if ($details && LOG_CONFIG['debug_mode']) {
        $response['details'] = $details;
    }
    
    writeLog("Error: {$message}", 'ERROR');
    sendJsonResponse($response, $statusCode);
}

/**
 * 入力値のバリデーション
 */
function validateInput($data, $rules) {
    $errors = [];
    
    foreach ($rules as $field => $rule) {
        $value = $data[$field] ?? null;
        
        if ($rule['required'] && empty($value)) {
            $errors[] = "{$field} is required";
            continue;
        }
        
        if (!empty($value)) {
            if (isset($rule['type']) && !validateType($value, $rule['type'])) {
                $errors[] = "{$field} must be of type {$rule['type']}";
            }
            
            if (isset($rule['max_length']) && strlen($value) > $rule['max_length']) {
                $errors[] = "{$field} must not exceed {$rule['max_length']} characters";
            }
            
            if (isset($rule['pattern']) && !preg_match($rule['pattern'], $value)) {
                $errors[] = "{$field} format is invalid";
            }
        }
    }
    
    return $errors;
}

/**
 * データ型の検証
 */
function validateType($value, $type) {
    switch ($type) {
        case 'string':
            return is_string($value);
        case 'integer':
            return is_int($value) || ctype_digit($value);
        case 'float':
            return is_float($value) || is_numeric($value);
        case 'boolean':
            return is_bool($value) || in_array($value, ['true', 'false', '1', '0']);
        case 'array':
            return is_array($value);
        case 'email':
            return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
        case 'url':
            return filter_var($value, FILTER_VALIDATE_URL) !== false;
        default:
            return true;
    }
}

/**
 * レート制限チェック
 */
function checkRateLimit($identifier) {
    $limits = SECURITY_CONFIG['rate_limit'];
    $now = time();
    
    // セッションベースの簡易レート制限
    if (!isset($_SESSION['rate_limit'])) {
        $_SESSION['rate_limit'] = [];
    }
    
    $userLimits = $_SESSION['rate_limit'][$identifier] ?? [];
    
    // 1分間のリクエスト数をチェック
    $minuteRequests = array_filter($userLimits, function($timestamp) use ($now) {
        return $now - $timestamp < 60;
    });
    
    if (count($minuteRequests) >= $limits['requests_per_minute']) {
        return false;
    }
    
    // 現在のリクエストを記録
    $_SESSION['rate_limit'][$identifier][] = $now;
    
    // 古いレコードをクリーンアップ
    $_SESSION['rate_limit'][$identifier] = array_filter(
        $_SESSION['rate_limit'][$identifier],
        function($timestamp) use ($now) {
            return $now - $timestamp < 3600; // 1時間以内のみ保持
        }
    );
    
    return true;
}

/**
 * CSRF トークンの生成
 */
function generateCSRFToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    
    return $_SESSION['csrf_token'];
}

/**
 * CSRF トークンの検証
 */
function validateCSRFToken($token) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// セッション開始
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ログディレクトリの確保
ensureLogDirectory();

// アクセスログ記録
$clientIP = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$requestUri = $_SERVER['REQUEST_URI'] ?? 'unknown';
writeLog("Access: {$clientIP} - {$_SERVER['REQUEST_METHOD']} {$requestUri} - {$userAgent}", 'ACCESS', LOG_CONFIG['access_log']);
?>