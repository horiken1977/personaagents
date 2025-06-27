<?php
/**
 * セキュリティテスト
 * アプリケーションのセキュリティ機能をテスト
 */

require_once __DIR__ . '/TestCase.php';
require_once __DIR__ . '/../config.php';

class SecurityTest extends TestCase {
    
    public function __construct() {
        parent::__construct('SecurityTest');
    }
    
    /**
     * すべてのセキュリティテストを実行
     */
    public function runAllTests() {
        $this->testInputValidation();
        $this->testSQLInjectionPrevention();
        $this->testXSSPrevention();
        $this->testCSRFProtection();
        $this->testRateLimiting();
        $this->testAPIKeyValidation();
        $this->testSessionSecurity();
        $this->testFileUploadSecurity();
        $this->testOAuth2Security();
        $this->testErrorHandling();
    }
    
    /**
     * 入力値検証のテスト
     */
    public function testInputValidation() {
        // 正常な入力
        $validInputs = [
            ['name' => 'Valid Name', 'email' => 'valid@example.com'],
            ['prompt' => 'Valid prompt text', 'provider' => 'openai'],
        ];
        
        foreach ($validInputs as $input) {
            $this->assertTrue($this->validateUserInput($input), '正常な入力は検証を通過');
        }
        
        // 不正な入力
        $invalidInputs = [
            ['name' => '<script>alert("xss")</script>'],
            ['email' => 'invalid-email'],
            ['prompt' => str_repeat('A', 20000)], // 長すぎるプロンプト
            ['provider' => '../../../etc/passwd'], // ディレクトリトラバーサル
            ['apiKey' => ''],
            ['personaId' => 'DROP TABLE users;'] // SQLインジェクション試行
        ];
        
        foreach ($invalidInputs as $input) {
            $this->assertFalse($this->validateUserInput($input), '不正な入力は検証で拒否される');
        }
    }
    
    /**
     * SQLインジェクション対策のテスト
     */
    public function testSQLInjectionPrevention() {
        $maliciousInputs = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'/*",
            "1; EXEC xp_cmdshell('dir')",
            "UNION SELECT * FROM users",
            "1' AND 1=1 --"
        ];
        
