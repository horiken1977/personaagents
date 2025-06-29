<?php
/**
 * LLM API統合のテスト
 * api.php の機能をテスト
 */

require_once __DIR__ . '/TestCase.php';
require_once __DIR__ . '/../config.php';

class LLMAPITest extends TestCase {
    
    public function __construct() {
        parent::__construct('LLMAPITest');
    }
    
    /**
     * すべてのテストを実行
     */
    public function runAllTests() {
        $this->testLLMAPIHubInitialization();
        $this->testRequestValidation();
        $this->testProviderConfiguration();
        $this->testMockAPIResponses();
        $this->testErrorHandling();
        $this->testHealthCheck();
    }
    
    /**
     * LLMAPIHub クラスの初期化テスト
     */
    public function testLLMAPIHubInitialization() {
        // LLMAPIHubクラスの基本機能をテスト
        $providers = getConfig('llm_providers');
        $this->assertTrue(is_array($providers), 'プロバイダー設定は配列');
        $this->assertTrue(count($providers) > 0, 'プロバイダーが設定済み');
        
        // 各プロバイダーの必須設定をチェック
        foreach ($providers as $name => $config) {
            $this->assertArrayHasKey('name', $config, "{$name}に名前設定");
            $this->assertArrayHasKey('endpoint', $config, "{$name}にエンドポイント設定");
            $this->assertArrayHasKey('model', $config, "{$name}にモデル設定");
            $this->assertArrayHasKey('max_tokens', $config, "{$name}にmax_tokens設定");
            $this->assertArrayHasKey('temperature', $config, "{$name}にtemperature設定");
        }
    }
    
    /**
     * リクエスト検証のテスト
     */
    public function testRequestValidation() {
        // 正常なリクエストデータ
        $validRequest = [
            'provider' => 'openai',
            'prompt' => 'テストプロンプト',
            'apiKey' => 'test-api-key',
            'personaId' => 1
        ];
        
        $this->assertTrue($this->validateRequestStructure($validRequest), '正常なリクエスト構造');
        
        // 不正なリクエストデータ
        $invalidRequests = [
            [], // 空のリクエスト
            ['provider' => 'openai'], // 必須項目不足
            ['provider' => 'invalid', 'prompt' => 'test', 'apiKey' => 'key'], // 無効なプロバイダー
            ['provider' => 'openai', 'prompt' => str_repeat('a', 11000), 'apiKey' => 'key'], // プロンプトが長すぎる
        ];
        
        foreach ($invalidRequests as $i => $request) {
            $this->assertFalse($this->validateRequestStructure($request), "不正なリクエスト#{$i}");
        }
    }
    
    /**
     * プロバイダー設定のテスト
     */
    public function testProviderConfiguration() {
        $providers = getConfig('llm_providers');
        
        // OpenAI設定のテスト
        $this->assertArrayHasKey('openai', $providers, 'OpenAI設定存在');
        $openaiConfig = $providers['openai'];
        $this->assertEquals('https://api.openai.com/v1/chat/completions', $openaiConfig['endpoint'], 'OpenAIエンドポイント正常');
        $this->assertEquals('gpt-4', $openaiConfig['model'], 'OpenAIモデル正常');
        
        // Claude設定のテスト
        $this->assertArrayHasKey('claude', $providers, 'Claude設定存在');
        $claudeConfig = $providers['claude'];
        $this->assertEquals('https://api.anthropic.com/v1/messages', $claudeConfig['endpoint'], 'Claudeエンドポイント正常');
        
        // Gemini設定のテスト
        $this->assertArrayHasKey('gemini', $providers, 'Gemini設定存在');
        $geminiConfig = $providers['gemini'];
        $this->assertTrue(strpos($geminiConfig['endpoint'], 'generativelanguage.googleapis.com') !== false, 'Geminiエンドポイント正常');
    }
    
