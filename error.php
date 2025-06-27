<?php
/**
 * エラーページ表示
 * カスタムエラーページの生成
 */

require_once 'config.php';

$errorCode = $_GET['code'] ?? '500';
$requestUri = $_SERVER['REQUEST_URI'] ?? '';

// エラーメッセージの定義
$errorMessages = [
    '400' => [
        'title' => '不正なリクエスト',
        'message' => 'リクエストの形式が正しくありません。',
        'description' => 'パラメータやリクエスト内容を確認してください。'
    ],
    '401' => [
        'title' => '認証が必要です',
        'message' => 'このページにアクセスするには認証が必要です。',
        'description' => 'ログインまたはAPIキーを設定してください。'
    ],
    '403' => [
        'title' => 'アクセスが拒否されました',
        'message' => 'このリソースへのアクセス権限がありません。',
        'description' => '管理者にお問い合わせください。'
    ],
    '404' => [
        'title' => 'ページが見つかりません',
        'message' => 'お探しのページは存在しません。',
        'description' => 'URLを確認するか、ホームページから再度アクセスしてください。'
    ],
    '429' => [
        'title' => 'リクエストが多すぎます',
        'message' => 'レート制限に達しました。',
        'description' => 'しばらく時間をおいてから再度お試しください。'
    ],
    '500' => [
        'title' => 'サーバーエラー',
        'message' => 'サーバー内部でエラーが発生しました。',
        'description' => '一時的な問題の可能性があります。しばらく時間をおいてから再度お試しください。'
    ],
    '503' => [
        'title' => 'サービス利用不可',
        'message' => 'サービスが一時的に利用できません。',
        'description' => 'メンテナンス中または高負荷のため、しばらく時間をおいてから再度お試しください。'
    ]
];

$error = $errorMessages[$errorCode] ?? $errorMessages['500'];

// HTTPステータスコードの設定
http_response_code(intval($errorCode));

// エラーログの記録
writeLog("Error {$errorCode}: {$requestUri} - User-Agent: " . ($_SERVER['HTTP_USER_AGENT'] ?? 'unknown'), 'ERROR');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>エラー <?php echo htmlspecialchars($errorCode); ?> | 北米市場調査AIエージェント</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
        }

        .error-container {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
            margin: 20px;
        }

        .error-code {
            font-size: 8rem;
            font-weight: 900;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1;
            margin-bottom: 20px;
        }

        .error-title {
            font-size: 2rem;
            color: #2c3e50;
            margin-bottom: 15px;
            font-weight: 600;
        }

        .error-message {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 20px;
            line-height: 1.6;
        }

        .error-description {
            color: #888;
            margin-bottom: 40px;
            line-height: 1.6;
        }

        .error-actions {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn {
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
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
            color: #333;
        }

        .error-details {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e1e8ed;
            font-size: 0.9rem;
            color: #999;
        }

        .help-links {
            margin-top: 30px;
        }

        .help-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 15px;
            font-weight: 500;
        }

        .help-links a:hover {
            text-decoration: underline;
        }

        @media (max-width: 768px) {
            .error-container {
                padding: 40px 20px;
                margin: 10px;
            }

            .error-code {
                font-size: 6rem;
            }

            .error-title {
                font-size: 1.5rem;
            }

            .error-actions {
                flex-direction: column;
                align-items: center;
            }

            .btn {
                width: 100%;
                max-width: 250px;
            }
        }

        .icon {
            font-size: 1.2rem;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-code"><?php echo htmlspecialchars($errorCode); ?></div>
        <h1 class="error-title"><?php echo htmlspecialchars($error['title']); ?></h1>
        <p class="error-message"><?php echo htmlspecialchars($error['message']); ?></p>
        <p class="error-description"><?php echo htmlspecialchars($error['description']); ?></p>

        <div class="error-actions">
            <a href="index.html" class="btn btn-primary">
                <span class="icon">🏠</span>
                ホームに戻る
            </a>
            <button onclick="history.back()" class="btn btn-secondary">
                <span class="icon">←</span>
                前のページに戻る
            </button>
        </div>

        <?php if ($errorCode === '404'): ?>
        <div class="help-links">
            <p>お探しのページが見つからない場合：</p>
            <a href="index.html">ペルソナ選択</a>
            <a href="README.md">ヘルプ</a>
        </div>
        <?php endif; ?>

        <?php if ($errorCode === '500' || $errorCode === '503'): ?>
        <div class="help-links">
            <p>問題が続く場合は：</p>
            <a href="#" onclick="checkSystemStatus()">システム状況確認</a>
            <a href="mailto:support@example.com">サポートに連絡</a>
        </div>
        <?php endif; ?>

        <div class="error-details">
            <p>エラーコード: <?php echo htmlspecialchars($errorCode); ?></p>
            <p>タイムスタンプ: <?php echo date('Y-m-d H:i:s'); ?></p>
            <?php if (LOG_CONFIG['debug_mode']): ?>
            <p>リクエストURI: <?php echo htmlspecialchars($requestUri); ?></p>
            <?php endif; ?>
        </div>
    </div>

    <script>
        // システム状況確認
        function checkSystemStatus() {
            fetch('/api.php/health')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'healthy') {
                        alert('システムは正常に動作しています。ページを再読み込みしてみてください。');
                        location.reload();
                    } else {
                        alert('システムに問題が発生している可能性があります。しばらく時間をおいてから再度お試しください。');
                    }
                })
                .catch(error => {
                    alert('システム状況を確認できませんでした。しばらく時間をおいてから再度お試しください。');
                });
        }

        // 自動再試行（5xx エラーの場合）
        <?php if (in_array($errorCode, ['500', '502', '503'])): ?>
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 5000; // 5秒

        function autoRetry() {
            if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(() => {
                    console.log(`自動再試行 ${retryCount}/${maxRetries}`);
                    location.reload();
                }, retryDelay * retryCount);
            }
        }

        // 30秒後に自動再試行開始
        setTimeout(autoRetry, 30000);
        <?php endif; ?>

        // エラー報告（開発環境）
        <?php if (LOG_CONFIG['debug_mode']): ?>
        console.error('Error Details:', {
            code: '<?php echo $errorCode; ?>',
            message: '<?php echo addslashes($error['message']); ?>',
            uri: '<?php echo addslashes($requestUri); ?>',
            timestamp: '<?php echo date('c'); ?>',
            userAgent: navigator.userAgent
        });
        <?php endif; ?>
    </script>
</body>
</html>