<?php
/**
 * カスタムエラーハンドラー
 * 全てのエラーをログに記録し、本番環境では詳細を隠す
 */

// カスタムエラーハンドラー
function customErrorHandler($severity, $message, $file, $line) {
    // エラーレポーティングの設定を確認
    if (!(error_reporting() & $severity)) {
        return false;
    }
    
    // エラーレベルの文字列を取得
    $errorLevels = [
        E_ERROR => 'ERROR',
        E_WARNING => 'WARNING',
        E_PARSE => 'PARSE',
        E_NOTICE => 'NOTICE',
        E_CORE_ERROR => 'CORE_ERROR',
        E_CORE_WARNING => 'CORE_WARNING',
        E_COMPILE_ERROR => 'COMPILE_ERROR',
        E_COMPILE_WARNING => 'COMPILE_WARNING',
        E_USER_ERROR => 'USER_ERROR',
        E_USER_WARNING => 'USER_WARNING',
        E_USER_NOTICE => 'USER_NOTICE',
        E_STRICT => 'STRICT',
        E_RECOVERABLE_ERROR => 'RECOVERABLE_ERROR',
        E_DEPRECATED => 'DEPRECATED',
        E_USER_DEPRECATED => 'USER_DEPRECATED'
    ];
    
    $errorLevel = $errorLevels[$severity] ?? 'UNKNOWN';
    
    // エラー詳細
    $errorDetails = [
        'timestamp' => date('Y-m-d H:i:s'),
        'level' => $errorLevel,
        'message' => $message,
        'file' => $file,
        'line' => $line,
        'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? ''
    ];
    
    // ログに記録
    logError($errorDetails);
    
    // 開発環境では詳細を表示
    if (defined('LOG_CONFIG') && LOG_CONFIG['debug_mode']) {
        echo "<div style='background:#f8d7da;color:#721c24;padding:15px;margin:10px;border-radius:5px;'>";
        echo "<strong>{$errorLevel}:</strong> {$message}<br>";
        echo "<small>File: {$file} (Line: {$line})</small>";
        echo "</div>";
    }
    
    // PHPの内部エラーハンドラーを実行しない
    return true;
}

// 例外ハンドラー
function customExceptionHandler($exception) {
    $errorDetails = [
        'timestamp' => date('Y-m-d H:i:s'),
        'level' => 'EXCEPTION',
        'message' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'trace' => $exception->getTraceAsString(),
        'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? ''
    ];
    
    // ログに記録
    logError($errorDetails);
    
    // エラーページを表示
    if (!headers_sent()) {
        http_response_code(500);
    }
    
    // 開発環境では詳細を表示
    if (defined('LOG_CONFIG') && LOG_CONFIG['debug_mode']) {
        echo "<div style='background:#f8d7da;color:#721c24;padding:15px;margin:10px;border-radius:5px;'>";
        echo "<strong>EXCEPTION:</strong> " . htmlspecialchars($exception->getMessage()) . "<br>";
        echo "<small>File: " . htmlspecialchars($exception->getFile()) . " (Line: {$exception->getLine()})</small><br>";
        echo "<pre style='margin-top:10px;font-size:12px;'>" . htmlspecialchars($exception->getTraceAsString()) . "</pre>";
        echo "</div>";
    } else {
        // 本番環境では一般的なエラーメッセージ
        include __DIR__ . '/error_500.html';
    }
}

// シャットダウンハンドラー（致命的エラーをキャッチ）
function shutdownHandler() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
        $errorDetails = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => 'FATAL',
            'message' => $error['message'],
            'file' => $error['file'],
            'line' => $error['line'],
            'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'ip' => $_SERVER['REMOTE_ADDR'] ?? ''
        ];
        
        // ログに記録
        logError($errorDetails);
    }
}

// エラーをログファイルに記録
function logError($errorDetails) {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    
    $logFile = $logDir . '/error_' . date('Y-m-d') . '.log';
    $logEntry = json_encode($errorDetails, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n---\n";
    
    @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// ハンドラーを登録
set_error_handler('customErrorHandler');
set_exception_handler('customExceptionHandler');
register_shutdown_function('shutdownHandler');
?>