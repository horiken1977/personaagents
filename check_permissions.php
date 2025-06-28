<?php
// ファイル権限チェックスクリプト

echo "<h2>File Permissions Check</h2>";

$files = [
    'api_keys.json',
    'logs',
    'config.php',
    'setup.php'
];

foreach ($files as $file) {
    $path = __DIR__ . '/' . $file;
    echo "<h3>$file</h3>";
    
    if (file_exists($path)) {
        echo "Exists: YES<br>";
        echo "Readable: " . (is_readable($path) ? "YES" : "NO") . "<br>";
        echo "Writable: " . (is_writable($path) ? "YES" : "NO") . "<br>";
        echo "Permissions: " . substr(sprintf('%o', fileperms($path)), -4) . "<br>";
        
        if ($file === 'api_keys.json') {
            echo "Content: <pre>" . htmlspecialchars(file_get_contents($path)) . "</pre>";
        }
    } else {
        echo "Exists: NO<br>";
        
        // api_keys.jsonが存在しない場合は作成
        if ($file === 'api_keys.json') {
            $defaultContent = json_encode([
                'openai' => '',
                'anthropic' => '',
                'google' => '',
                'google_client_id' => '',
                'google_client_secret' => ''
            ], JSON_PRETTY_PRINT);
            
            if (file_put_contents($path, $defaultContent)) {
                echo "Created successfully<br>";
                chmod($path, 0644);
            } else {
                echo "Failed to create<br>";
            }
        }
    }
    echo "<hr>";
}
?>