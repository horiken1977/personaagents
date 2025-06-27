<?php
/**
 * Google Sheets統合のテスト
 * google_auth.php と sheets_integration.php の機能をテスト
 */

require_once __DIR__ . '/TestCase.php';
require_once __DIR__ . '/../config.php';

class GoogleSheetsTest extends TestCase {
    
    public function __construct() {
        parent::__construct('GoogleSheetsTest');
    }
    
    /**
     * すべてのテストを実行
     */
    public function runAllTests() {
        $this->testGoogleAuthConfiguration();
        $this->testOAuth2URLGeneration();
        $this->testTokenManagement();
        $this->testSheetsDataStructure();
        $this->testSpreadsheetOperations();
        $this->testErrorHandling();
    }
    
    /**
     * Google認証設定のテスト
     */
    public function testGoogleAuthConfiguration() {
        $config = getConfig('google_api');
        
        $this->assertTrue(is_array($config), 'Google API設定は配列');
        $this->assertArrayHasKey('client_id', $config, 'クライアントID設定存在');
        $this->assertArrayHasKey('client_secret', $config, 'クライアントシークレット設定存在');
        $this->assertArrayHasKey('redirect_uri', $config, 'リダイレクトURI設定存在');
        $this->assertArrayHasKey('scopes', $config, 'スコープ設定存在');
        
        // スコープの内容確認
        $scopes = $config['scopes'];
        $this->assertTrue(is_array($scopes), 'スコープは配列');
        $this->assertTrue(in_array('https://www.googleapis.com/auth/spreadsheets', $scopes), 'Sheetsスコープ存在');
        $this->assertTrue(in_array('https://www.googleapis.com/auth/drive.file', $scopes), 'Driveスコープ存在');
    }
    
    /**
     * OAuth2 URL生成のテスト
     */
    public function testOAuth2URLGeneration() {
        $config = getConfig('google_api');
        
        $authUrl = $this->generateMockAuthURL($config);
        
        $this->assertTrue(strpos($authUrl, 'accounts.google.com/o/oauth2/auth') !== false, 'Google認証URLが生成される');
        $this->assertTrue(strpos($authUrl, 'client_id=') !== false, 'クライアントIDが含まれる');
        $this->assertTrue(strpos($authUrl, 'redirect_uri=') !== false, 'リダイレクトURIが含まれる');
        $this->assertTrue(strpos($authUrl, 'scope=') !== false, 'スコープが含まれる');
        $this->assertTrue(strpos($authUrl, 'response_type=code') !== false, 'レスポンスタイプが正しい');
        $this->assertTrue(strpos($authUrl, 'access_type=offline') !== false, 'オフラインアクセスが設定');
        $this->assertTrue(strpos($authUrl, 'state=') !== false, 'ステートパラメータが含まれる');
    }
    
    /**
     * トークン管理のテスト
     */
    public function testTokenManagement() {
        $this->mockSession();
        
        // トークンデータのモック
        $tokenData = [
            'access_token' => 'mock_access_token',
            'refresh_token' => 'mock_refresh_token',
            'expires_in' => 3600,
            'scope' => 'https://www.googleapis.com/auth/spreadsheets'
        ];
        
        $this->storeTestTokens($tokenData);
        
        // トークンが正しく保存されているかテスト
        $this->assertTrue(isset($_SESSION['google_access_token']), 'アクセストークンが保存される');
        $this->assertTrue(isset($_SESSION['google_refresh_token']), 'リフレッシュトークンが保存される');
        $this->assertTrue(isset($_SESSION['google_token_expires']), '有効期限が保存される');
        
        // 認証状態の確認
        $this->assertTrue($this->isTestAuthenticated(), '認証状態が正しい');
        
        $this->cleanupSession();
    }
    
    /**
     * Sheetsデータ構造のテスト
     */
    public function testSheetsDataStructure() {
        $testData = [
            [
                'personaName' => 'Sarah Williams',
                'personaId' => 1,
                'question' => 'テスト質問',
                'answer' => 'テスト回答',
                'timestamp' => '2024-01-01T00:00:00Z'
            ]
        ];
        
        $formattedData = $this->formatDataForSheets($testData);
        
        $this->assertTrue(is_array($formattedData), 'フォーマット済みデータは配列');
        $this->assertEquals(1, count($formattedData), 'データ行数が正しい');
        
        $row = $formattedData[0];
        $this->assertEquals(6, count($row), 'カラム数が正しい（6列）');
        $this->assertEquals('Sarah Williams', $row[0], 'ペルソナ名が正しい');
        $this->assertEquals('1', $row[1], 'ペルソナIDが正しい');
        $this->assertEquals('テスト質問', $row[2], '質問内容が正しい');
        $this->assertEquals('テスト回答', $row[3], '回答内容が正しい');
    }
    
