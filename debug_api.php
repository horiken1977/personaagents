<?php
/**
 * API状態デバッグ用エンドポイント
 * APIキーの読み込み状況とプロバイダー名を確認
 */

require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

try {
    $provider = $_GET['provider'] ?? '';
    
    // デバッグ情報
    $debug = [
        'received_provider' => $provider,
        'provider_empty' => empty($provider),
        'get_params' => $_GET,
    ];
    
    if (!empty($provider)) {
        $apiKey = getApiKey($provider);
        $debug['api_key_found'] = !empty($apiKey);
        $debug['api_key_length'] = $apiKey ? strlen($apiKey) : 0;
        $debug['api_key_prefix'] = $apiKey ? substr($apiKey, 0, 10) . '...' : null;
        
        // 形式チェック詳細
        $patterns = [
            'openai_old' => '/^sk-[a-zA-Z0-9]{20,}/',
            'openai_new' => '/^sk-proj-[a-zA-Z0-9_-]{20,}/',
            'anthropic' => '/^sk-ant-[a-zA-Z0-9_-]{20,}/',
            'gemini' => '/^AIza[a-zA-Z0-9_-]{35}$/',
        ];
        
        $debug['pattern_matches'] = [];
        foreach ($patterns as $pattern_name => $pattern) {
            $debug['pattern_matches'][$pattern_name] = $apiKey ? preg_match($pattern, $apiKey) : false;
        }
    }
    
    echo json_encode([
        'status' => 'debug',
        'debug' => $debug
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'debug' => $debug ?? []
    ]);
}
?>