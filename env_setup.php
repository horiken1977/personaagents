<?php
/**
 * 環境変数読み込み設定
 * .envファイルがある場合は環境変数として読み込む
 */

function loadEnvironmentVariables() {
    $envFile = __DIR__ . '/.env';
    
    if (!file_exists($envFile)) {
        return false;
    }
    
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        // コメント行をスキップ
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // KEY=VALUE形式の行を処理
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // 既存の環境変数がない場合のみ設定
            if (!getenv($key)) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
    
    return true;
}

// 環境変数の読み込み実行
loadEnvironmentVariables();
?>