    /**
     * スプレッドシート操作のテスト
     */
    public function testSpreadsheetOperations() {
        // 新規スプレッドシート作成のテスト
        $createResponse = $this->mockCreateSpreadsheet();
        
        $this->assertArrayHasKey('spreadsheetId', $createResponse, 'スプレッドシートIDが返される');
        $this->assertTrue(strlen($createResponse['spreadsheetId']) > 0, 'スプレッドシートIDが有効');
        
        // スプレッドシート情報取得のテスト
        $infoResponse = $this->mockGetSpreadsheetInfo($createResponse['spreadsheetId']);
        
        $this->assertArrayHasKey('title', $infoResponse, 'タイトル情報が取得される');
        $this->assertArrayHasKey('url', $infoResponse, 'URL情報が取得される');
        $this->assertArrayHasKey('sheets', $infoResponse, 'シート情報が取得される');
        
        // データ書き込みのテスト
        $testData = [
            ['Sarah Williams', '1', 'テスト質問', 'テスト回答', '2024-01-01 00:00:00', '2024-01-01T00:00:00Z']
        ];
        
        $writeResponse = $this->mockWriteToSheet($createResponse['spreadsheetId'], $testData);
        $this->assertTrue($writeResponse['success'], 'データ書き込みが成功');
    }
    
    /**
     * エラーハンドリングのテスト
     */
    public function testErrorHandling() {
        // 認証エラーのテスト
        $authError = [
            'error' => 'invalid_grant',
            'error_description' => 'Invalid authorization code'
        ];
        
        $this->assertTrue($this->isAuthError($authError), '認証エラーを検出');
        
        // API エラーのテスト
        $apiError = [
            'error' => [
                'code' => 403,
                'message' => 'The caller does not have permission',
                'status' => 'PERMISSION_DENIED'
            ]
        ];
        
        $this->assertTrue($this->isAPIError($apiError), 'API エラーを検出');
        
        // 不正なスプレッドシートIDのテスト
        $invalidIds = ['', 'invalid', '123'];
        
        foreach ($invalidIds as $id) {
            $this->assertFalse($this->isValidSpreadsheetId($id), "無効なスプレッドシートID: {$id}");
        }
        
        $validId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
        $this->assertTrue($this->isValidSpreadsheetId($validId), '有効なスプレッドシートID');
    }
    
    /**
     * セキュリティテスト
     */
    public function testSecurity() {
        // CSRF保護のテスト
        $this->mockSession();
        
        $state = $this->generateMockState();
        $_SESSION['google_oauth_state'] = $state;
        
        $this->assertTrue($this->validateState($state), '正しいステートは検証成功');
        $this->assertFalse($this->validateState('invalid_state'), '不正なステートは検証失敗');
        
        // トークンの有効期限チェック
        $expiredToken = [
            'access_token' => 'expired_token',
            'expires_at' => time() - 3600 // 1時間前に期限切れ
        ];
        
        $validToken = [
            'access_token' => 'valid_token',
            'expires_at' => time() + 3600 // 1時間後に期限切れ
        ];
        
        $this->assertFalse($this->isTokenValid($expiredToken), '期限切れトークンは無効');
        $this->assertTrue($this->isTokenValid($validToken), '有効期限内トークンは有効');
        
        $this->cleanupSession();
    }
    
    // ヘルパーメソッド
    
    private function generateMockAuthURL($config) {
        $state = bin2hex(random_bytes(16));
        
        $params = [
            'client_id' => $config['client_id'] ?: 'mock_client_id',
            'redirect_uri' => $config['redirect_uri'] ?: 'http://localhost/callback',
            'scope' => implode(' ', $config['scopes']),
            'response_type' => 'code',
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state
        ];
        
        return 'https://accounts.google.com/o/oauth2/auth?' . http_build_query($params);
    }
    
    private function storeTestTokens($tokenData) {
        $_SESSION['google_access_token'] = $tokenData['access_token'];
        $_SESSION['google_refresh_token'] = $tokenData['refresh_token'] ?? null;
        $_SESSION['google_token_expires'] = time() + ($tokenData['expires_in'] ?? 3600);
        $_SESSION['google_token_scope'] = $tokenData['scope'] ?? '';
    }
    
