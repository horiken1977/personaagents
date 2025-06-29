<?php
/**
 * 全テスト実行スクリプト
 * 全テストスイートを実行し、統合レポートを生成
 */

require_once __DIR__ . '/TestCase.php';

class TestRunner {
    private $testFiles = [];
    private $results = [];
    private $startTime;
    private $endTime;
    
    public function __construct() {
        $this->startTime = microtime(true);
        $this->loadTestFiles();
    }
    
    /**
     * テストファイルの読み込み
     */
    private function loadTestFiles() {
        $testDirectory = __DIR__;
        $files = glob($testDirectory . '/*Test.php');
        
        foreach ($files as $file) {
            if (basename($file) !== 'run_all_tests.php') {
                $this->testFiles[] = $file;
            }
        }
    }
    
    /**
     * 全テストの実行
     */
    public function runAllTests() {
        echo "==========================================\n";
        echo "北米市場調査AIエージェント - 全テスト実行\n";
        echo "==========================================\n\n";
        
        $this->ensureResultsDirectory();
        
        foreach ($this->testFiles as $testFile) {
            $testName = basename($testFile, '.php');
            echo "実行中: {$testName}\n";
            echo str_repeat("-", 40) . "\n";
            
            $result = $this->runSingleTest($testFile);
            $this->results[$testName] = $result;
            
            echo "\n";
        }
        
        $this->endTime = microtime(true);
        $this->generateSummaryReport();
        $this->generateJSONReport();
        $this->generateHTMLReport();
    }
    
    /**
     * 単一テストの実行
     */
    private function runSingleTest($testFile) {
        $startTime = microtime(true);
        
        // 出力バッファリングでテスト出力をキャプチャ
        ob_start();
        
        try {
            include $testFile;
            $output = ob_get_contents();
            $success = true;
            $error = null;
        } catch (Exception $e) {
            $output = ob_get_contents();
            $success = false;
            $error = $e->getMessage();
        } catch (Error $e) {
            $output = ob_get_contents();
            $success = false;
            $error = $e->getMessage();
        }
        
        ob_end_clean();
        
        $endTime = microtime(true);
        $executionTime = $endTime - $startTime;
        
        // テスト結果を解析
        $testStats = $this->parseTestOutput($output);
        
        return [
            'file' => basename($testFile),
            'success' => $success,
            'error' => $error,
            'execution_time' => $executionTime,
            'output' => $output,
            'stats' => $testStats
        ];
    }
    
    /**
     * テスト出力の解析
     */
    private function parseTestOutput($output) {
        $stats = [
            'total_tests' => 0,
            'passed_tests' => 0,
            'failed_tests' => 0,
            'success_rate' => 0
        ];
        
        // 出力からテスト統計を抽出
        if (preg_match('/総テスト数:\s*(\d+)/', $output, $matches)) {
            $stats['total_tests'] = intval($matches[1]);
        }
        
        if (preg_match('/成功:\s*(\d+)/', $output, $matches)) {
            $stats['passed_tests'] = intval($matches[1]);
        }
        
        if (preg_match('/失敗:\s*(\d+)/', $output, $matches)) {
            $stats['failed_tests'] = intval($matches[1]);
        }
        
        if (preg_match('/成功率:\s*([\d.]+)%/', $output, $matches)) {
            $stats['success_rate'] = floatval($matches[1]);
        }
        
        return $stats;
    }
    
