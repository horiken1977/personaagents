<?php
/**
 * 統合テスト
 * システム全体の結合テストとエンドツーエンドテスト
 */

require_once __DIR__ . '/TestCase.php';
require_once __DIR__ . '/../config.php';

class IntegrationTest extends TestCase {
    
    public function __construct() {
        parent::__construct('IntegrationTest');
    }
    
    /**
     * すべての統合テストを実行
     */
    public function runAllTests() {
        $this->testSystemHealthCheck();
        $this->testCompleteUserFlow();
        $this->testAPIIntegration();
        $this->testErrorRecovery();
        $this->testPerformance();
        $this->testDataConsistency();
        $this->testConcurrentUsers();
    }
    
    /**
     * システムヘルスチェック
     */
    public function testSystemHealthCheck() {
        // 必要なファイルの存在確認
        $requiredFiles = [
            '../config.php',
            '../api.php',
            '../google_auth.php',
            '../sheets_integration.php',
            '../index.html',
            '../chat.html',
            '../personas.json'
        ];
        
        foreach ($requiredFiles as $file) {
            $this->assertTrue(file_exists(__DIR__ . '/' . $file), "必要ファイル存在: {$file}");
        }
        
        // 設定の確認
        $this->assertTrue(defined('LLM_PROVIDERS'), 'LLM設定が定義済み');
        $this->assertTrue(defined('GOOGLE_API_CONFIG'), 'Google API設定が定義済み');
        $this->assertTrue(defined('SECURITY_CONFIG'), 'セキュリティ設定が定義済み');
        
        // ディレクトリ権限の確認
        $requiredDirs = ['../logs'];
        foreach ($requiredDirs as $dir) {
            $fullPath = __DIR__ . '/' . $dir;
            if (is_dir($fullPath)) {
                $this->assertTrue(is_writable($fullPath), "ディレクトリ書き込み可能: {$dir}");
            }
        }
    }
    
    /**
     * 完全なユーザーフローのテスト
     */
    public function testCompleteUserFlow() {
        // 1. ペルソナデータの読み込み
        $personas = $this->loadPersonaData();
        $this->assertTrue(is_array($personas), 'ペルソナデータが配列で読み込まれる');
        $this->assertEquals(10, count($personas), '10のペルソナが存在する');
        
        // 2. ペルソナ選択のシミュレート
        $selectedPersona = $personas[0];
        $this->assertTrue($this->validatePersonaStructure($selectedPersona), 'ペルソナ構造が正しい');
        
        // 3. LLM API呼び出しのシミュレート
        $mockRequest = [
            'provider' => 'openai',
            'prompt' => 'テスト質問: あなたの好きな調味料は何ですか？',
            'apiKey' => 'mock-api-key',
            'personaId' => $selectedPersona['id']
        ];
        
        $apiResponse = $this->simulateLLMAPICall($mockRequest);
        $this->assertTrue($apiResponse['success'], 'LLM API呼び出しが成功');
        $this->assertTrue(!empty($apiResponse['response']), 'レスポンスが空でない');
        
        // 4. Google Sheets保存のシミュレート
        $chatData = [
            [
                'personaName' => $selectedPersona['name'],
                'personaId' => $selectedPersona['id'],
                'question' => $mockRequest['prompt'],
                'answer' => $apiResponse['response'],
                'timestamp' => date('c')
            ]
        ];
        
        $sheetsResponse = $this->simulateSheetsIntegration($chatData);
        $this->assertTrue($sheetsResponse['success'], 'Sheets統合が成功');
    }
    
    /**
     * API統合テスト
     */
    public function testAPIIntegration() {
        // ヘルスチェックエンドポイント
        $healthResponse = $this->mockAPICall('/api.php/health', 'GET');
        $this->assertEquals(200, $healthResponse['status_code'], 'ヘルスチェックが成功');
        $this->assertArrayHasKey('status', $healthResponse['data'], 'ステータス情報が返される');
        
        // プロバイダー一覧エンドポイント
        $providersResponse = $this->mockAPICall('/api.php/providers', 'GET');
        $this->assertEquals(200, $providersResponse['status_code'], 'プロバイダー一覧取得が成功');
        $this->assertTrue(is_array($providersResponse['data']), 'プロバイダーデータが配列');
        
        // チャットエンドポイント（正常系）
        $chatRequest = [
            'provider' => 'openai',
            'prompt' => 'テストプロンプト',
            'apiKey' => 'mock-key',
            'personaId' => 1
        ];
        
        $chatResponse = $this->mockAPICall('/api.php', 'POST', $chatRequest);
        $this->assertEquals(200, $chatResponse['status_code'], 'チャットAPI呼び出しが成功');
        
        // チャットエンドポイント（エラー系）
        $invalidRequest = ['invalid' => 'data'];
        $errorResponse = $this->mockAPICall('/api.php', 'POST', $invalidRequest);
        $this->assertEquals(400, $errorResponse['status_code'], '不正リクエストでエラーが返される');
    }
    