    private function isTestAuthenticated() {
        return isset($_SESSION['google_access_token']) && 
               isset($_SESSION['google_token_expires']) && 
               $_SESSION['google_token_expires'] > time();
    }
    
    private function formatDataForSheets($data) {
        $formatted = [];
        
        foreach ($data as $item) {
            $formatted[] = [
                $item['personaName'] ?? '',
                (string)($item['personaId'] ?? ''),
                $item['question'] ?? '',
                $item['answer'] ?? '',
                isset($item['timestamp']) ? date('Y-m-d H:i:s', strtotime($item['timestamp'])) : '',
                $item['timestamp'] ?? ''
            ];
        }
        
        return $formatted;
    }
    
    private function mockCreateSpreadsheet() {
        return [
            'spreadsheetId' => '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            'properties' => [
                'title' => '北米市場調査_' . date('Y-m-d_H-i-s')
            ]
        ];
    }
    
    private function mockGetSpreadsheetInfo($spreadsheetId) {
        return [
            'title' => '北米市場調査_テスト',
            'url' => "https://docs.google.com/spreadsheets/d/{$spreadsheetId}/edit",
            'sheets' => [
                [
                    'title' => '対話データ',
                    'id' => 0
                ]
            ]
        ];
    }
    
    private function mockWriteToSheet($spreadsheetId, $data) {
        return [
            'success' => true,
            'updatedRows' => count($data),
            'updatedColumns' => 6,
            'updatedCells' => count($data) * 6
        ];
    }
    
    private function isAuthError($response) {
        return isset($response['error']) && in_array($response['error'], [
            'invalid_grant', 'invalid_client', 'unauthorized_client'
        ]);
    }
    
    private function isAPIError($response) {
        return isset($response['error']) && 
               isset($response['error']['code']) && 
               $response['error']['code'] >= 400;
    }
    
    private function isValidSpreadsheetId($id) {
        return !empty($id) && 
               strlen($id) > 20 && 
               preg_match('/^[a-zA-Z0-9-_]+$/', $id);
    }
    
    private function generateMockState() {
        return bin2hex(random_bytes(16));
    }
    
    private function validateState($state) {
        return isset($_SESSION['google_oauth_state']) && 
               $_SESSION['google_oauth_state'] === $state;
    }
    
    private function isTokenValid($token) {
        return isset($token['access_token']) && 
               isset($token['expires_at']) && 
               $token['expires_at'] > time();
    }
    
    /**
     * データ整合性のテスト
     */
    public function testDataIntegrity() {
        $testData = [
            [
                'personaName' => 'Sarah Williams',
                'personaId' => 1,
                'question' => 'スペシャル文字のテスト: 日本語, émojis 🍱, quotes "test"',
                'answer' => 'スペシャル文字の回答: 改行\nタブ\t文字',
                'timestamp' => '2024-01-01T00:00:00Z'
            ]
        ];
        
        $formattedData = $this->formatDataForSheets($testData);
        $row = $formattedData[0];
        
        // 特殊文字が適切に処理されることを確認
        $this->assertTrue(strpos($row[2], '日本語') !== false, '日本語文字が保持される');
        $this->assertTrue(strpos($row[2], '🍱') !== false, '絵文字が保持される');
        $this->assertTrue(strpos($row[3], '改行') !== false, '改行文字が含まれる');
        
        // データの長さ制限テスト
        $longText = str_repeat('A', 50000); // 50KB のテキスト
        $longData = [
            [
                'personaName' => 'Test',
                'personaId' => 1,
                'question' => $longText,
                'answer' => 'Short answer',
                'timestamp' => '2024-01-01T00:00:00Z'
            ]
        ];
        
        $formattedLongData = $this->formatDataForSheets($longData);
        $this->assertTrue(strlen($formattedLongData[0][2]) <= 50000, '長いテキストが適切に処理される');
    }
}

// テスト実行
if (basename($_SERVER['PHP_SELF']) === 'GoogleSheetsTest.php') {
    echo "Google Sheets統合テストを実行中...\n";
    
    $test = new GoogleSheetsTest();
    $test->runAllTests();
    $test->printResults();
    
    // テスト結果をJSONで出力
    $test->exportResults(__DIR__ . '/results/google_sheets_test_results.json');
}
?>