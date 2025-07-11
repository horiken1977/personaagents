<?php
/**
 * API状態確認エンドポイント
 * サーバーサイドでAPIキーの利用可能性を確認する
 */

require_once 'config.php';
require_once 'security_headers.php';

// セキュリティヘッダーの設定
initializeSecurity();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $provider = $_GET['provider'] ?? '';
    
    // デバッグログ
    error_log("API Check: Provider = '$provider'");
    
    if (empty($provider)) {
        throw new Exception('プロバイダーが指定されていません');
    }
    
    // APIキーの存在確認
    $apiKey = getApiKey($provider);
    
    // デバッグログ
    error_log("API Check: APIKey found = " . (!empty($apiKey) ? 'YES' : 'NO'));
    if ($apiKey) {
        error_log("API Check: APIKey prefix = " . substr($apiKey, 0, 10));
        error_log("API Check: APIKey length = " . strlen($apiKey));
    }
    
    if (empty($apiKey)) {
        echo json_encode([
            'status' => 'unavailable',
            'message' => sprintf('%s のAPIキーが設定されていません', $provider),
            'provider' => $provider
        ]);
        exit;
    }
    
    // APIキーの形式チェック
    $isValidFormat = false;
    switch ($provider) {
        case 'openai':
            // OpenAIの新旧両方の形式をサポート（debug_api.phpと同じパターン）
            $isValidFormat = preg_match('/^sk-proj-[a-zA-Z0-9_-]{20,}/', $apiKey) || 
                           preg_match('/^sk-[a-zA-Z0-9]{20,}/', $apiKey);
            break;
        case 'anthropic':
        case 'claude':
            $isValidFormat = preg_match('/^sk-ant-[a-zA-Z0-9_-]{20,}/', $apiKey);
            break;
        case 'gemini':
            $isValidFormat = preg_match('/^AIza[a-zA-Z0-9_-]{20,}/', $apiKey);
            break;
        default:
            throw new Exception('サポートされていないプロバイダーです');
    }
    
    // デバッグログ
    error_log("API Check: Format validation result = " . ($isValidFormat ? 'PASS' : 'FAIL'));
    
    if (!$isValidFormat) {
        echo json_encode([
            'status' => 'error',
            'message' => sprintf('%s のAPIキー形式が正しくありません', $provider),
            'provider' => $provider
        ]);
        exit;
    }
    
    // APIキーが存在し、形式が正しい場合
    echo json_encode([
        'status' => 'available',
        'message' => sprintf('%s のAPIキーが利用可能です', $provider),
        'provider' => $provider
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'provider' => $provider ?? 'unknown'
    ]);
}
?>