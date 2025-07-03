<?php
/**
 * チャット機能デバッグ用エンドポイント
 * リクエスト内容の詳細確認
 */

require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $debug = [
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
        'headers' => [],
        'get_params' => $_GET,
        'post_params' => $_POST,
        'raw_input' => file_get_contents('php://input'),
        'parsed_json' => null,
        'json_error' => null,
        'config_check' => [],
        'api_keys_check' => []
    ];
    
    // ヘッダー情報を取得
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $debug['headers'][str_replace('HTTP_', '', $key)] = $value;
        }
    }
    
    // JSON解析
    if (!empty($debug['raw_input'])) {
        $parsed = json_decode($debug['raw_input'], true);
        $debug['parsed_json'] = $parsed;
        $debug['json_error'] = json_last_error_msg();
    }
    
    // 設定確認
    $debug['config_check'] = [
        'LLM_PROVIDERS_defined' => defined('LLM_PROVIDERS'),
        'getConfig_available' => function_exists('getConfig'),
        'getApiKey_available' => function_exists('getApiKey'),
        'llm_providers_config' => getConfig('llm_providers', 'not found')
    ];
    
    // APIキーの存在確認
    $providers = ['openai', 'claude', 'gemini'];
    foreach ($providers as $provider) {
        $debug['api_keys_check'][$provider] = [
            'exists' => !empty(getApiKey($provider)),
            'prefix' => getApiKey($provider) ? substr(getApiKey($provider), 0, 10) . '...' : 'none'
        ];
    }
    
    echo json_encode([
        'status' => 'debug',
        'debug' => $debug
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
?>