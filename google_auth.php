<?php
/**
 * Google OAuth2認証処理
 * Google Sheets APIへのアクセス権限取得を管理
 */

require_once 'config.php';

class GoogleAuthenticator {
    private $clientId;
    private $clientSecret;
    private $redirectUri;
    private $scopes;
    
    public function __construct() {
        $config = getConfig('google_api');
        $this->clientId = $config['client_id'];
        $this->clientSecret = $config['client_secret'];
        $this->redirectUri = $config['redirect_uri'];
        $this->scopes = implode(' ', $config['scopes']);
    }
    
    /**
     * メイン認証ハンドラー
     */
    public function handleAuth() {
        try {
            $action = $_GET['action'] ?? $_POST['action'] ?? 'init';
            
            switch ($action) {
                case 'init':
                    $this->initializeAuth();
                    break;
                case 'callback':
                    $this->handleCallback();
                    break;
                case 'authenticate':
                    $this->startAuthFlow();
                    break;
                case 'refresh':
                    $this->refreshToken();
                    break;
                case 'logout':
                    $this->logout();
                    break;
                default:
                    throw new Exception('Invalid action', 400);
            }
        } catch (Exception $e) {
            sendErrorResponse($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * 認証フロー初期化
     */
    private function initializeAuth() {
        if (empty($this->clientId) || empty($this->clientSecret)) {
            throw new Exception('Google API credentials not configured', 500);
        }
        
        $isAuthenticated = $this->isAuthenticated();
        
        sendJsonResponse([
            'authenticated' => $isAuthenticated,
            'auth_url' => $isAuthenticated ? null : $this->getAuthUrl(),
            'expires_at' => $_SESSION['google_token_expires'] ?? null
        ]);
    }
    
    /**
     * 認証URLの生成
     */
    private function getAuthUrl() {
        $state = bin2hex(random_bytes(16));
        $_SESSION['google_oauth_state'] = $state;
        
        $params = [
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'scope' => $this->scopes,
            'response_type' => 'code',
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state
        ];
        
        return 'https://accounts.google.com/o/oauth2/auth?' . http_build_query($params);
    }
    
    /**
     * 認証フロー開始（リダイレクト）
     */
    private function startAuthFlow() {
        $authUrl = $this->getAuthUrl();
        header('Location: ' . $authUrl);
        exit;
    }
    
    /**
     * OAuth2コールバック処理
     */
    private function handleCallback() {
        $code = $_GET['code'] ?? null;
        $state = $_GET['state'] ?? null;
        $error = $_GET['error'] ?? null;
        
        if ($error) {
            throw new Exception('OAuth error: ' . $error, 400);
        }
        
        if (!$code) {
            throw new Exception('Authorization code not received', 400);
        }
        
        if (!$state || !isset($_SESSION['google_oauth_state']) || $state !== $_SESSION['google_oauth_state']) {
            throw new Exception('Invalid state parameter', 400);
        }
        
        unset($_SESSION['google_oauth_state']);
        
        // アクセストークンの取得
        $tokenData = $this->exchangeCodeForToken($code);
        
        // トークンの保存
        $this->storeTokens($tokenData);
        
        // コールバックページを表示
        $this->showCallbackPage(true);
    }
    
    /**
     * 認可コードをアクセストークンに交換
     */
    private function exchangeCodeForToken($code) {
        $tokenUrl = 'https://oauth2.googleapis.com/token';
        
        $postData = [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'redirect_uri' => $this->redirectUri,
            'grant_type' => 'authorization_code',
            'code' => $code
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $tokenUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($postData),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded'
            ],
            CURLOPT_TIMEOUT => 30
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            writeLog("Token exchange failed: HTTP {$httpCode}, Response: {$response}", 'ERROR');
            throw new Exception('Failed to exchange authorization code for token', 500);
        }
        
        $tokenData = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE || !isset($tokenData['access_token'])) {
            throw new Exception('Invalid token response', 500);
        }
        
        return $tokenData;
    }
    
    /**
     * トークンの保存
     */
    private function storeTokens($tokenData) {
        $_SESSION['google_access_token'] = $tokenData['access_token'];
        $_SESSION['google_refresh_token'] = $tokenData['refresh_token'] ?? null;
        $_SESSION['google_token_expires'] = time() + ($tokenData['expires_in'] ?? 3600);
        $_SESSION['google_token_scope'] = $tokenData['scope'] ?? $this->scopes;
        
        writeLog('Google tokens stored successfully', 'INFO');
    }
    
    /**
     * トークンの更新
     */
    private function refreshToken() {
        if (!isset($_SESSION['google_refresh_token'])) {
            throw new Exception('No refresh token available', 401);
        }
        
        $tokenUrl = 'https://oauth2.googleapis.com/token';
        
        $postData = [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $_SESSION['google_refresh_token'],
            'grant_type' => 'refresh_token'
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $tokenUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($postData),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded'
            ],
            CURLOPT_TIMEOUT => 30
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            writeLog("Token refresh failed: HTTP {$httpCode}, Response: {$response}", 'ERROR');
            throw new Exception('Failed to refresh token', 500);
        }
        
        $tokenData = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE || !isset($tokenData['access_token'])) {
            throw new Exception('Invalid refresh token response', 500);
        }
        
