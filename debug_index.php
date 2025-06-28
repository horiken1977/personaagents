<?php
// デバッグ用のindex.php
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Debug Index</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .debug-info { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>Index.php Debug Information</h1>
    
    <div class="debug-info">
        <h2>API Keys Check</h2>
        <?php
        $providers = ['openai', 'claude', 'gemini'];
        $hasApiKeys = false;
        
        foreach ($providers as $provider) {
            $key = getApiKey($provider);
            $hasKey = !empty($key);
            if ($hasKey) {
                $hasApiKeys = true;
            }
            
            echo "<p>$provider: ";
            if ($hasKey) {
                echo '<span class="success">✓ Key found (length: ' . strlen($key) . ')</span>';
            } else {
                echo '<span class="error">✗ No key found</span>';
            }
            echo "</p>";
        }
        
        echo "<p><strong>Overall result: ";
        if ($hasApiKeys) {
            echo '<span class="success">Has API Keys - Should redirect to index.html</span>';
        } else {
            echo '<span class="error">No API Keys - Should redirect to setup.php</span>';
        }
        echo "</strong></p>";
        ?>
    </div>
    
    <div class="debug-info">
        <h2>File Check</h2>
        <?php
        $files = [
            'api_keys.json' => __DIR__ . '/api_keys.json',
            'index.html' => __DIR__ . '/index.html',
            'setup.php' => __DIR__ . '/setup.php'
        ];
        
        foreach ($files as $name => $path) {
            echo "<p>$name: ";
            if (file_exists($path)) {
                echo '<span class="success">✓ Exists</span>';
                if ($name === 'api_keys.json') {
                    $content = file_get_contents($path);
                    $data = json_decode($content, true);
                    echo ' - Content preview: <pre style="font-size:12px;">' . 
                         htmlspecialchars(json_encode($data, JSON_PRETTY_PRINT)) . '</pre>';
                }
            } else {
                echo '<span class="error">✗ Not found</span>';
            }
            echo "</p>";
        }
        ?>
    </div>
    
    <div class="debug-info">
        <h2>Actions</h2>
        <p><a href="setup.php">Go to Setup</a></p>
        <p><a href="index.html">Go to Index.html</a></p>
        <p><a href="test_api.php">Go to API Test</a></p>
    </div>
    
    <div class="debug-info">
        <h2>Simulate Normal Flow</h2>
        <?php
        if ($hasApiKeys) {
            echo '<p class="success">Normal flow would redirect to index.html</p>';
            echo '<p><a href="index.html" style="background:#28a745;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Proceed to Main Page</a></p>';
        } else {
            echo '<p class="error">Normal flow would redirect to setup.php</p>';
            echo '<p><a href="setup.php" style="background:#dc3545;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Go to Setup</a></p>';
        }
        ?>
    </div>
</body>
</html>