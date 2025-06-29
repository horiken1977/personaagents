<?php
// 設定ファイルを読み込み
require_once 'config.php';

// APIキーが設定されているかチェック
$hasApiKeys = false;
$providers = ['openai', 'claude', 'gemini'];
foreach ($providers as $provider) {
    if (getApiKey($provider)) {
        $hasApiKeys = true;
        break;
    }
}

// APIキーが設定されていない場合はセットアップページへ
if (!$hasApiKeys) {
    header("Location: setup.php");
    exit();
}

// 通常のindex.htmlへリダイレクト
header("Location: index.html");
exit();
?>