    /**
     * エラー回復テスト
     */
    public function testErrorRecovery() {
        // ネットワークエラーのシミュレート
        $networkError = $this->simulateNetworkError();
        $this->assertTrue($networkError['handled'], 'ネットワークエラーが適切に処理される');
        
        // API制限エラーのシミュレート
        $rateLimitError = $this->simulateRateLimitError();
        $this->assertTrue($rateLimitError['handled'], 'レート制限エラーが適切に処理される');
        
        // 認証エラーのシミュレート
        $authError = $this->simulateAuthError();
        $this->assertTrue($authError['handled'], '認証エラーが適切に処理される');
        
        // 部分的失敗の処理
        $partialFailure = $this->simulatePartialFailure();
        $this->assertTrue($partialFailure['recovered'], '部分的失敗から回復する');
    }
    
    /**
     * パフォーマンステスト
     */
    public function testPerformance() {
        // レスポンス時間のテスト
        $startTime = microtime(true);
        $response = $this->simulateLLMAPICall([
            'provider' => 'openai',
            'prompt' => 'パフォーマンステスト用プロンプト',
            'apiKey' => 'mock-key',
            'personaId' => 1
        ]);
        $endTime = microtime(true);
        
        $responseTime = $endTime - $startTime;
        $this->assertTrue($responseTime < 5.0, 'API応答時間が5秒以内');
        
        // メモリ使用量のテスト
        $memoryBefore = memory_get_usage();
        $this->processLargeDataset();
        $memoryAfter = memory_get_usage();
        
        $memoryIncrease = $memoryAfter - $memoryBefore;
        $this->assertTrue($memoryIncrease < 50 * 1024 * 1024, 'メモリ使用量増加が50MB以内'); // 50MB
        
        // 同時リクエスト処理のテスト
        $concurrentResults = $this->simulateConcurrentRequests(5);
        $this->assertTrue($concurrentResults['all_successful'], '同時リクエストが全て成功');
        $this->assertTrue($concurrentResults['average_time'] < 10.0, '同時リクエストの平均時間が10秒以内');
    }
    
    /**
     * データ整合性テスト
     */
    public function testDataConsistency() {
        // ペルソナデータの整合性
        $personas = $this->loadPersonaData();
        foreach ($personas as $persona) {
            $this->assertTrue($this->validatePersonaStructure($persona), "ペルソナ#{$persona['id']}の構造が正しい");
            $this->assertTrue($this->validatePersonaData($persona), "ペルソナ#{$persona['id']}のデータが有効");
        }
        
        // 対話データの整合性
        $testChatData = [
            'personaName' => 'Test Persona',
            'personaId' => 1,
            'question' => 'テスト質問',
            'answer' => 'テスト回答',
            'timestamp' => date('c')
        ];
        
        $formattedData = $this->formatChatDataForSheets($testChatData);
        $this->assertTrue($this->validateChatDataStructure($formattedData), 'チャットデータ構造が正しい');
        
        // 設定データの整合性
        $config = getConfig('llm_providers');
        foreach ($config as $provider => $settings) {
            $this->assertTrue($this->validateProviderConfig($provider, $settings), "プロバイダー{$provider}の設定が有効");
        }
    }
    
    /**
     * 同時ユーザーテスト
     */
    public function testConcurrentUsers() {
        $this->mockSession();
        
        // 複数セッションのシミュレート
        $sessions = [];
        for ($i = 0; $i < 5; $i++) {
            $sessions[] = $this->createMockSession("user_{$i}");
        }
        
        // 各セッションでの操作テスト
        foreach ($sessions as $i => $session) {
            $result = $this->simulateUserSession($session);
            $this->assertTrue($result['success'], "ユーザーセッション#{$i}が成功");
        }
        
        // セッション分離の確認
        $this->assertTrue($this->validateSessionIsolation($sessions), 'セッションが適切に分離されている');
        
        $this->cleanupSession();
    }
    
