<?php
// 設定ファイルを読み込み
require_once 'config.php';

// APIキー設定ファイルのパス
$apiKeysFile = __DIR__ . '/api_keys.json';

// POSTリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'save_keys') {
        // APIキーの保存
        $keys = [
            'openai' => $_POST['openai_key'] ?? '',
            'anthropic' => $_POST['anthropic_key'] ?? '',
            'google' => $_POST['google_key'] ?? '',
            'google_client_id' => $_POST['google_client_id'] ?? '',
            'google_client_secret' => $_POST['google_client_secret'] ?? ''
        ];
        
        // JSONファイルに保存
        file_put_contents($apiKeysFile, json_encode($keys, JSON_PRETTY_PRINT));
        
        // 成功メッセージと自動リダイレクト
        $message = ['type' => 'success', 'text' => 'APIキーが保存されました。3秒後にメインページに移動します。'];
        
        // APIキーが設定されているかチェック
        $hasApiKeys = false;
        $providers = ['openai', 'claude', 'gemini'];
        foreach ($providers as $provider) {
            if (getApiKey($provider)) {
                $hasApiKeys = true;
                break;
            }
        }
        
        // 自動リダイレクトのフラグ
        $autoRedirect = $hasApiKeys;
    } elseif ($action === 'test_api') {
        // API疎通テスト
        header('Content-Type: application/json');
        $provider = $_POST['provider'] ?? '';
        $apiKey = $_POST['api_key'] ?? '';
        
        $result = testApiConnection($provider, $apiKey);
        echo json_encode($result);
        exit;
    }
}

// 保存されているAPIキーを読み込み
$savedKeys = [];
if (file_exists($apiKeysFile)) {
    $savedKeys = json_decode(file_get_contents($apiKeysFile), true) ?: [];
}

// API疎通テスト関数
function testApiConnection($provider, $apiKey) {
    if (empty($apiKey)) {
        return ['success' => false, 'message' => 'APIキーが入力されていません。'];
    }
    
    switch ($provider) {
        case 'openai':
            return testOpenAI($apiKey);
        case 'anthropic':
            return testAnthropic($apiKey);
        case 'google':
            return testGoogleAI($apiKey);
        default:
            return ['success' => false, 'message' => '不明なプロバイダーです。'];
    }
}

function testOpenAI($apiKey) {
    $url = 'https://api.openai.com/v1/models';
    $headers = [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return ['success' => true, 'message' => 'OpenAI APIへの接続に成功しました。'];
    } else {
        return ['success' => false, 'message' => 'OpenAI APIへの接続に失敗しました。HTTPコード: ' . $httpCode];
    }
}

function testAnthropic($apiKey) {
    $url = 'https://api.anthropic.com/v1/messages';
    $headers = [
        'x-api-key: ' . $apiKey,
        'Content-Type: application/json',
        'anthropic-version: 2023-06-01'
    ];
    
    $data = [
        'model' => 'claude-3-haiku-20240307',
        'messages' => [['role' => 'user', 'content' => 'Hello']],
        'max_tokens' => 10
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return ['success' => true, 'message' => 'Anthropic APIへの接続に成功しました。'];
    } else {
        return ['success' => false, 'message' => 'Anthropic APIへの接続に失敗しました。HTTPコード: ' . $httpCode];
    }
}

