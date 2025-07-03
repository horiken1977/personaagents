<?php
/**
 * 環境変数テスト用エンドポイント
 * APIキーが正しく読み込まれているかテスト
 */

require_once 'config.php';

header('Content-Type: text/plain');

echo "=== 環境変数テスト ===\n\n";

// 環境変数の直接確認
echo "OPENAI_API_KEY exists: " . (getenv('OPENAI_API_KEY') ? 'YES' : 'NO') . "\n";
echo "ANTHROPIC_API_KEY exists: " . (getenv('ANTHROPIC_API_KEY') ? 'YES' : 'NO') . "\n";
echo "GOOGLE_AI_API_KEY exists: " . (getenv('GOOGLE_AI_API_KEY') ? 'YES' : 'NO') . "\n";

if (getenv('OPENAI_API_KEY')) {
    echo "OPENAI_API_KEY prefix: " . substr(getenv('OPENAI_API_KEY'), 0, 10) . "...\n";
}
if (getenv('ANTHROPIC_API_KEY')) {
    echo "ANTHROPIC_API_KEY prefix: " . substr(getenv('ANTHROPIC_API_KEY'), 0, 10) . "...\n";
}
if (getenv('GOOGLE_AI_API_KEY')) {
    echo "GOOGLE_AI_API_KEY prefix: " . substr(getenv('GOOGLE_AI_API_KEY'), 0, 10) . "...\n";
}

echo "\n=== getApiKey関数テスト ===\n\n";

$providers = ['openai', 'claude', 'anthropic', 'gemini'];
foreach ($providers as $provider) {
    $key = getApiKey($provider);
    echo "Provider '$provider': " . ($key ? 'FOUND (' . substr($key, 0, 10) . '...)' : 'NOT FOUND') . "\n";
}

echo "\n=== .envファイル存在確認 ===\n\n";
echo ".env file exists: " . (file_exists(__DIR__ . '/.env') ? 'YES' : 'NO') . "\n";

if (file_exists(__DIR__ . '/.env')) {
    $content = file_get_contents(__DIR__ . '/.env');
    echo ".env file size: " . strlen($content) . " bytes\n";
    echo ".env contains OPENAI_API_KEY: " . (strpos($content, 'OPENAI_API_KEY') !== false ? 'YES' : 'NO') . "\n";
}
?>