    /**
     * サマリーレポートの生成
     */
    private function generateSummaryReport() {
        $totalTests = 0;
        $totalPassed = 0;
        $totalFailed = 0;
        $successfulSuites = 0;
        $totalExecutionTime = $this->endTime - $this->startTime;
        
        echo "==========================================\n";
        echo "テスト実行結果サマリー\n";
        echo "==========================================\n\n";
        
        foreach ($this->results as $testName => $result) {
            $status = $result['success'] ? '✅ 成功' : '❌ 失敗';
            $time = number_format($result['execution_time'], 3);
            
            echo sprintf("%-20s %s (%.3fs)\n", $testName, $status, $result['execution_time']);
            
            if ($result['stats']['total_tests'] > 0) {
                echo sprintf("  テスト: %d件 (成功: %d, 失敗: %d, 成功率: %.1f%%)\n", 
                    $result['stats']['total_tests'],
                    $result['stats']['passed_tests'],
                    $result['stats']['failed_tests'],
                    $result['stats']['success_rate']
                );
            }
            
            if (!$result['success'] && $result['error']) {
                echo "  エラー: " . $result['error'] . "\n";
            }
            
            echo "\n";
            
            $totalTests += $result['stats']['total_tests'];
            $totalPassed += $result['stats']['passed_tests'];
            $totalFailed += $result['stats']['failed_tests'];
            
            if ($result['success']) {
                $successfulSuites++;
            }
        }
        
        echo str_repeat("=", 40) . "\n";
        echo "全体統計:\n";
        echo "テストスイート: " . count($this->results) . "件 (成功: {$successfulSuites}件)\n";
        echo "総テスト数: {$totalTests}件\n";
        echo "成功: {$totalPassed}件\n";
        echo "失敗: {$totalFailed}件\n";
        
        if ($totalTests > 0) {
            $overallSuccessRate = ($totalPassed / $totalTests) * 100;
            echo "全体成功率: " . number_format($overallSuccessRate, 2) . "%\n";
        }
        
        echo "実行時間: " . number_format($totalExecutionTime, 3) . "秒\n";
        echo "実行日時: " . date('Y-m-d H:i:s') . "\n";
    }
    
