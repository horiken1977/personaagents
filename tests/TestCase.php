<?php
/**
 * ベーステストケースクラス
 * 共通テスト機能とセットアップを提供
 */

class TestCase {
    protected $testName;
    protected $errors = [];
    protected $passes = [];
    
    public function __construct($testName = '') {
        $this->testName = $testName;
    }
    
    /**
     * アサーション: 等価性チェック
     */
    protected function assertEquals($expected, $actual, $message = '') {
        $testName = $this->testName . '::assertEquals';
        
        if ($expected === $actual) {
            $this->passes[] = $testName . ($message ? " - {$message}" : '');
            return true;
        } else {
            $this->errors[] = $testName . " - Expected: " . var_export($expected, true) . 
                            ", Actual: " . var_export($actual, true) . 
                            ($message ? " ({$message})" : '');
            return false;
        }
    }
    
    /**
     * アサーション: 真偽値チェック
     */
    protected function assertTrue($condition, $message = '') {
        $testName = $this->testName . '::assertTrue';
        
        if ($condition === true) {
            $this->passes[] = $testName . ($message ? " - {$message}" : '');
            return true;
        } else {
            $this->errors[] = $testName . " - Expected true, got " . var_export($condition, true) . 
                            ($message ? " ({$message})" : '');
            return false;
        }
    }
    
    /**
     * アサーション: 偽値チェック
     */
    protected function assertFalse($condition, $message = '') {
        $testName = $this->testName . '::assertFalse';
        
        if ($condition === false) {
            $this->passes[] = $testName . ($message ? " - {$message}" : '');
            return true;
        } else {
            $this->errors[] = $testName . " - Expected false, got " . var_export($condition, true) . 
                            ($message ? " ({$message})" : '');
            return false;
        }
    }
    
    /**
     * アサーション: null値チェック
     */
    protected function assertNull($actual, $message = '') {
        $testName = $this->testName . '::assertNull';
        
        if ($actual === null) {
            $this->passes[] = $testName . ($message ? " - {$message}" : '');
            return true;
        } else {
            $this->errors[] = $testName . " - Expected null, got " . var_export($actual, true) . 
                            ($message ? " ({$message})" : '');
            return false;
        }
    }
    
    /**
     * アサーション: 配列内容チェック
     */
    protected function assertArrayHasKey($key, $array, $message = '') {
        $testName = $this->testName . '::assertArrayHasKey';
        
        if (is_array($array) && array_key_exists($key, $array)) {
            $this->passes[] = $testName . ($message ? " - {$message}" : '');
            return true;
        } else {
            $this->errors[] = $testName . " - Key '{$key}' not found in array" . 
                            ($message ? " ({$message})" : '');
            return false;
        }
    }
    
    /**
     * アサーション: 例外発生チェック
     */
    protected function expectException($callback, $expectedExceptionClass = 'Exception', $message = '') {
        $testName = $this->testName . '::expectException';
        
        try {
            $callback();
            $this->errors[] = $testName . " - Expected exception {$expectedExceptionClass} was not thrown" . 
                            ($message ? " ({$message})" : '');
            return false;
        } catch (Exception $e) {
            if (get_class($e) === $expectedExceptionClass || is_subclass_of($e, $expectedExceptionClass)) {
                $this->passes[] = $testName . " - {$expectedExceptionClass} thrown as expected" . 
                                ($message ? " ({$message})" : '');
                return true;
            } else {
                $this->errors[] = $testName . " - Expected {$expectedExceptionClass}, got " . get_class($e) . 
                                ($message ? " ({$message})" : '');
                return false;
            }
        }
    }
    
    /**
     * HTTP レスポンスのシミュレーション
     */
    protected function simulateHttpRequest($url, $method = 'GET', $data = null) {
        // テスト用のHTTPリクエストシミュレーション
        return [
            'url' => $url,
            'method' => $method,
            'data' => $data,
            'timestamp' => time()
        ];
    }
    
    /**
     * モックデータの生成
     */
    protected function generateMockPersona($id = 1) {
        return [
            'id' => $id,
            'name' => 'Test Persona',
            'age' => 30,
            'segment' => 'Test Segment',
            'location' => 'Test Location',
            'household_income' => '$50,000',
            'family_status' => 'Test Family',
            'cooking_frequency' => 'Test Frequency',
            'health_concerns' => 'Test Health',
            'shopping_behavior' => 'Test Shopping',
            'food_preferences' => 'Test Food',
            'condiment_usage' => 'Test Condiment',
            'price_sensitivity' => 'Test Price',
            'key_motivations' => 'Test Motivations',
            'pain_points' => 'Test Pain Points',
            'japanese_food_exposure' => 'Test Japanese Food',
            'purchase_drivers' => 'Test Purchase'
        ];
    }
    
    /**
     * テスト用の一時ファイル作成
     */
    protected function createTempFile($content = '', $extension = '.tmp') {
        $filename = sys_get_temp_dir() . '/test_' . uniqid() . $extension;
        file_put_contents($filename, $content);
        return $filename;
    }
    
    /**
     * テスト用ファイルのクリーンアップ
     */
    protected function cleanupTempFile($filename) {
        if (file_exists($filename)) {
            unlink($filename);
        }
    }
    
    /**
     * セッションデータのモック
     */
    protected function mockSession($data = []) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        foreach ($data as $key => $value) {
            $_SESSION[$key] = $value;
        }
    }
    
    /**
     * セッションのクリーンアップ
     */
    protected function cleanupSession() {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }
    
    /**
     * テスト結果の取得
     */
    public function getResults() {
        return [
            'test_name' => $this->testName,
            'errors' => $this->errors,
            'passes' => $this->passes,
            'total_tests' => count($this->errors) + count($this->passes),
            'failed_tests' => count($this->errors),
            'passed_tests' => count($this->passes),
            'success_rate' => count($this->passes) / (count($this->errors) + count($this->passes)) * 100
        ];
    }
    
    /**
     * テスト結果の表示
     */
    public function printResults() {
        $results = $this->getResults();
        
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "テスト結果: " . $results['test_name'] . "\n";
        echo str_repeat("=", 60) . "\n";
        
        echo "総テスト数: " . $results['total_tests'] . "\n";
        echo "成功: " . $results['passed_tests'] . "\n";
        echo "失敗: " . $results['failed_tests'] . "\n";
        echo "成功率: " . number_format($results['success_rate'], 2) . "%\n\n";
        
        if (!empty($this->passes)) {
            echo "✅ 成功したテスト:\n";
            foreach ($this->passes as $pass) {
                echo "  • " . $pass . "\n";
            }
            echo "\n";
        }
        
        if (!empty($this->errors)) {
            echo "❌ 失敗したテスト:\n";
            foreach ($this->errors as $error) {
                echo "  • " . $error . "\n";
            }
            echo "\n";
        }
    }
    
    /**
     * テストレポートのJSON出力
     */
    public function exportResults($filename = null) {
        $results = $this->getResults();
        $results['timestamp'] = date('c');
        $results['test_environment'] = [
            'php_version' => PHP_VERSION,
            'os' => PHP_OS,
            'memory_limit' => ini_get('memory_limit'),
            'time_limit' => ini_get('max_execution_time')
        ];
        
        $json = json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        if ($filename) {
            file_put_contents($filename, $json);
            echo "テスト結果を {$filename} に保存しました。\n";
        }
        
        return $json;
    }
}
?>