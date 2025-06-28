<?php
/**
 * LLM API統合ハブ
 * OpenAI、Claude、Gemini等のLLMプロバイダーとの統合を管理
 */

require_once 'config.php';

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
            // GETリクエストの処理（Google設定の取得など）
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $action = $_GET['action'] ?? '';
                if ($action === 'get_google_config') {
                    $config = GOOGLE_API_CONFIG;
                    sendJsonResponse([
                        'client_id' => $config['client_id'] ?? ''
                    ]);
                    return;
                } elseif ($action === 'get_api_keys') {
                    // APIキーの存在確認（キー自体は返さない）
                    $hasKeys = [
                        'openai' => !empty(getApiKey('openai')),
                        'claude' => !empty(getApiKey('claude')),
                        'gemini' => !empty(getApiKey('gemini'))
                    ];
                    sendJsonResponse($hasKeys);
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
            $input = json_decode($rawInput, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON in request body', 400);
            }
            
            // 入力値の検証
            $this->validateRequest($input);
            
            // レート制限チェック
            $clientIP = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            if (!checkRateLimit($clientIP)) {
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
                'max_length' => 10000
            ],
            'personaId' => [
                'required' => false,
                'type' => 'integer'
            ]
        ];
        
        $errors = validateInput($input, $rules);
        
        if (!empty($errors)) {
            throw new Exception('Validation failed: ' . implode(', ', $errors), 400);
        }
        
        // プロバイダーの存在確認
        if (!array_key_exists($input['provider'], $this->providers)) {
            throw new Exception('Unsupported LLM provider: ' . $input['provider'], 400);
        }
    }
    
    /**
     * LLM API呼び出し
     */
    private function callLLMAPI($input) {
        $provider = $input['provider'];
        $config = $this->providers[$provider];
        
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
        
        if (isset($response['error'])) {
            throw new Exception('OpenAI API Error: ' . $response['error']['message'], 400);
        }
        
        return $response['choices'][0]['message']['content'] ?? 'No response generated';
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
            'max_tokens' => $config['max_tokens'],
            'messages' => [
                [
                    'role' => 'user',
                    'content' => $input['prompt']
                ]
            ]
        ];
        
        $response = $this->makeHTTPRequest($config['endpoint'], $headers, $data);
        
        if (isset($response['error'])) {
            throw new Exception('Claude API Error: ' . $response['error']['message'], 400);
        }
        
        return $response['content'][0]['text'] ?? 'No response generated';
    }
    
    /**
     * Gemini API呼び出し
     */
    private function callGemini($input, $config) {
        $endpoint = $config['endpoint'] . '?key=' . $input['apiKey'];
        
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
                'temperature' => $config['temperature'],
                'maxOutputTokens' => $config['max_tokens']
            ]
        ];
        
        $response = $this->makeHTTPRequest($endpoint, $headers, $data);
        
        if (isset($response['error'])) {
            throw new Exception('Gemini API Error: ' . $response['error']['message'], 400);
        }
        
        return $response['candidates'][0]['content']['parts'][0]['text'] ?? 'No response generated';
    }
    
    /**
     * HTTP リクエスト実行
     */
    private function makeHTTPRequest($url, $headers, $data) {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'AgetSite-LLM-Hub/1.0'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_close($ch);
        
        if ($error) {
            throw new Exception('HTTP Request failed: ' . $error, 500);
        }
        
        if ($httpCode >= 400) {
            writeLog("HTTP Error {$httpCode}: {$response}", 'ERROR');
            $decodedResponse = json_decode($response, true);
            if ($decodedResponse && isset($decodedResponse['error'])) {
                throw new Exception($decodedResponse['error']['message'] ?? 'HTTP Error', $httpCode);
            }
            throw new Exception("HTTP Error {$httpCode}", $httpCode);
        }
        
        $decodedResponse = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON response from API', 500);
        }
        
        return $decodedResponse;
    }
    
    /**
     * プロバイダー一覧取得
     */
    public function getProviders() {
        return array_map(function($config) {
            return [
                'name' => $config['name'],
                'model' => $config['model']
            ];
        }, $this->providers);
    }
    
    /**
     * ヘルスチェック
     */
    public function healthCheck() {
        return [
            'status' => 'healthy',
            'providers' => array_keys($this->providers),
            'timestamp' => date('c'),
            'version' => '1.0.0'
        ];
    }
}

// メイン処理
try {
    $hub = new LLMAPIHub();
    
    // ルーティング
    $requestUri = $_SERVER['REQUEST_URI'] ?? '';
    $path = parse_url($requestUri, PHP_URL_PATH);
    
    switch ($path) {
        case '/api.php':
        case '/api.php/chat':
            $hub->handleRequest();
            break;
            
        case '/api.php/providers':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                sendJsonResponse($hub->getProviders());
            } else {
                sendErrorResponse('Method not allowed', 405);
            }
            break;
            
        case '/api.php/health':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                sendJsonResponse($hub->healthCheck());
            } else {
                sendErrorResponse('Method not allowed', 405);
            }
            break;
            
        default:
            sendErrorResponse('Endpoint not found', 404);
    }
    
} catch (Exception $e) {
    sendErrorResponse('Internal server error', 500, [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>