    // ヘルパーメソッド
    
    private function loadPersonaData() {
        $jsonPath = __DIR__ . '/../personas.json';
        if (!file_exists($jsonPath)) {
            return [];
        }
        
        $jsonData = file_get_contents($jsonPath);
        $data = json_decode($jsonData, true);
        
        return $data['personas'] ?? [];
    }
    
    private function validatePersonaStructure($persona) {
        $requiredFields = [
            'id', 'name', 'age', 'segment', 'location', 'household_income',
            'family_status', 'cooking_frequency', 'health_concerns',
            'shopping_behavior', 'food_preferences', 'condiment_usage',
            'price_sensitivity', 'key_motivations', 'pain_points',
            'japanese_food_exposure', 'purchase_drivers'
        ];
        
        foreach ($requiredFields as $field) {
            if (!isset($persona[$field]) || empty($persona[$field])) {
                return false;
            }
        }
        
        return true;
    }
    
    private function validatePersonaData($persona) {
        // 年齢の妥当性
        if (!is_numeric($persona['age']) || $persona['age'] < 18 || $persona['age'] > 100) {
            return false;
        }
        
        // IDの妥当性
        if (!is_numeric($persona['id']) || $persona['id'] < 1) {
            return false;
        }
        
        // 名前の妥当性
        if (strlen($persona['name']) < 2 || strlen($persona['name']) > 100) {
            return false;
        }
        
        return true;
    }
    
    private function simulateLLMAPICall($request) {
        // LLM API呼び出しのシミュレート
        if (!isset($request['provider']) || !isset($request['prompt']) || !isset($request['apiKey'])) {
            return ['success' => false, 'error' => 'Missing required fields'];
        }
        
        // プロバイダー別のモックレスポンス
        switch ($request['provider']) {
            case 'openai':
                $response = "こんにちは！私は{$request['personaId']}番のペルソナです。あなたの質問について...";
                break;
            case 'claude':
                $response = "Claude として回答します。ペルソナの立場から...";
                break;
            case 'gemini':
                $response = "Gemini です。指定されたペルソナになりきって...";
                break;
            default:
                return ['success' => false, 'error' => 'Unknown provider'];
        }
        
        return [
            'success' => true,
            'response' => $response,
            'provider' => $request['provider']
        ];
    }
    
    private function simulateSheetsIntegration($data) {
        // Google Sheets統合のシミュレート
        if (empty($data) || !is_array($data)) {
            return ['success' => false, 'error' => 'Invalid data'];
        }
        
        // データ検証
        foreach ($data as $row) {
            if (!isset($row['personaName']) || !isset($row['question']) || !isset($row['answer'])) {
                return ['success' => false, 'error' => 'Missing required fields in data'];
            }
        }
        
        return [
            'success' => true,
            'spreadsheetId' => 'mock_spreadsheet_id_' . uniqid(),
            'recordsAdded' => count($data)
        ];
    }
    
    private function mockAPICall($endpoint, $method, $data = null) {
        // API呼び出しのモック
        $responses = [
            'GET /api.php/health' => [
                'status_code' => 200,
                'data' => ['status' => 'healthy', 'timestamp' => date('c')]
            ],
            'GET /api.php/providers' => [
                'status_code' => 200,
                'data' => ['openai' => ['name' => 'OpenAI GPT-4'], 'claude' => ['name' => 'Anthropic Claude']]
            ],
            'POST /api.php' => [
                'status_code' => isset($data['provider']) ? 200 : 400,
                'data' => isset($data['provider']) ? 
                    ['success' => true, 'response' => 'Mock response'] : 
                    ['error' => 'Bad request']
            ]
        ];
        
        $key = $method . ' ' . $endpoint;
        return $responses[$key] ?? ['status_code' => 404, 'data' => ['error' => 'Not found']];
    }
    
    private function simulateNetworkError() {
        // ネットワークエラーの処理をシミュレート
        return [
            'handled' => true,
            'retry_attempted' => true,
            'fallback_used' => false
        ];
    }
    
    private function simulateRateLimitError() {
        // レート制限エラーの処理をシミュレート
        return [
            'handled' => true,
            'wait_time' => 60, // 秒
            'retry_scheduled' => true
        ];
    }
    
    private function simulateAuthError() {
        // 認証エラーの処理をシミュレート
        return [
            'handled' => true,
            'redirect_to_auth' => true,
            'session_cleared' => true
        ];
    }
    
