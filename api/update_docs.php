<?php
/**
 * チャット内容から設計書を自動更新するAPI
 */

require_once '../config.php';
require_once '../security_headers.php';

class DocumentAutoUpdater {
    private $patterns = [
        'features' => [
            '/追加した機能[:：]\s*(.+)/i',
            '/実装(?:した|完了)[:：]\s*(.+)/i',
            '/新機能[:：]\s*(.+)/i',
            '/feat[:：]\s*(.+)/i'
        ],
        'environment' => [
            '/環境変数[:：]\s*(.+)/i',
            '/設定(?:した|追加)[:：]\s*(.+)/i',
            '/config[:：]\s*(.+)/i',
            '/デプロイ先[:：]\s*(.+)/i'
        ],
        'tests' => [
            '/テスト(?:追加|実装|作成)[:：]\s*(.+)/i',
            '/test[:：]\s*(.+)/i',
            '/動作確認[:：]\s*(.+)/i'
        ],
        'api' => [
            '/API(?:追加|変更|更新)[:：]\s*(.+)/i',
            '/エンドポイント[:：]\s*(.+)/i',
            '/route[:：]\s*(.+)/i'
        ]
    ];
    
    /**
     * チャットメッセージから情報を抽出
     */
    public function extractFromMessage($message) {
        $updates = [
            'features' => [],
            'environment' => [],
            'tests' => [],
            'api' => []
        ];
        
        foreach ($this->patterns as $category => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match_all($pattern, $message, $matches)) {
                    foreach ($matches[1] as $match) {
                        $updates[$category][] = [
                            'content' => trim($match),
                            'timestamp' => date('Y-m-d H:i:s'),
                            'category' => $category
                        ];
                    }
                }
            }
        }
        
        return $updates;
    }
    
    /**
     * 更新情報をJSONファイルに保存
     */
    public function saveUpdates($updates) {
        $updateFile = __DIR__ . '/../docs/updates.json';
        
        // 既存の更新を読み込み
        $existingUpdates = [];
        if (file_exists($updateFile)) {
            $existingUpdates = json_decode(file_get_contents($updateFile), true) ?: [];
        }
        
        // 新しい更新を追加
        foreach ($updates as $category => $items) {
            if (!isset($existingUpdates[$category])) {
                $existingUpdates[$category] = [];
            }
            $existingUpdates[$category] = array_merge($existingUpdates[$category], $items);
        }
        
        // 保存
        file_put_contents($updateFile, json_encode($existingUpdates, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        return true;
    }
    
    /**
     * 設計書HTMLを自動生成
     */
    public function generateDocumentation() {
        $updateFile = __DIR__ . '/../docs/updates.json';
        if (!file_exists($updateFile)) {
            return false;
        }
        
        $updates = json_decode(file_get_contents($updateFile), true);
        
        // 自動生成セクションを作成
        $html = $this->generateUpdateSection($updates);
        
        // 既存の設計書に挿入
        $this->updateDesignDocument($html);
        
        return true;
    }
    
    private function generateUpdateSection($updates) {
        $html = '<div class="auto-updates">';
        $html .= '<h2>自動抽出された更新情報</h2>';
        $html .= '<p class="update-notice">※ この情報はチャット履歴から自動的に抽出されました</p>';
        
        if (!empty($updates['features'])) {
            $html .= '<h3>機能追加</h3><ul>';
            foreach ($updates['features'] as $feature) {
                $html .= '<li>' . htmlspecialchars($feature['content']) . 
                        ' <span class="timestamp">(' . $feature['timestamp'] . ')</span></li>';
            }
            $html .= '</ul>';
        }
        
        if (!empty($updates['api'])) {
            $html .= '<h3>API更新</h3><ul>';
            foreach ($updates['api'] as $api) {
                $html .= '<li>' . htmlspecialchars($api['content']) . 
                        ' <span class="timestamp">(' . $api['timestamp'] . ')</span></li>';
            }
            $html .= '</ul>';
        }
        
        if (!empty($updates['environment'])) {
            $html .= '<h3>環境設定</h3><ul>';
            foreach ($updates['environment'] as $env) {
                $html .= '<li>' . htmlspecialchars($env['content']) . 
                        ' <span class="timestamp">(' . $env['timestamp'] . ')</span></li>';
            }
            $html .= '</ul>';
        }
        
        $html .= '</div>';
        
        return $html;
    }
    
    private function updateDesignDocument($newContent) {
        $designFile = __DIR__ . '/../docs/auto_generated_updates.html';
        
        $template = '<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>自動更新された設計情報</title>
    <style>
        .auto-updates { 
            background: #f0f8ff; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
        }
        .update-notice { 
            color: #666; 
            font-style: italic; 
        }
        .timestamp { 
            color: #999; 
            font-size: 0.9em; 
        }
    </style>
</head>
<body>
    ' . $newContent . '
</body>
</html>';
        
        file_put_contents($designFile, $template);
    }
}

// APIエンドポイント処理
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['message'])) {
        $updater = new DocumentAutoUpdater();
        
        // メッセージから情報を抽出
        $updates = $updater->extractFromMessage($input['message']);
        
        // 更新を保存
        if (!empty(array_filter($updates))) {
            $updater->saveUpdates($updates);
            $updater->generateDocumentation();
            
            echo json_encode([
                'success' => true,
                'extracted' => $updates,
                'message' => '設計書の更新情報を記録しました'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => '更新情報が見つかりませんでした'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'メッセージが提供されていません'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'error' => 'POSTメソッドのみ対応'
    ]);
}
?>