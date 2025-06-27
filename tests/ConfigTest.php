<?php
/**
 * 設定関連のテスト
 * config.php の機能をテスト
 */

require_once __DIR__ . '/TestCase.php';
require_once __DIR__ . '/../config.php';

class ConfigTest extends TestCase {
    
    public function __construct() {
        parent::__construct('ConfigTest');
    }
    
    /**
     * すべてのテストを実行
     */
    public function runAllTests() {
        $this->testGetConfig();
        $this->testValidateInput();
        $this->testValidateType();
        $this->testRateLimit();
        $this->testCSRFToken();
        $this->testLogging();
    }
    
    /**
     * getConfig 関数のテスト
     */
    public function testGetConfig() {
        // LLMプロバイダー設定の取得テスト
        $llmConfig = getConfig('llm_providers');
        $this->assertTrue(is_array($llmConfig), 'LLM設定は配列である');
        $this->assertArrayHasKey('openai', $llmConfig, 'OpenAI設定が存在する');
        $this->assertArrayHasKey('claude', $llmConfig, 'Claude設定が存在する');
        $this->assertArrayHasKey('gemini', $llmConfig, 'Gemini設定が存在する');
        
        // 存在しない設定キーのテスト
        $nonExistent = getConfig('non_existent', 'default_value');
        $this->assertEquals('default_value', $nonExistent, 'デフォルト値が返される');
        
        // セキュリティ設定のテスト
        $securityConfig = getConfig('security');
        $this->assertTrue(is_array($securityConfig), 'セキュリティ設定は配列である');
        $this->assertArrayHasKey('rate_limit', $securityConfig, 'レート制限設定が存在する');
    }
    
    /**
     * validateInput 関数のテスト
     */
    public function testValidateInput() {
        // 正常な入力のテスト
        $validData = [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'age' => 25
        ];
        
        $rules = [
            'name' => ['required' => true, 'type' => 'string', 'max_length' => 100],
            'email' => ['required' => true, 'type' => 'email'],
            'age' => ['required' => false, 'type' => 'integer']
        ];
        
        $errors = validateInput($validData, $rules);
        $this->assertTrue(empty($errors), '正常なデータではエラーが発生しない');
        
        // 必須項目エラーのテスト
        $invalidData = [
            'email' => 'invalid-email'
        ];
        
        $errors = validateInput($invalidData, $rules);
        $this->assertFalse(empty($errors), '不正なデータでエラーが発生する');
        $this->assertTrue(in_array('name is required', $errors), '必須項目エラーが含まれる');
    }
    
    /**
     * validateType 関数のテスト
     */
    public function testValidateType() {
        // 文字列型のテスト
        $this->assertTrue(validateType('test', 'string'), '文字列の検証が正常');
        $this->assertFalse(validateType(123, 'string'), '数値は文字列として無効');
        
        // 整数型のテスト
        $this->assertTrue(validateType(123, 'integer'), '整数の検証が正常');
        $this->assertTrue(validateType('123', 'integer'), '数値文字列は整数として有効');
        $this->assertFalse(validateType('abc', 'integer'), '文字列は整数として無効');
        
        // メール型のテスト
        $this->assertTrue(validateType('test@example.com', 'email'), '正常なメールアドレス');
        $this->assertFalse(validateType('invalid-email', 'email'), '不正なメールアドレス');
        
        // URL型のテスト
        $this->assertTrue(validateType('https://example.com', 'url'), '正常なURL');
        $this->assertFalse(validateType('invalid-url', 'url'), '不正なURL');
    }
    
    /**
     * レート制限のテスト
     */
    public function testRateLimit() {
        $this->mockSession();
        
        $identifier = 'test_user';
        
        // 初回リクエストは成功する
        $result1 = checkRateLimit($identifier);
        $this->assertTrue($result1, '初回リクエストは成功');
        
        // セッションにレート制限データが設定される
        $this->assertTrue(isset($_SESSION['rate_limit'][$identifier]), 'レート制限データが設定される');
        
        $this->cleanupSession();
    }
    
    /**
     * CSRFトークンのテスト
     */
    public function testCSRFToken() {
        $this->mockSession();
        
        // トークン生成のテスト
        $token1 = generateCSRFToken();
        $this->assertTrue(is_string($token1), 'CSRFトークンは文字列');
        $this->assertTrue(strlen($token1) > 0, 'CSRFトークンは空でない');
        
        // 同一セッションでは同じトークンが返される
        $token2 = generateCSRFToken();
        $this->assertEquals($token1, $token2, '同一セッションでは同じトークン');
        
        // トークン検証のテスト
        $this->assertTrue(validateCSRFToken($token1), '正しいトークンは検証成功');
        $this->assertFalse(validateCSRFToken('invalid-token'), '不正なトークンは検証失敗');
        
        $this->cleanupSession();
    }
    
    /**
     * ログ機能のテスト
     */
    public function testLogging() {
        $testLogFile = $this->createTempFile('', '.log');
        
        // ログ書き込みのテスト
        writeLog('Test message', 'INFO', $testLogFile);
        
        $logContent = file_get_contents($testLogFile);
        $this->assertTrue(strpos($logContent, 'Test message') !== false, 'ログメッセージが記録される');
        $this->assertTrue(strpos($logContent, '[INFO]') !== false, 'ログレベルが記録される');
        
        $this->cleanupTempFile($testLogFile);
    }
    
    /**
     * 環境設定のテスト
     */
    public function testEnvironmentSettings() {
        // 必要な定数が定義されているかチェック
        $this->assertTrue(defined('LLM_PROVIDERS'), 'LLM_PROVIDERS定数が定義済み');
        $this->assertTrue(defined('GOOGLE_API_CONFIG'), 'GOOGLE_API_CONFIG定数が定義済み');
        $this->assertTrue(defined('SECURITY_CONFIG'), 'SECURITY_CONFIG定数が定義済み');
        
        // LLMプロバイダー設定の構造チェック
        $providers = LLM_PROVIDERS;
        foreach ($providers as $provider => $config) {
            $this->assertArrayHasKey('name', $config, "{$provider}に名前が設定済み");
            $this->assertArrayHasKey('endpoint', $config, "{$provider}にエンドポイントが設定済み");
            $this->assertArrayHasKey('model', $config, "{$provider}にモデルが設定済み");
        }
    }
    
    /**
     * エラーハンドリングのテスト
     */
    public function testErrorHandling() {
        // sendErrorResponse関数のテスト（出力バッファリングを使用）
        ob_start();
        
        $this->expectException(function() {
            sendErrorResponse('Test error', 400);
        }, 'Exception');
        
        ob_end_clean();
    }
}

// テスト実行
if (basename($_SERVER['PHP_SELF']) === 'ConfigTest.php') {
    echo "設定関連テストを実行中...\n";
    
    $test = new ConfigTest();
    $test->runAllTests();
    $test->printResults();
    
    // テスト結果をJSONで出力
    $test->exportResults(__DIR__ . '/results/config_test_results.json');
}
?>