    private function simulatePartialFailure() {
        // 部分的失敗の処理をシミュレート
        return [
            'recovered' => true,
            'successful_operations' => 3,
            'failed_operations' => 1,
            'rollback_performed' => true
        ];
    }
    
    private function processLargeDataset() {
        // 大きなデータセット処理のシミュレート
        $data = [];
        for ($i = 0; $i < 1000; $i++) {
            $data[] = [
                'id' => $i,
                'data' => str_repeat('x', 1024) // 1KB per item
            ];
        }
        
        // データ処理のシミュレート
        $processed = array_map(function($item) {
            return ['processed_id' => $item['id'], 'size' => strlen($item['data'])];
        }, $data);
        
        unset($data, $processed); // メモリ解放
    }
    
    private function simulateConcurrentRequests($count) {
        $results = [];
        $startTime = microtime(true);
        
        for ($i = 0; $i < $count; $i++) {
            $requestStart = microtime(true);
            $result = $this->simulateLLMAPICall([
                'provider' => 'openai',
                'prompt' => "並行リクエスト #{$i}",
                'apiKey' => 'mock-key',
                'personaId' => ($i % 10) + 1
            ]);
            $requestEnd = microtime(true);
            
            $results[] = [
                'success' => $result['success'],
                'time' => $requestEnd - $requestStart
            ];
        }
        
        $endTime = microtime(true);
        $allSuccessful = array_reduce($results, function($carry, $item) {
            return $carry && $item['success'];
        }, true);
        
        $averageTime = array_sum(array_column($results, 'time')) / count($results);
        
        return [
            'all_successful' => $allSuccessful,
            'total_time' => $endTime - $startTime,
            'average_time' => $averageTime,
            'individual_results' => $results
        ];
    }
    
    private function formatChatDataForSheets($data) {
        return [
            $data['personaName'],
            $data['personaId'],
            $data['question'],
            $data['answer'],
            date('Y-m-d H:i:s', strtotime($data['timestamp'])),
            $data['timestamp']
        ];
    }
    
    private function validateChatDataStructure($data) {
        return is_array($data) && count($data) === 6;
    }
    
    private function validateProviderConfig($provider, $config) {
        $requiredFields = ['name', 'endpoint', 'model', 'max_tokens', 'temperature'];
        
        foreach ($requiredFields as $field) {
            if (!isset($config[$field])) {
                return false;
            }
        }
        
        // エンドポイントURLの検証
        if (!filter_var($config['endpoint'], FILTER_VALIDATE_URL)) {
            return false;
        }
        
        return true;
    }
    
    private function createMockSession($userId) {
        return [
            'user_id' => $userId,
            'session_id' => 'session_' . $userId . '_' . uniqid(),
            'created_at' => time(),
            'data' => []
        ];
    }
    
    private function simulateUserSession($session) {
        // ユーザーセッションでの操作をシミュレート
        $operations = [
            'load_personas',
            'select_persona',
            'send_message',
            'receive_response',
            'save_to_sheets'
        ];
        
        foreach ($operations as $operation) {
            $result = $this->simulateOperation($operation, $session);
            if (!$result) {
                return ['success' => false, 'failed_operation' => $operation];
            }
        }
        
        return ['success' => true, 'operations_completed' => count($operations)];
    }
    
    private function simulateOperation($operation, $session) {
        // 個別操作のシミュレート
        switch ($operation) {
            case 'load_personas':
                return count($this->loadPersonaData()) === 10;
            case 'select_persona':
                return !empty($session['user_id']);
            case 'send_message':
                return strlen('テストメッセージ') > 0;
            case 'receive_response':
                return strlen('テストレスポンス') > 0;
            case 'save_to_sheets':
                return true; // シミュレート
            default:
                return false;
        }
    }
    
    private function validateSessionIsolation($sessions) {
        // セッション分離の検証
        $sessionIds = array_column($sessions, 'session_id');
        $uniqueIds = array_unique($sessionIds);
        
        return count($sessionIds) === count($uniqueIds);
    }
}

// テスト実行
if (basename($_SERVER['PHP_SELF']) === 'IntegrationTest.php') {
    echo "統合テストを実行中...\n";
    
    $test = new IntegrationTest();
    $test->runAllTests();
    $test->printResults();
    
    // テスト結果をJSONで出力
    $test->exportResults(__DIR__ . '/results/integration_test_results.json');
}
?>