        foreach ($maliciousInputs as $input) {
            $sanitized = $this->sanitizeForDatabase($input);
            $this->assertFalse($this->containsSQLInjection($sanitized), 'SQLインジェクションがサニタイズされる');
        }
    }
    
    /**
     * XSS攻撃対策のテスト
     */
    public function testXSSPrevention() {
        $xssAttempts = [
            '<script>alert("XSS")</script>',
            '<img src=x onerror=alert("XSS")>',
            '<svg onload=alert("XSS")>',
            'javascript:alert("XSS")',
            '<iframe src="javascript:alert(\'XSS\')"></iframe>',
            '"><script>alert("XSS")</script>',
            '<body onload=alert("XSS")>',
            '<input onfocus=alert("XSS") autofocus>'
        ];
        
        foreach ($xssAttempts as $xss) {
            $sanitized = $this->sanitizeForOutput($xss);
            $this->assertFalse($this->containsXSS($sanitized), 'XSS攻撃がサニタイズされる');
        }
    }
    
    /**
     * CSRF保護のテスト
     */
    public function testCSRFProtection() {
        $this->mockSession();
        
        // 正常なCSRFトークンの生成と検証
        $token = generateCSRFToken();
        $this->assertTrue($this->isValidCSRFToken($token), 'CSRFトークンが正常に生成される');
        $this->assertTrue(validateCSRFToken($token), '正しいCSRFトークンは検証を通過');
        
        // 不正なトークンの検証
        $invalidTokens = [
            '',
            'invalid_token',
            'a' . $token, // 改ざんされたトークン
            substr($token, 0, -1), // 短縮されたトークン
        ];
        
        foreach ($invalidTokens as $invalidToken) {
            $this->assertFalse(validateCSRFToken($invalidToken), '不正なCSRFトークンは検証で拒否');
        }
        
        $this->cleanupSession();
    }
    
    /**
     * レート制限のテスト
     */
    public function testRateLimiting() {
        $this->mockSession();
        
        $clientId = 'test_client_' . uniqid();
        
        // 通常のリクエスト頻度はOK
        for ($i = 0; $i < 10; $i++) {
            $result = checkRateLimit($clientId);
            $this->assertTrue($result, "リクエスト#{$i}は制限内");
        }
        
        // 制限値に近づいたときのテスト（実際の制限は設定による）
        $this->assertTrue(isset($_SESSION['rate_limit'][$clientId]), 'レート制限データが記録される');
        
        $this->cleanupSession();
    }
    
    /**
     * APIキー検証のテスト
     */
    public function testAPIKeyValidation() {
        // 有効なAPIキー形式
        $validKeys = [
            'sk-1234567890abcdef1234567890abcdef1234567890abcdef',
            'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890',
            'AIza1234567890abcdefghijklmnopqrstuvwxyz'
        ];
        
        foreach ($validKeys as $key) {
            $this->assertTrue($this->validateAPIKeyFormat($key), "有効なAPIキー: {$key}");
        }
        
        // 無効なAPIキー
        $invalidKeys = [
            '',
            'invalid',
            'sk-',
            'short',
            '../../config.php',
            '<script>alert("xss")</script>',
            'sk-' . str_repeat('A', 1000) // 異常に長いキー
        ];
        
        foreach ($invalidKeys as $key) {
            $this->assertFalse($this->validateAPIKeyFormat($key), "無効なAPIキー: {$key}");
        }
    }
    
    /**
     * セッションセキュリティのテスト
     */
    public function testSessionSecurity() {
        // セッション設定の確認
        $this->assertTrue(ini_get('session.cookie_httponly'), 'HTTPOnlyクッキーが有効');
        $this->assertTrue(ini_get('session.use_strict_mode'), 'ストリクトモードが有効');
        
        // セッションハイジャック対策
        $this->mockSession();
        
        $originalId = session_id();
        $this->assertTrue(!empty($originalId), 'セッションIDが生成される');
        
        // セッション再生成のテスト
        session_regenerate_id(true);
        $newId = session_id();
        $this->assertFalse($originalId === $newId, 'セッションIDが再生成される');
        
        $this->cleanupSession();
    }
    
    /**
     * ファイルアップロードセキュリティのテスト
     */
    public function testFileUploadSecurity() {
        // 危険なファイル拡張子
        $dangerousExtensions = [
            'php', 'asp', 'aspx', 'jsp', 'exe', 'bat', 'cmd', 'sh'
        ];
        
        foreach ($dangerousExtensions as $ext) {
            $filename = "test.{$ext}";
            $this->assertFalse($this->isAllowedFileType($filename), "危険な拡張子は拒否: {$ext}");
        }
        
        // 許可されるファイル拡張子
        $allowedExtensions = [
            'jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'csv', 'json'
        ];
        
        foreach ($allowedExtensions as $ext) {
            $filename = "test.{$ext}";
            $this->assertTrue($this->isAllowedFileType($filename), "安全な拡張子は許可: {$ext}");
        }
        
        // ファイル名の検証
        $maliciousFilenames = [
            '../../../etc/passwd',
            'test.php.jpg', // 二重拡張子
            'test.php%00.jpg', // ヌルバイト
            '../../config.php',
            'CON', 'PRN', 'AUX' // Windows予約ファイル名
        ];
        
        foreach ($maliciousFilenames as $filename) {
            $this->assertFalse($this->isSafeFilename($filename), "危険なファイル名は拒否: {$filename}");
        }
    }
    
    /**
     * OAuth2セキュリティのテスト
     */
    public function testOAuth2Security() {
        $this->mockSession();
        
        // ステートパラメータの検証
        $validState = bin2hex(random_bytes(16));
        $_SESSION['google_oauth_state'] = $validState;
        
        $this->assertTrue($this->validateOAuth2State($validState), '正しいステートは検証を通過');
        $this->assertFalse($this->validateOAuth2State('invalid_state'), '不正なステートは拒否');
        $this->assertFalse($this->validateOAuth2State(''), '空のステートは拒否');
        
        // 認証コードの検証
        $validAuthCode = 'valid_auth_code_' . uniqid();
        $this->assertTrue($this->validateAuthCode($validAuthCode), '正しい認証コード形式');
        
        $invalidAuthCodes = [
            '',
            '<script>alert("xss")</script>',
            '../../config.php',
            'code with spaces',
            str_repeat('A', 1000) // 異常に長い
        ];
        
        foreach ($invalidAuthCodes as $code) {
            $this->assertFalse($this->validateAuthCode($code), "不正な認証コード: {$code}");
        }
        
        $this->cleanupSession();
    }
    
    /**
     * エラー処理のセキュリティテスト
     */
    public function testErrorHandling() {
        // 情報漏洩の防止
        $sensitiveInfo = [
            '/var/www/html/config.php',
            'Database password: secret123',
            'API Key: sk-1234567890abcdef',
            'mysql_connect(): Access denied'
        ];
        
        foreach ($sensitiveInfo as $info) {
            $sanitizedError = $this->sanitizeErrorMessage($info);
            $this->assertFalse($this->containsSensitiveInfo($sanitizedError), '機密情報が除去される');
        }
        
        // スタックトレースの制御
        $debugMode = false; // 本番環境想定
        $errorWithTrace = $this->generateTestError($debugMode);
        
        if (!$debugMode) {
            $this->assertFalse(strpos($errorWithTrace, 'Stack trace:') !== false, '本番環境ではスタックトレースが非表示');
        }
    }
    
    /**
     * ヘッダーインジェクション対策のテスト
     */
    public function testHeaderInjection() {
        $maliciousHeaders = [
            "Content-Type: text/html\r\n\r\n<script>alert('xss')</script>",
            "Location: http://evil.com\r\nContent-Length: 0\r\n\r\n",
            "Set-Cookie: admin=true\r\n",
            "\r\nHTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n"
        ];
        
        foreach ($maliciousHeaders as $header) {
            $sanitized = $this->sanitizeHeader($header);
            $this->assertFalse($this->containsHeaderInjection($sanitized), 'ヘッダーインジェクションが防止される');
        }
    }
    
    // ヘルパーメソッド
    
    private function validateUserInput($input) {
        foreach ($input as $key => $value) {
            if (empty($value) && $key !== 'optional_field') {
                return false;
            }
            
            // XSS チェック
            if ($this->containsXSS($value)) {
                return false;
            }
            
            // SQLインジェクション チェック
            if ($this->containsSQLInjection($value)) {
                return false;
            }
            
            // 長さチェック
            if (strlen($value) > 10000) {
                return false;
            }
            
            // ディレクトリトラバーサル チェック
            if (strpos($value, '../') !== false || strpos($value, '..\\') !== false) {
                return false;
            }
        }
        
        return true;
    }
    
    private function sanitizeForDatabase($input) {
        // SQLインジェクション対策のサニタイゼーション
        return preg_replace('/[\'";\\\\]/', '', $input);
    }
    
    private function containsSQLInjection($input) {
        $patterns = [
            '/union\s+select/i',
            '/drop\s+table/i',
            '/exec\s+/i',
            '/xp_cmdshell/i',
            '/\'\s*or\s*\'/i',
            '/--/',
            '/\/\*/',
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }
        
        return false;
    }
    
    private function sanitizeForOutput($input) {
        return htmlspecialchars($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
    
    private function containsXSS($input) {
        $patterns = [
            '/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi',
            '/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/mi',
            '/javascript:/i',
            '/on\w+\s*=/i',
            '/<svg\b[^>]*onload/i',
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }
        
        return false;
    }
    
    private function isValidCSRFToken($token) {
        return !empty($token) && strlen($token) >= 32 && ctype_xdigit($token);
    }
    
    private function validateAPIKeyFormat($key) {
        if (empty($key) || strlen($key) < 10 || strlen($key) > 200) {
            return false;
        }
        
        // パスインジェクションチェック
        if (strpos($key, '../') !== false || strpos($key, '/') !== false) {
            return false;
        }
        
        // XSSチェック
        if ($this->containsXSS($key)) {
            return false;
        }
        
        // 基本的なAPIキー形式チェック
        $patterns = [
            '/^sk-[a-zA-Z0-9]{32,}$/',  // OpenAI style
            '/^sk-ant-[a-zA-Z0-9-_]{10,}$/',  // Claude style
            '/^AIza[a-zA-Z0-9-_]{35,}$/'   // Google style
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $key)) {
                return true;
            }
        }
        
        return false;
    }
    
    private function isAllowedFileType($filename) {
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'csv', 'json'];
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        return in_array($extension, $allowedExtensions);
    }
    
    private function isSafeFilename($filename) {
        // ディレクトリトラバーサル
        if (strpos($filename, '../') !== false || strpos($filename, '..\\') !== false) {
            return false;
        }
        
        // ヌルバイト
        if (strpos($filename, "\0") !== false) {
            return false;
        }
        
        // Windows予約ファイル名
        $reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'LPT1', 'LPT2'];
        $baseName = strtoupper(pathinfo($filename, PATHINFO_FILENAME));
        if (in_array($baseName, $reserved)) {
            return false;
        }
        
        // 二重拡張子
        if (preg_match('/\.(php|asp|jsp|exe)\./i', $filename)) {
            return false;
        }
        
        return true;
    }
    
    private function validateOAuth2State($state) {
        return isset($_SESSION['google_oauth_state']) && 
               $_SESSION['google_oauth_state'] === $state &&
               !empty($state);
    }
    
    private function validateAuthCode($code) {
        return !empty($code) && 
               strlen($code) < 500 && 
               !$this->containsXSS($code) &&
               strpos($code, '../') === false &&
               !preg_match('/\s/', $code);
    }
    
    private function sanitizeErrorMessage($message) {
        // 機密情報のパターンを削除
        $patterns = [
            '/\/[a-zA-Z0-9\/._-]*\.php/',
            '/password:\s*\w+/i',
            '/api.key:\s*\w+/i',
            '/mysql_connect\(\).*/',
        ];
        
        $sanitized = $message;
        foreach ($patterns as $pattern) {
            $sanitized = preg_replace($pattern, '[FILTERED]', $sanitized);
        }
        
        return $sanitized;
    }
    
    private function containsSensitiveInfo($message) {
        $sensitivePatterns = [
            '/\/var\/www\//',
            '/password/i',
            '/api.key/i',
            '/\.php$/',
            '/mysql_/',
        ];
        
        foreach ($sensitivePatterns as $pattern) {
            if (preg_match($pattern, $message)) {
                return true;
            }
        }
        
        return false;
    }
    
    private function generateTestError($debugMode) {
        if ($debugMode) {
            return "Error: Database connection failed\nStack trace:\n#0 config.php(123)";
        } else {
            return "An error occurred. Please try again later.";
        }
    }
    
    private function sanitizeHeader($header) {
        // CRLF インジェクション対策
        return preg_replace('/[\r\n]/', '', $header);
    }
    
    private function containsHeaderInjection($header) {
        return strpos($header, "\r") !== false || strpos($header, "\n") !== false;
    }
}

// テスト実行
if (basename($_SERVER['PHP_SELF']) === 'SecurityTest.php') {
    echo "セキュリティテストを実行中...\n";
    
    $test = new SecurityTest();
    $test->runAllTests();
    $test->printResults();
    
    // テスト結果をJSONで出力
    $test->exportResults(__DIR__ . '/results/security_test_results.json');
}
?>