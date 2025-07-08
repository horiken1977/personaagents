<?php
// 最小限のAPIエンドポイント（デプロイテスト用）
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONSリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // 基本的なパス確認
    $configPath = __DIR__ . '/../config.php';
    $personasPath = __DIR__ . '/../personas.json';
    
    $response = [
        'status' => 'success',
        'message' => 'API is working',
        'timestamp' => date('c'),
        'php_version' => PHP_VERSION,
        'method' => $_SERVER['REQUEST_METHOD'],
        'files_exist' => [
            'config.php' => file_exists($configPath),
            'personas.json' => file_exists($personasPath)
        ]
    ];
    
    // GETリクエストの処理
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        if ($action === 'get_api_keys') {
            $response['api_keys_check'] = [
                'openai' => !empty($_ENV['OPENAI_API_KEY']),
                'claude' => !empty($_ENV['ANTHROPIC_API_KEY']),
                'gemini' => !empty($_ENV['GOOGLE_AI_API_KEY'])
            ];
        } elseif ($action === 'get_categories') {
            if (file_exists($personasPath)) {
                $personasData = json_decode(file_get_contents($personasPath), true);
                if ($personasData && isset($personasData['categories'])) {
                    $response['categories'] = $personasData['categories'];
                } else {
                    throw new Exception('Invalid personas data structure', 500);
                }
            } else {
                throw new Exception('Personas data file not found', 404);
            }
        }
    }
    
    // POSTリクエストの処理
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON in request body', 400);
        }
        
        $response['input_received'] = true;
        $response['input_keys'] = array_keys($input);
        
        // テストモード
        if (isset($input['test']) && $input['test'] === true) {
            $response['test_response'] = 'Test successful';
        }
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'code' => $e->getCode(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
?>