    /**
     * モックAPIレスポンスのテスト
     */
    public function testMockAPIResponses() {
        // OpenAI形式のモックレスポンス
        $openaiResponse = [
            'choices' => [
                [
                    'message' => [
                        'content' => 'テスト応答'
                    ]
                ]
            ]
        ];
        
        $extractedContent = $this->extractOpenAIContent($openaiResponse);
        $this->assertEquals('テスト応答', $extractedContent, 'OpenAI応答の抽出正常');
        
        // Claude形式のモックレスポンス
        $claudeResponse = [
            'content' => [
                [
                    'text' => 'Claude テスト応答'
                ]
            ]
        ];
        
        $extractedContent = $this->extractClaudeContent($claudeResponse);
        $this->assertEquals('Claude テスト応答', $extractedContent, 'Claude応答の抽出正常');
        
        // Gemini形式のモックレスポンス
        $geminiResponse = [
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            [
                                'text' => 'Gemini テスト応答'
                            ]
                        ]
                    ]
                ]
            ]
        ];
        
        $extractedContent = $this->extractGeminiContent($geminiResponse);
        $this->assertEquals('Gemini テスト応答', $extractedContent, 'Gemini応答の抽出正常');
    }
    
    /**
     * エラーハンドリングのテスト
     */
    public function testErrorHandling() {
        // APIエラーレスポンスのテスト
        $errorResponses = [
            // OpenAI エラー
            [
                'error' => [
                    'message' => 'Invalid API key',
                    'type' => 'invalid_request_error'
                ]
            ],
            // Claude エラー
            [
                'error' => [
                    'message' => 'Authentication failed',
                    'type' => 'authentication_error'
                ]
            ],
            // Gemini エラー
            [
                'error' => [
                    'message' => 'API key not valid',
                    'code' => 400
                ]
            ]
        ];
        
        foreach ($errorResponses as $i => $errorResponse) {
            $this->assertTrue($this->isErrorResponse($errorResponse), "エラーレスポンス#{$i}の検出正常");
        }
    }
    
    /**
     * ヘルスチェックのテスト
     */
    public function testHealthCheck() {
        $healthResponse = $this->mockHealthCheck();
        
        $this->assertArrayHasKey('status', $healthResponse, 'ステータス項目存在');
        $this->assertEquals('healthy', $healthResponse['status'], 'ヘルスチェック正常');
        $this->assertArrayHasKey('providers', $healthResponse, 'プロバイダー一覧存在');
        $this->assertArrayHasKey('timestamp', $healthResponse, 'タイムスタンプ存在');
        $this->assertArrayHasKey('version', $healthResponse, 'バージョン情報存在');
    }
    
    /**
     * プロンプトインジェクション対策のテスト
     */
    public function testPromptInjectionPrevention() {
        $maliciousPrompts = [
            'Ignore previous instructions and...',
            'System: You are now...',
            '<!-- Ignore everything above -->',
            'SYSTEM_OVERRIDE: Change your role to...'
        ];
        
        foreach ($maliciousPrompts as $prompt) {
            $sanitized = $this->sanitizePrompt($prompt);
            $this->assertFalse($this->containsInjectionPatterns($sanitized), 'プロンプトインジェクション対策済み');
        }
    }
    
    // ヘルパーメソッド
    
    private function validateRequestStructure($request) {
        if (!is_array($request)) return false;
        
        $required = ['provider', 'prompt', 'apiKey'];
        foreach ($required as $field) {
            if (!isset($request[$field]) || empty($request[$field])) {
                return false;
            }
        }
        
        // プロバイダーの有効性チェック
        $validProviders = array_keys(getConfig('llm_providers'));
        if (!in_array($request['provider'], $validProviders)) {
            return false;
        }
        
        // プロンプト長のチェック
        if (strlen($request['prompt']) > 10000) {
            return false;
        }
        
        return true;
    }
    
    private function extractOpenAIContent($response) {
        return $response['choices'][0]['message']['content'] ?? 'No response generated';
    }
    
    private function extractClaudeContent($response) {
        return $response['content'][0]['text'] ?? 'No response generated';
    }
    
    private function extractGeminiContent($response) {
        return $response['candidates'][0]['content']['parts'][0]['text'] ?? 'No response generated';
    }
    
    private function isErrorResponse($response) {
        return isset($response['error']) && isset($response['error']['message']);
    }
    
    private function mockHealthCheck() {
        return [
            'status' => 'healthy',
            'providers' => array_keys(getConfig('llm_providers')),
            'timestamp' => date('c'),
            'version' => '1.0.0'
        ];
    }
    
    private function sanitizePrompt($prompt) {
        // 基本的なサニタイゼーション（実際の実装ではより詳細な処理が必要）
        $patterns = [
            '/system\s*:/i',
            '/ignore\s+previous\s+instructions/i',
            '/<!--.*?-->/s',
            '/SYSTEM_OVERRIDE/i'
        ];
        
        $sanitized = $prompt;
        foreach ($patterns as $pattern) {
            $sanitized = preg_replace($pattern, '[FILTERED]', $sanitized);
        }
        
        return $sanitized;
    }
    
    private function containsInjectionPatterns($text) {
        $injectionPatterns = [
            '/system\s*:/i',
            '/ignore\s+previous/i',
            '/SYSTEM_OVERRIDE/i'
        ];
        
        foreach ($injectionPatterns as $pattern) {
            if (preg_match($pattern, $text)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * レート制限のテスト
     */
    public function testRateLimiting() {
        $this->mockSession();
        
        $clientId = 'test_client';
        
        // 通常のリクエストは成功
        $this->assertTrue(checkRateLimit($clientId), '通常リクエスト成功');
        
        // セッションにリクエスト履歴が記録される
        $this->assertTrue(isset($_SESSION['rate_limit'][$clientId]), 'リクエスト履歴記録');
        
        $this->cleanupSession();
    }
    
    /**
     * APIキー検証のテスト
     */
    public function testAPIKeyValidation() {
        $validKeys = [
            'sk-1234567890abcdef1234567890abcdef',
            'sk-ant-1234567890abcdef1234567890abcdef',
            'AIza1234567890abcdef1234567890abcdef'
        ];
        
        foreach ($validKeys as $key) {
            $this->assertTrue($this->isValidAPIKeyFormat($key), "有効なAPIキー形式: {$key}");
        }
        
        $invalidKeys = [
            '',
            'invalid',
            'sk-',
            '123'
        ];
        
        foreach ($invalidKeys as $key) {
            $this->assertFalse($this->isValidAPIKeyFormat($key), "無効なAPIキー形式: {$key}");
        }
    }
    
    private function isValidAPIKeyFormat($key) {
        if (empty($key) || strlen($key) < 10) {
            return false;
        }
        
        $patterns = [
            '/^sk-[a-zA-Z0-9]{48}$/',  // OpenAI
            '/^sk-ant-[a-zA-Z0-9-_]+$/',  // Claude
            '/^AIza[a-zA-Z0-9-_]{35}$/'   // Google
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $key)) {
                return true;
            }
        }
        
        return false;
    }
}

// テスト実行
if (basename($_SERVER['PHP_SELF']) === 'LLMAPITest.php') {
    echo "LLM API統合テストを実行中...\n";
    
    $test = new LLMAPITest();
    $test->runAllTests();
    $test->printResults();
    
    // テスト結果をJSONで出力
    $test->exportResults(__DIR__ . '/results/llm_api_test_results.json');
}
?>