    /**
     * JSONレポートの生成
     */
    private function generateJSONReport() {
        $reportData = [
            'test_run' => [
                'timestamp' => date('c'),
                'execution_time' => $this->endTime - $this->startTime,
                'total_suites' => count($this->results),
                'successful_suites' => count(array_filter($this->results, function($r) { return $r['success']; }))
            ],
            'environment' => [
                'php_version' => PHP_VERSION,
                'os' => PHP_OS,
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time')
            ],
            'test_results' => $this->results,
            'summary' => $this->calculateSummary()
        ];
        
        $jsonReport = json_encode($reportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $filename = __DIR__ . '/results/test_report_' . date('Y-m-d_H-i-s') . '.json';
        
        file_put_contents($filename, $jsonReport);
        echo "\nJSONレポートを保存: {$filename}\n";
    }
    
    /**
     * HTMLレポートの生成
     */
    private function generateHTMLReport() {
        $summary = $this->calculateSummary();
        $timestamp = date('Y-m-d H:i:s');
        
        $html = $this->generateHTMLTemplate($summary, $timestamp);
        $filename = __DIR__ . '/results/test_report_' . date('Y-m-d_H-i-s') . '.html';
        
        file_put_contents($filename, $html);
        echo "HTMLレポートを保存: {$filename}\n";
    }
    
    /**
     * サマリー統計の計算
     */
    private function calculateSummary() {
        $totalTests = 0;
        $totalPassed = 0;
        $totalFailed = 0;
        $successfulSuites = 0;
        
        foreach ($this->results as $result) {
            $totalTests += $result['stats']['total_tests'];
            $totalPassed += $result['stats']['passed_tests'];
            $totalFailed += $result['stats']['failed_tests'];
            
            if ($result['success']) {
                $successfulSuites++;
            }
        }
        
        return [
            'total_suites' => count($this->results),
            'successful_suites' => $successfulSuites,
            'total_tests' => $totalTests,
            'passed_tests' => $totalPassed,
            'failed_tests' => $totalFailed,
            'success_rate' => $totalTests > 0 ? ($totalPassed / $totalTests) * 100 : 0,
            'execution_time' => $this->endTime - $this->startTime
        ];
    }
    
    /**
     * HTMLテンプレートの生成
     */
    private function generateHTMLTemplate($summary, $timestamp) {
        $statusClass = $summary['failed_tests'] === 0 ? 'success' : 'warning';
        $statusIcon = $summary['failed_tests'] === 0 ? '✅' : '⚠️';
        
        $html = <<<HTML
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>テストレポート - 北米市場調査AIエージェント</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f6fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2rem; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9rem; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .test-results { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .test-suite { border-bottom: 1px solid #eee; padding: 15px 0; }
        .test-suite:last-child { border-bottom: none; }
        .suite-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .suite-name { font-weight: bold; font-size: 1.1rem; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
        .status-success { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .suite-stats { color: #666; font-size: 0.9rem; }
        .error-message { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-top: 10px; font-family: monospace; font-size: 0.8rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{$statusIcon} テストレポート</h1>
            <p>北米市場調査AIエージェント - 自動テスト結果</p>
            <p>実行日時: {$timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value {$statusClass}">{$summary['total_suites']}</div>
                <div class="metric-label">テストスイート</div>
            </div>
            <div class="metric">
                <div class="metric-value success">{$summary['passed_tests']}</div>
                <div class="metric-label">成功テスト</div>
            </div>
            <div class="metric">
                <div class="metric-value danger">{$summary['failed_tests']}</div>
                <div class="metric-label">失敗テスト</div>
            </div>
            <div class="metric">
                <div class="metric-value {$statusClass}">{$summary['success_rate']:.1f}%</div>
                <div class="metric-label">成功率</div>
            </div>
            <div class="metric">
                <div class="metric-value">{$summary['execution_time']:.3f}s</div>
                <div class="metric-label">実行時間</div>
            </div>
        </div>
        
        <div class="test-results">
            <h2>テストスイート詳細</h2>
HTML;
        
        foreach ($this->results as $testName => $result) {
            $suiteStatus = $result['success'] ? 'success' : 'failed';
            $statusBadge = $result['success'] ? 'status-success' : 'status-failed';
            $statusText = $result['success'] ? '成功' : '失敗';
            
            $html .= <<<HTML
            <div class="test-suite">
                <div class="suite-header">
                    <div class="suite-name">{$testName}</div>
                    <div class="status-badge {$statusBadge}">{$statusText}</div>
                </div>
                <div class="suite-stats">
                    実行時間: {$result['execution_time']:.3f}秒 | 
                    テスト数: {$result['stats']['total_tests']} | 
                    成功: {$result['stats']['passed_tests']} | 
                    失敗: {$result['stats']['failed_tests']}
HTML;
            
            if ($result['stats']['total_tests'] > 0) {
                $html .= " | 成功率: {$result['stats']['success_rate']:.1f}%";
            }
            
            $html .= "</div>";
            
            if (!$result['success'] && $result['error']) {
                $html .= "<div class=\"error-message\">エラー: " . htmlspecialchars($result['error']) . "</div>";
            }
            
            $html .= "</div>";
        }
        
        $html .= <<<HTML
        </div>
    </div>
</body>
</html>
HTML;
        
        return $html;
    }
    
    /**
     * 結果ディレクトリの確保
     */
    private function ensureResultsDirectory() {
        $resultsDir = __DIR__ . '/results';
        if (!is_dir($resultsDir)) {
            mkdir($resultsDir, 0755, true);
        }
    }
    
    /**
     * カバレッジレポートの生成（将来実装）
     */
    private function generateCoverageReport() {
        // PHPUnit や Xdebug を使用したコードカバレッジの実装
        // 現在は placeholder
        echo "コードカバレッジレポート生成機能は今後実装予定です。\n";
    }
    
    /**
     * パフォーマンス指標の生成
     */
    public function generatePerformanceMetrics() {
        $metrics = [
            'memory_usage' => [
                'peak' => memory_get_peak_usage(true),
                'current' => memory_get_usage(true)
            ],
            'execution_time' => $this->endTime - $this->startTime,
            'test_speed' => [],
            'system_info' => [
                'php_version' => PHP_VERSION,
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time')
            ]
        ];
        
        foreach ($this->results as $testName => $result) {
            if ($result['stats']['total_tests'] > 0) {
                $metrics['test_speed'][$testName] = $result['execution_time'] / $result['stats']['total_tests'];
            }
        }
        
        return $metrics;
    }
}

// メイン実行
if (basename($_SERVER['PHP_SELF']) === 'run_all_tests.php') {
    $runner = new TestRunner();
    $runner->runAllTests();
    
    // パフォーマンス指標の出力
    $metrics = $runner->generatePerformanceMetrics();
    echo "\n==========================================\n";
    echo "パフォーマンス指標\n";
    echo "==========================================\n";
    echo "ピークメモリ使用量: " . number_format($metrics['memory_usage']['peak'] / 1024 / 1024, 2) . " MB\n";
    echo "現在メモリ使用量: " . number_format($metrics['memory_usage']['current'] / 1024 / 1024, 2) . " MB\n";
    echo "総実行時間: " . number_format($metrics['execution_time'], 3) . " 秒\n";
    
    if (!empty($metrics['test_speed'])) {
        echo "\nテストスイート別実行速度:\n";
        foreach ($metrics['test_speed'] as $suite => $speed) {
            echo "  {$suite}: " . number_format($speed * 1000, 2) . " ms/test\n";
        }
    }
    
    echo "\n✅ 全テスト実行完了\n";
}
?>