        // 新しいアクセストークンを保存
        $_SESSION['google_access_token'] = $tokenData['access_token'];
        $_SESSION['google_token_expires'] = time() + ($tokenData['expires_in'] ?? 3600);
        
        sendJsonResponse([
            'success' => true,
            'expires_at' => $_SESSION['google_token_expires']
        ]);
    }
    
    /**
     * ログアウト処理
     */
    private function logout() {
        // Googleからのトークン取り消し
        if (isset($_SESSION['google_access_token'])) {
            $this->revokeToken($_SESSION['google_access_token']);
        }
        
        // セッションからトークンを削除
        unset($_SESSION['google_access_token']);
        unset($_SESSION['google_refresh_token']);
        unset($_SESSION['google_token_expires']);
        unset($_SESSION['google_token_scope']);
        
        sendJsonResponse(['success' => true, 'message' => 'Logged out successfully']);
    }
    
    /**
     * トークンの取り消し
     */
    private function revokeToken($token) {
        $revokeUrl = 'https://oauth2.googleapis.com/revoke?token=' . urlencode($token);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $revokeUrl,
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10
        ]);
        
        curl_exec($ch);
        curl_close($ch);
    }
    
    /**
     * 認証状態の確認
     */
    private function isAuthenticated() {
        if (!isset($_SESSION['google_access_token'])) {
            return false;
        }
        
        if (isset($_SESSION['google_token_expires']) && $_SESSION['google_token_expires'] <= time()) {
            // トークンが期限切れの場合、リフレッシュを試行
            if (isset($_SESSION['google_refresh_token'])) {
                try {
                    $this->refreshToken();
                    return true;
                } catch (Exception $e) {
                    return false;
                }
            }
            return false;
        }
        
        return true;
    }
    
    /**
     * 有効なアクセストークンの取得
     */
    public function getValidAccessToken() {
        if (!$this->isAuthenticated()) {
            throw new Exception('Not authenticated', 401);
        }
        
        return $_SESSION['google_access_token'];
    }
    
    /**
     * コールバックページの表示
     */
    private function showCallbackPage($success) {
        ?>
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Google認証完了</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    max-width: 400px;
                }
                .success {
                    color: #28a745;
                }
                .error {
                    color: #dc3545;
                }
                .btn {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-top: 20px;
                    text-decoration: none;
                    display: inline-block;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <?php if ($success): ?>
                    <h2 class="success">認証完了</h2>
                    <p>Google認証が正常に完了しました。</p>
                    <p>このウィンドウを閉じて、アプリケーションに戻ってください。</p>
                <?php else: ?>
                    <h2 class="error">認証失敗</h2>
                    <p>Google認証に失敗しました。</p>
                    <p>再度お試しください。</p>
                <?php endif; ?>
                <button class="btn" onclick="window.close()">ウィンドウを閉じる</button>
            </div>
            <script>
                // 親ウィンドウに認証完了を通知
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'googleAuthComplete',
                        success: <?php echo $success ? 'true' : 'false'; ?>
                    }, '*');
                }
                
                // 3秒後に自動でウィンドウを閉じる
                setTimeout(function() {
                    window.close();
                }, 3000);
            </script>
        </body>
        </html>
        <?php
        exit;
    }
}

// メイン処理
try {
    $authenticator = new GoogleAuthenticator();
    $authenticator->handleAuth();
} catch (Exception $e) {
    sendErrorResponse($e->getMessage(), $e->getCode() ?: 500);
}
?>