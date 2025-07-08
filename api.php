<?php
/**
 * LLM API統合ハブ
 * OpenAI、Claude、Gemini等のLLMプロバイダーとの統合を管理
 */

require_once 'config.php';
require_once 'security_headers.php';

// セキュリティヘッダーの設定
initializeSecurity();

class LLMAPIHub {
    private $providers;
    private $defaultProvider = 'openai';
    
    public function __construct() {
        $this->providers = getConfig('llm_providers');
    }
    
    /**
     * メインAPIエンドポイント
     */
    public function handleRequest() {
        try {
            // デバッグログ
            error_log("API Request: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);
            // GETリクエストの処理
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $action = $_GET['action'] ?? '';
                if ($action === 'get_api_keys') {
                    // APIキーの存在確認（キー自体は返さない）
                    $hasKeys = [
                        'openai' => !empty(getApiKey('openai')),
                        'claude' => !empty(getApiKey('claude')),
                        'gemini' => !empty(getApiKey('gemini'))
                    ];
                    sendJsonResponse($hasKeys);
                    return;
                } elseif ($action === 'get_categories') {
                    // カテゴリデータの取得
                    $personasFile = __DIR__ . '/personas.json';
                    if (file_exists($personasFile)) {
                        $personasData = json_decode(file_get_contents($personasFile), true);
                        if ($personasData && isset($personasData['categories'])) {
                            sendJsonResponse($personasData['categories']);
                        } else {
                            throw new Exception('Invalid personas data structure', 500);
                        }
                    } else {
                        throw new Exception('Personas data file not found', 404);
                    }
                    return;
                } elseif ($action === 'get_personas') {
                    // 特定カテゴリのペルソナデータの取得
                    $categoryId = $_GET['category'] ?? '';
                    if (empty($categoryId)) {
                        throw new Exception('Category ID is required', 400);
                    }
                    
                    $personasFile = __DIR__ . '/personas.json';
                    if (file_exists($personasFile)) {
                        $personasData = json_decode(file_get_contents($personasFile), true);
                        if ($personasData && isset($personasData['categories'])) {
                            foreach ($personasData['categories'] as $category) {
                                if ($category['id'] === $categoryId) {
                                    sendJsonResponse($category['personas']);
                                    return;
                                }
                            }
                            throw new Exception('Category not found', 404);
                        } else {
                            throw new Exception('Invalid personas data structure', 500);
                        }
                    } else {
                        throw new Exception('Personas data file not found', 404);
                    }
                    return;
                }
            }
            
            // リクエストメソッドの確認
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Only POST method is allowed', 405);
            }
            
            // Content-Typeの確認
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            if (strpos($contentType, 'application/json') === false) {
                throw new Exception('Content-Type must be application/json', 400);
            }
            
            // リクエストボディの取得
            $rawInput = file_get_contents('php://input');
            error_log("API Raw Input: " . $rawInput);
            
            $input = json_decode($rawInput, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("JSON Parse Error: " . json_last_error_msg());
                throw new Exception('Invalid JSON in request body', 400);
            }
            
            error_log("API Parsed Input: " . json_encode($input));
            
            // Google Spreadsheet関連処理は削除済み
            
            // 入力値の検証
            $this->validateRequest($input);
            
            // レート制限チェック
            $clientIP = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            if (!$this->checkRateLimit($clientIP)) {
                throw new Exception('Rate limit exceeded', 429);
            }
            
            // テストモードの確認
            if (isset($input['test']) && $input['test'] === true) {
                // テスト用の簡単なプロンプトに変更
                $input['prompt'] = 'Hello, please respond with "Test successful" if you receive this message.';
            }
            
            // LLM API呼び出し
            $response = $this->callLLMAPI($input);
            
            // レスポンス送信
            sendJsonResponse([
                'success' => true,
                'response' => $response,
                'provider' => $input['provider'],
                'timestamp' => date('c')
            ]);
            
        } catch (Exception $e) {
            sendErrorResponse($e->getMessage(), $e->getCode() ?: 400, [
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
        }
    }
    
    /**
     * リクエストの検証
     */
    private function validateRequest($input) {
        $rules = [
            'provider' => [
                'required' => true,
                'type' => 'string'
            ],
            'prompt' => [
                'required' => true,
                'type' => 'string',
                'max_length' => 50000
            ],
            'personaId' => [
                'required' => false,
                'type' => 'mixed'  // 文字列または数値を許可
            ]
        ];
        
        $errors = validateInput($input, $rules);
        
        if (!empty($errors)) {
            error_log("Validation errors: " . json_encode($errors));
            error_log("Input data keys: " . json_encode(array_keys($input)));
            error_log("Prompt length: " . strlen($input['prompt'] ?? ''));
            throw new Exception('Validation failed: ' . implode(', ', $errors), 400);
        }
        
        // プロバイダーの存在確認
        if (!$this->providers || !array_key_exists($input['provider'], $this->providers)) {
            error_log("Available providers: " . json_encode($this->providers));
            throw new Exception('Unsupported LLM provider: ' . $input['provider'], 400);
        }
    }
    
    /**
     * LLM API呼び出し
     */
    private function callLLMAPI($input) {
        $provider = $input['provider'];
        error_log("LLM API Call: Provider = $provider");
        error_log("Available providers: " . json_encode(array_keys($this->providers ?? [])));
        
        $config = $this->providers[$provider] ?? null;
        if (!$config) {
            throw new Exception("プロバイダー設定が見つかりません: {$provider}", 400);
        }
        
        // サーバー側でAPIキーを取得
        $apiKey = getApiKey($provider);
        if (!$apiKey) {
            throw new Exception("APIキーが設定されていません: {$provider}", 400);
        }
        
        // inputにAPIキーを追加
        $input['apiKey'] = $apiKey;
        
        switch ($provider) {
            case 'openai':
                return $this->callOpenAI($input, $config);
            case 'claude':
                return $this->callClaude($input, $config);
            case 'gemini':
                return $this->callGemini($input, $config);
            default:
                throw new Exception('Provider implementation not found', 500);
        }
    }
    
    /**
     * OpenAI API呼び出し
     */
    private function callOpenAI($input, $config) {
        $headers = [
            'Authorization: Bearer ' . $input['apiKey'],
            'Content-Type: application/json'
        ];
        
        $data = [
            'model' => $config['model'],
            'messages' => [
                [
                    'role' => 'user',
                    'content' => $input['prompt']
                ]
            ],
            'max_tokens' => $config['max_tokens'],
            'temperature' => $config['temperature']
        ];
        
        $response = $this->makeHTTPRequest($config['endpoint'], $headers, $data);
        
        if (!isset($response['choices'][0]['message']['content'])) {
            throw new Exception('Invalid response from OpenAI API', 500);
        }
        
        return $response['choices'][0]['message']['content'];
    }
    
    /**
     * Claude API呼び出し
     */
    private function callClaude($input, $config) {
        $headers = [
            'x-api-key: ' . $input['apiKey'],
            'Content-Type: application/json',
            'anthropic-version: 2023-06-01'
        ];
        
        $data = [
            'model' => $config['model'],
            'messages' => [
                [
                    'role' => 'user',
                    'content' => $input['prompt']
                ]
            ],
            'max_tokens' => $config['max_tokens'],
            'temperature' => $config['temperature']
        ];
        
        $response = $this->makeHTTPRequest($config['endpoint'], $headers, $data);
        
        if (!isset($response['content'][0]['text'])) {
            throw new Exception('Invalid response from Claude API', 500);
        }
        
        return $response['content'][0]['text'];
    }
    
    /**
     * Gemini API呼び出し
     */
    private function callGemini($input, $config) {
        $url = $config['endpoint'] . '?key=' . $input['apiKey'];
        
        $headers = [
            'Content-Type: application/json'
        ];
        
        $data = [
            'contents' => [
                [
                    'parts' => [
                        [
                            'text' => $input['prompt']
                        ]
                    ]
                ]
            ],
            'generationConfig' => [
                'maxOutputTokens' => $config['max_tokens'],
                'temperature' => $config['temperature']
            ]
        ];
        
        $response = $this->makeHTTPRequest($url, $headers, $data);
        
        if (!isset($response['candidates'][0]['content']['parts'][0]['text'])) {
            throw new Exception('Invalid response from Gemini API', 500);
        }
        
        return $response['candidates'][0]['content']['parts'][0]['text'];
    }
    
    /**
     * HTTP リクエスト実行
     */
    private function makeHTTPRequest($url, $headers, $data) {
        $ch = curl_init($url);
        
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_close($ch);
        
        if ($error) {
            throw new Exception('cURL error: ' . $error, 500);
        }
        
        if ($httpCode >= 400) {
            $errorData = json_decode($response, true);
            $errorMessage = $errorData['error']['message'] ?? 'HTTP error: ' . $httpCode;
            throw new Exception($errorMessage, $httpCode);
        }
        
        $decodedResponse = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON response', 500);
        }
        
        return $decodedResponse;
    }
    
    /**
     * レート制限チェック
     */
    private function checkRateLimit($clientIP) {
        // 簡単なレート制限実装
        $rateFile = __DIR__ . '/logs/rate_' . md5($clientIP) . '.txt';
        $now = time();
        $requests = [];
        
        if (file_exists($rateFile)) {
            $requests = array_filter(
                explode("\n", file_get_contents($rateFile)),
                function($timestamp) use ($now) {
                    return $timestamp && ($now - intval($timestamp)) < 60;
                }
            );
        }
        
        if (count($requests) >= 60) {
            return false;
        }
        
        $requests[] = $now;
        file_put_contents($rateFile, implode("\n", $requests));
        
        return true;
    }
}

// APIハブの初期化と実行
$hub = new LLMAPIHub();
$hub->handleRequest();
?>