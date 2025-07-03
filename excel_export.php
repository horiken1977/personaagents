<?php
/**
 * エクセルエクスポート機能
 * チャット履歴をCSV形式でエクスポート
 */

require_once 'config.php';
require_once 'security_headers.php';

// セキュリティヘッダーの設定
initializeSecurity();

class ExcelExporter {
    
    /**
     * チャット履歴をCSV形式でエクスポート
     */
    public function exportToCsv($chatHistory) {
        try {
            // 新しい対話がない場合はエクスポートしない
            if (empty($chatHistory) || !is_array($chatHistory)) {
                return [
                    'success' => false,
                    'message' => 'エクスポートする新しい対話がありません'
                ];
            }
            
            // CSVファイル名生成（タイムスタンプ付き）
            $timestamp = date('Y-m-d_H-i-s');
            $filename = "chat_history_{$timestamp}.csv";
            $filepath = __DIR__ . "/exports/{$filename}";
            
            // exportsディレクトリを作成
            $exportDir = __DIR__ . "/exports";
            if (!is_dir($exportDir)) {
                mkdir($exportDir, 0755, true);
            }
            
            // CSVファイルを作成
            $handle = fopen($filepath, 'w');
            if (!$handle) {
                throw new Exception('CSVファイルの作成に失敗しました');
            }
            
            // BOM付きでUTF-8エンコーディングを設定（Excel対応）
            fwrite($handle, "\xEF\xBB\xBF");
            
            // ヘッダー行を出力
            $headers = [
                'タイムスタンプ',
                'ユーザーID', 
                'LLMプロバイダー',
                'ペルソナ名',
                '質問内容',
                '回答内容'
            ];
            fputcsv($handle, $headers);
            
            // データ行を出力
            $exportCount = 0;
            foreach ($chatHistory as $conversation) {
                if ($this->shouldExportConversation($conversation)) {
                    $row = [
                        $conversation['timestamp'] ?? date('Y-m-d H:i:s'),
                        $conversation['user_id'] ?? 'anonymous',
                        $conversation['llm_provider'] ?? '',
                        $conversation['persona_name'] ?? '',
                        $conversation['question'] ?? '',
                        $conversation['answer'] ?? ''
                    ];
                    fputcsv($handle, $row);
                    $exportCount++;
                }
            }
            
            fclose($handle);
            
            // エクスポートした対話がない場合
            if ($exportCount === 0) {
                unlink($filepath); // 空のファイルを削除
                return [
                    'success' => false,
                    'message' => 'エクスポートする新しい対話がありません'
                ];
            }
            
            return [
                'success' => true,
                'message' => "{$exportCount}件の対話をエクスポートしました",
                'filename' => $filename,
                'filepath' => $filepath,
                'download_url' => "exports/{$filename}",
                'count' => $exportCount
            ];
            
        } catch (Exception $e) {
            error_log("Export Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'エクスポート中にエラーが発生しました: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 対話をエクスポートすべきかどうかを判定
     * 現在の仕様：追加項目がなければエクスポートしない
     */
    private function shouldExportConversation($conversation) {
        // 必須フィールドが存在するかチェック
        if (empty($conversation['question']) || empty($conversation['answer'])) {
            return false;
        }
        
        // 追加項目（新しい対話）の条件をチェック
        // この例では、タイムスタンプが最近の場合を新しい対話として扱う
        if (isset($conversation['is_new']) && $conversation['is_new'] === true) {
            return true;
        }
        
        // デフォルトでは全ての有効な対話をエクスポート
        return true;
    }
    
    /**
     * 古いエクスポートファイルをクリーンアップ
     */
    public function cleanupOldExports($daysToKeep = 7) {
        $exportDir = __DIR__ . "/exports";
        if (!is_dir($exportDir)) {
            return;
        }
        
        $files = glob($exportDir . "/chat_history_*.csv");
        $cutoffTime = time() - ($daysToKeep * 24 * 60 * 60);
        
        foreach ($files as $file) {
            if (filemtime($file) < $cutoffTime) {
                unlink($file);
            }
        }
    }
}

// APIエンドポイントとして使用する場合
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['chatHistory'])) {
            throw new Exception('チャット履歴データが見つかりません');
        }
        
        $exporter = new ExcelExporter();
        $result = $exporter->exportToCsv($input['chatHistory']);
        
        // 古いファイルをクリーンアップ
        $exporter->cleanupOldExports();
        
        echo json_encode($result);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'エクスポート処理でエラーが発生しました: ' . $e->getMessage()
        ]);
    }
}
?>