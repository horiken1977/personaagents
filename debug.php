<?php
// エラー表示を有効化
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>PHP Debug Information</h1>";

// PHPバージョン
echo "<h2>PHP Version</h2>";
echo phpversion();

// ディレクトリ情報
echo "<h2>Directory Information</h2>";
echo "Current Directory: " . __DIR__ . "<br>";
echo "Script Name: " . $_SERVER['SCRIPT_NAME'] . "<br>";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "<br>";

// ファイルの存在確認
echo "<h2>File Check</h2>";
$files = ['config.php', '.env', 'index.html', 'api.php'];
foreach ($files as $file) {
    echo "$file: " . (file_exists(__DIR__ . '/' . $file) ? "EXISTS" : "NOT FOUND") . "<br>";
}

// ディレクトリの権限確認
echo "<h2>Directory Permissions</h2>";
$dirs = ['.', 'logs'];
foreach ($dirs as $dir) {
    $path = __DIR__ . '/' . $dir;
    if (file_exists($path)) {
        echo "$dir: " . substr(sprintf('%o', fileperms($path)), -4) . "<br>";
    }
}

// logsディレクトリの書き込み可能性
echo "<h2>Logs Directory</h2>";
$logsDir = __DIR__ . '/logs';
echo "Logs directory exists: " . (is_dir($logsDir) ? "YES" : "NO") . "<br>";
echo "Logs directory writable: " . (is_writable($logsDir) ? "YES" : "NO") . "<br>";

// 環境変数
echo "<h2>Environment Variables (API Keys)</h2>";
$envVars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_AI_API_KEY'];
foreach ($envVars as $var) {
    $value = getenv($var);
    echo "$var: " . ($value ? "SET (length: " . strlen($value) . ")" : "NOT SET") . "<br>";
}

// configファイルの読み込みテスト
echo "<h2>Config File Test</h2>";
try {
    require_once 'config.php';
    echo "config.php loaded successfully<br>";
    echo "LOG_CONFIG defined: " . (defined('LOG_CONFIG') ? "YES" : "NO") . "<br>";
    echo "GOOGLE_API_CONFIG defined: " . (defined('GOOGLE_API_CONFIG') ? "YES" : "NO") . "<br>";
} catch (Exception $e) {
    echo "Error loading config.php: " . $e->getMessage() . "<br>";
} catch (ParseError $e) {
    echo "Parse Error in config.php: " . $e->getMessage() . "<br>";
}
?>