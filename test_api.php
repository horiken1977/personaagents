<?php
// API動作テストページ
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>API Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-section { margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 5px; }
        .success { color: green; }
        .error { color: red; }
        pre { background: #e9ecef; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>API Configuration Test</h1>
    
    <div class="test-section">
        <h2>1. API Keys File</h2>
        <?php
        $apiKeysFile = __DIR__ . '/api_keys.json';
        if (file_exists($apiKeysFile)) {
            $keys = json_decode(file_get_contents($apiKeysFile), true);
            echo '<p class="success">✓ api_keys.json exists</p>';
            echo '<pre>' . json_encode($keys, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . '</pre>';
            
            // APIキーの存在確認
            echo '<h3>API Key Status:</h3>';
            echo '<ul>';
            echo '<li>OpenAI: ' . (!empty($keys['openai']) ? '<span class="success">✓ Set</span>' : '<span class="error">✗ Not set</span>') . '</li>';
            echo '<li>Anthropic: ' . (!empty($keys['anthropic']) ? '<span class="success">✓ Set</span>' : '<span class="error">✗ Not set</span>') . '</li>';
            echo '<li>Google: ' . (!empty($keys['google']) ? '<span class="success">✓ Set</span>' : '<span class="error">✗ Not set</span>') . '</li>';
            echo '<li>Google Client ID: ' . (!empty($keys['google_client_id']) ? '<span class="success">✓ Set</span>' : '<span class="error">✗ Not set</span>') . '</li>';
            echo '<li>Google Client Secret: ' . (!empty($keys['google_client_secret']) ? '<span class="success">✓ Set</span>' : '<span class="error">✗ Not set</span>') . '</li>';
            echo '</ul>';
        } else {
            echo '<p class="error">✗ api_keys.json does not exist</p>';
        }
        ?>
    </div>
    
    <div class="test-section">
        <h2>2. API Key Retrieval Test</h2>
        <?php
        $providers = ['openai', 'claude', 'gemini'];
        foreach ($providers as $provider) {
            $key = getApiKey($provider);
            echo "<p>$provider: " . ($key ? '<span class="success">✓ Key retrieved</span>' : '<span class="error">✗ No key</span>') . "</p>";
        }
        ?>
    </div>
    
    <div class="test-section">
        <h2>3. Google API Configuration</h2>
        <?php
        $googleConfig = GOOGLE_API_CONFIG;
        echo '<pre>' . json_encode($googleConfig, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . '</pre>';
        ?>
    </div>
    
    <div class="test-section">
        <h2>4. API Endpoint Test</h2>
        <button onclick="testAPI()">Test API Endpoint</button>
        <div id="api-result"></div>
    </div>
    
    <div class="test-section">
        <h2>5. Directory Permissions</h2>
        <?php
        $dirs = ['.', 'logs', dirname($apiKeysFile)];
        foreach ($dirs as $dir) {
            $path = $dir === dirname($apiKeysFile) ? $dir : __DIR__ . '/' . $dir;
            echo "<p>$dir: ";
            if (is_writable($path)) {
                echo '<span class="success">✓ Writable</span>';
            } else {
                echo '<span class="error">✗ Not writable</span>';
            }
            echo '</p>';
        }
        ?>
    </div>
    
    <p><a href="setup.php">Go to Setup</a> | <a href="index.php">Go to Home</a></p>
    
    <script>
    function testAPI() {
        const resultDiv = document.getElementById('api-result');
        resultDiv.innerHTML = '<p>Testing API endpoint...</p>';
        
        // Test GET request for Google config
        fetch('/persona/api.php?action=get_google_config')
            .then(response => response.json())
            .then(data => {
                resultDiv.innerHTML = '<h4>Google Config Response:</h4><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                
                // Test POST request
                return fetch('/persona/api.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        test: true,
                        provider: 'openai',
                        prompt: 'test'
                    })
                });
            })
            .then(response => response.json())
            .then(data => {
                resultDiv.innerHTML += '<h4>POST Test Response:</h4><pre>' + JSON.stringify(data, null, 2) + '</pre>';
            })
            .catch(error => {
                resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
            });
    }
    </script>
</body>
</html>