function testGoogleAI($apiKey) {
    $url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' . $apiKey;
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return ['success' => true, 'message' => 'Google AI APIへの接続に成功しました。'];
    } else {
        return ['success' => false, 'message' => 'Google AI APIへの接続に失敗しました。HTTPコード: ' . $httpCode];
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PersonaAgent セットアップ</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #333;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        label {
            display: block;
            color: #555;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        input[type="text"]:focus, input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .input-group {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .input-group input {
            flex: 1;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }
        
        .btn-secondary {
            background: #f8f9fa;
            color: #666;
            border: 2px solid #e1e8ed;
        }
        
        .btn-secondary:hover {
            background: #e9ecef;
        }
        
        .btn-test {
            background: #28a745;
            color: white;
            font-size: 12px;
            padding: 8px 15px;
        }
        
        .btn-test:hover {
            background: #218838;
        }
        
        .message {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .section {
            margin-bottom: 40px;
            padding: 25px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        
        .section h2 {
            color: #495057;
            margin-bottom: 20px;
            font-size: 20px;
        }
        
        .help-text {
            font-size: 12px;
            color: #6c757d;
            margin-top: 5px;
        }
        
        .test-result {
            margin-top: 10px;
            padding: 10px;
            border-radius: 5px;
            font-size: 14px;
            display: none;
        }
        
        .test-result.success {
            background: #d4edda;
            color: #155724;
        }
        
        .test-result.error {
            background: #f8d7da;
            color: #721c24;
        }
        
        .actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 30px;
        }
        
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 10px;
            vertical-align: middle;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 PersonaAgent セットアップ</h1>
        
        <?php if (isset($message)): ?>
        <div class="message <?php echo $message['type']; ?>">
            <?php echo htmlspecialchars($message['text']); ?>
        </div>
        <?php if (isset($autoRedirect) && $autoRedirect): ?>
        <script>
            setTimeout(() => {
                window.location.href = 'index.php';
            }, 3000);
        </script>
        <?php endif; ?>
        <?php endif; ?>
        
        <form method="POST" id="setupForm">
            <input type="hidden" name="action" value="save_keys">
            
            <div class="section">
                <h2>LLM API キー設定</h2>
                
                <div class="form-group">
                    <label for="openai_key">OpenAI API Key</label>
                    <div class="input-group">
                        <input type="password" id="openai_key" name="openai_key" 
                               value="<?php echo htmlspecialchars($savedKeys['openai'] ?? ''); ?>"
                               placeholder="sk-...">
                        <button type="button" class="btn btn-test" onclick="testApi('openai')">
                            <span id="openai-test-text">テスト</span>
                        </button>
                    </div>
                    <div id="openai-result" class="test-result"></div>
                    <p class="help-text">
                        <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a> で取得
                    </p>
                </div>
                
                <div class="form-group">
                    <label for="anthropic_key">Anthropic API Key</label>
                    <div class="input-group">
                        <input type="password" id="anthropic_key" name="anthropic_key"
                               value="<?php echo htmlspecialchars($savedKeys['anthropic'] ?? ''); ?>"
                               placeholder="sk-ant-...">
                        <button type="button" class="btn btn-test" onclick="testApi('anthropic')">
                            <span id="anthropic-test-text">テスト</span>
                        </button>
                    </div>
                    <div id="anthropic-result" class="test-result"></div>
                    <p class="help-text">
                        <a href="https://console.anthropic.com/account/keys" target="_blank">Anthropic Console</a> で取得
                    </p>
                </div>
                
                <div class="form-group">
                    <label for="google_key">Google AI API Key</label>
                    <div class="input-group">
                        <input type="password" id="google_key" name="google_key"
                               value="<?php echo htmlspecialchars($savedKeys['google'] ?? ''); ?>"
                               placeholder="AIza...">
                        <button type="button" class="btn btn-test" onclick="testApi('google')">
                            <span id="google-test-text">テスト</span>
                        </button>
                    </div>
                    <div id="google-result" class="test-result"></div>
                    <p class="help-text">
                        <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a> で取得
                    </p>
                </div>
            </div>
            
            <div class="section">
                <h2>Google OAuth 設定（オプション）</h2>
                
                <div class="form-group">
                    <label for="google_client_id">Google Client ID</label>
                    <input type="text" id="google_client_id" name="google_client_id"
                           value="<?php echo htmlspecialchars($savedKeys['google_client_id'] ?? ''); ?>"
                           placeholder="xxxxx.apps.googleusercontent.com">
                </div>
                
                <div class="form-group">
                    <label for="google_client_secret">Google Client Secret</label>
                    <input type="password" id="google_client_secret" name="google_client_secret"
                           value="<?php echo htmlspecialchars($savedKeys['google_client_secret'] ?? ''); ?>"
                           placeholder="GOCSPX-...">
                </div>
            </div>
            
            <div class="actions">
                <button type="submit" class="btn btn-primary">設定を保存</button>
                <a href="index.php" class="btn btn-secondary">ホームに戻る</a>
            </div>
        </form>
    </div>
    
    <script>
        function testApi(provider) {
            const keyInput = document.getElementById(provider + '_key');
            const resultDiv = document.getElementById(provider + '-result');
            const testButton = document.getElementById(provider + '-test-text');
            const apiKey = keyInput.value.trim();
            
            if (!apiKey) {
                resultDiv.className = 'test-result error';
                resultDiv.textContent = 'APIキーを入力してください。';
                resultDiv.style.display = 'block';
                return;
            }
            
            // ローディング表示
            testButton.innerHTML = '<span class="spinner"></span>';
            resultDiv.style.display = 'none';
            
            // API疎通テスト
            fetch('setup.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `action=test_api&provider=${provider}&api_key=${encodeURIComponent(apiKey)}`
            })
            .then(response => response.json())
            .then(data => {
                testButton.textContent = 'テスト';
                resultDiv.className = 'test-result ' + (data.success ? 'success' : 'error');
                resultDiv.textContent = data.message;
                resultDiv.style.display = 'block';
            })
            .catch(error => {
                testButton.textContent = 'テスト';
                resultDiv.className = 'test-result error';
                resultDiv.textContent = 'テスト中にエラーが発生しました: ' + error.message;
                resultDiv.style.display = 'block';
            });
        }
        
        // パスワードフィールドの表示/非表示切り替え
        document.querySelectorAll('input[type="password"]').forEach(input => {
            input.addEventListener('focus', function() {
                this.type = 'text';
            });
            input.addEventListener('blur', function() {
                this.type = 'password';
            });
        });
    </script>
</body>
</html>