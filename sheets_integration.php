<?php
/**
 * Google Sheets統合機能
 * 対話データのスプレッドシート保存を管理
 */

require_once 'config.php';
require_once 'google_auth.php';

class SheetsIntegration {
    private $authenticator;
    private $sheetsApiUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    
    public function __construct() {
        $this->authenticator = new GoogleAuthenticator();
    }
    
    /**
     * メインハンドラー
     */
    public function handleRequest() {
        try {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Only POST method is allowed', 405);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON in request body', 400);
            }
            
            $action = $input['action'] ?? '';
            
            switch ($action) {
                case 'save':
                    $this->saveDataToSheets($input);
                    break;
                case 'create':
                    $this->createSpreadsheet($input);
                    break;
                case 'list':
                    $this->listSpreadsheets();
                    break;
                default:
                    throw new Exception('Invalid action', 400);
            }
            
        } catch (Exception $e) {
            sendErrorResponse($e->getMessage(), $e->getCode() ?: 400);
        }
    }
    
    /**
     * データをGoogle Sheetsに保存
     */
    private function saveDataToSheets($input) {
        $spreadsheetId = $input['spreadsheetId'] ?? null;
        $data = $input['data'] ?? [];
        
        if (empty($data)) {
            throw new Exception('No data to save', 400);
        }
        
        // スプレッドシートIDが指定されていない場合は新規作成
        if (!$spreadsheetId) {
            $spreadsheetId = $this->createNewSpreadsheet();
        }
        
        // データの保存
        $this->writeDataToSheet($spreadsheetId, $data);
        
        sendJsonResponse([
            'success' => true,
            'spreadsheetId' => $spreadsheetId,
            'recordsAdded' => count($data),
            'timestamp' => date('c')
        ]);
    }
    
    /**
     * 新しいスプレッドシートを作成
     */
    private function createNewSpreadsheet($title = null) {
        $accessToken = $this->authenticator->getValidAccessToken();
        
        if (!$title) {
            $title = '北米市場調査_' . date('Y-m-d_H-i-s');
        }
        
        $spreadsheetData = [
            'properties' => [
                'title' => $title
            ],
            'sheets' => [
                [
                    'properties' => [
                        'title' => '対話データ',
                        'gridProperties' => [
                            'rowCount' => 1000,
                            'columnCount' => 10
                        ]
                    ]
                ]
            ]
        ];
        
        $response = $this->makeApiRequest(
            $this->sheetsApiUrl,
            'POST',
            $accessToken,
            $spreadsheetData
        );
        
        $spreadsheetId = $response['spreadsheetId'];
        
        // ヘッダー行を設定
        $this->setupHeaders($spreadsheetId);
        
        return $spreadsheetId;
    }
    
    /**
     * ヘッダー行の設定
     */
    private function setupHeaders($spreadsheetId) {
        $accessToken = $this->authenticator->getValidAccessToken();
        
        $headers = [
            ['ペルソナ名', 'ペルソナID', '質問内容', '回答内容', '日時', 'タイムスタンプ']
        ];
        
        $range = '対話データ!A1:F1';
        $url = $this->sheetsApiUrl . "/{$spreadsheetId}/values/{$range}";
        
        $requestData = [
            'values' => $headers,
            'majorDimension' => 'ROWS'
        ];
        
        $this->makeApiRequest(
            $url . '?valueInputOption=RAW',
            'PUT',
            $accessToken,
            $requestData
        );
        
        // ヘッダー行のスタイル設定
        $this->formatHeaders($spreadsheetId);
    }
    
    /**
     * ヘッダー行のフォーマット
     */
    private function formatHeaders($spreadsheetId) {
        $accessToken = $this->authenticator->getValidAccessToken();
        
        $batchUpdateData = [
            'requests' => [
                [
                    'repeatCell' => [
                        'range' => [
                            'sheetId' => 0,
                            'startRowIndex' => 0,
                            'endRowIndex' => 1,
                            'startColumnIndex' => 0,
                            'endColumnIndex' => 6
                        ],
                        'cell' => [
                            'userEnteredFormat' => [
                                'backgroundColor' => [
                                    'red' => 0.4,
                                    'green' => 0.5,
                                    'blue' => 0.9
                                ],
                                'textFormat' => [
                                    'foregroundColor' => [
                                        'red' => 1.0,
                                        'green' => 1.0,
                                        'blue' => 1.0
                                    ],
                                    'bold' => true
                                ]
                            ]
                        ],
                        'fields' => 'userEnteredFormat(backgroundColor,textFormat)'
                    ]
                ],
                [
                    'autoResizeDimensions' => [
                        'dimensions' => [
                            'sheetId' => 0,
                            'dimension' => 'COLUMNS',
                            'startIndex' => 0,
                            'endIndex' => 6
                        ]
                    ]
                ]
            ]
        ];
        
        $url = $this->sheetsApiUrl . "/{$spreadsheetId}:batchUpdate";
        $this->makeApiRequest($url, 'POST', $accessToken, $batchUpdateData);
    }
    
    /**
     * データをシートに書き込み
     */
    private function writeDataToSheet($spreadsheetId, $data) {
        $accessToken = $this->authenticator->getValidAccessToken();
        
        // 既存のデータ行数を取得
        $existingRows = $this->getExistingRowCount($spreadsheetId);
        $startRow = $existingRows + 1; // ヘッダーの次の行から開始
        
        // データを2次元配列に変換
        $values = [];
        foreach ($data as $item) {
            $values[] = [
                $item['personaName'] ?? '',
                $item['personaId'] ?? '',
                $item['question'] ?? '',
                $item['answer'] ?? '',
                isset($item['timestamp']) ? date('Y-m-d H:i:s', strtotime($item['timestamp'])) : '',
                $item['timestamp'] ?? ''
            ];
        }
        
        $range = "対話データ!A{$startRow}:F" . ($startRow + count($values) - 1);
        $url = $this->sheetsApiUrl . "/{$spreadsheetId}/values/{$range}";
        
        $requestData = [
            'values' => $values,
            'majorDimension' => 'ROWS'
        ];
        
        $this->makeApiRequest(
            $url . '?valueInputOption=RAW',
            'PUT',
            $accessToken,
            $requestData
        );
        
        writeLog("Added " . count($values) . " records to spreadsheet {$spreadsheetId}", 'INFO');
    }
    
    /**
     * 既存のデータ行数を取得
     */
    private function getExistingRowCount($spreadsheetId) {
        $accessToken = $this->authenticator->getValidAccessToken();
        
        $range = '対話データ!A:A';
        $url = $this->sheetsApiUrl . "/{$spreadsheetId}/values/{$range}";
        
        try {
            $response = $this->makeApiRequest($url, 'GET', $accessToken);
            return count($response['values'] ?? []);
        } catch (Exception $e) {
            // シートが空の場合は1（ヘッダー行のみ）を返す
            return 1;
        }
    }
    
    /**
     * スプレッドシート作成（公開API）
     */
    private function createSpreadsheet($input) {
        $title = $input['title'] ?? null;
        $spreadsheetId = $this->createNewSpreadsheet($title);
        
        sendJsonResponse([
            'success' => true,
            'spreadsheetId' => $spreadsheetId,
            'title' => $title ?: '北米市場調査_' . date('Y-m-d_H-i-s'),
            'url' => "https://docs.google.com/spreadsheets/d/{$spreadsheetId}/edit"
        ]);
    }
    
    /**
     * スプレッドシート一覧取得
     */
    private function listSpreadsheets() {
        $accessToken = $this->authenticator->getValidAccessToken();
        
        // Google Drive APIを使用してスプレッドシートを検索
        $driveApiUrl = 'https://www.googleapis.com/drive/v3/files';
        $query = "mimeType='application/vnd.google-apps.spreadsheet' and name contains '北米市場調査'";
        
        $url = $driveApiUrl . '?' . http_build_query([
            'q' => $query,
            'fields' => 'files(id,name,createdTime,modifiedTime)',
            'orderBy' => 'modifiedTime desc'
        ]);
        
        $response = $this->makeApiRequest($url, 'GET', $accessToken);
        
        sendJsonResponse([
            'success' => true,
            'spreadsheets' => $response['files'] ?? []
        ]);
    }
    
    /**
     * Google API リクエスト実行
     */
    private function makeApiRequest($url, $method = 'GET', $accessToken = null, $data = null) {
        if (!$accessToken) {
            throw new Exception('Access token required', 401);
        }
        
        $headers = [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init();
        
        $curlOptions = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true
        ];
        
        switch (strtoupper($method)) {
            case 'POST':
                $curlOptions[CURLOPT_POST] = true;
                if ($data) {
                    $curlOptions[CURLOPT_POSTFIELDS] = json_encode($data);
                }
                break;
            case 'PUT':
                $curlOptions[CURLOPT_CUSTOMREQUEST] = 'PUT';
                if ($data) {
                    $curlOptions[CURLOPT_POSTFIELDS] = json_encode($data);
                }
                break;
            case 'DELETE':
                $curlOptions[CURLOPT_CUSTOMREQUEST] = 'DELETE';
                break;
        }
        
        curl_setopt_array($ch, $curlOptions);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_close($ch);
        
        if ($error) {
            throw new Exception('HTTP Request failed: ' . $error, 500);
        }
        
        if ($httpCode >= 400) {
            $errorResponse = json_decode($response, true);
            $errorMessage = $errorResponse['error']['message'] ?? "HTTP Error {$httpCode}";
            writeLog("Google API Error {$httpCode}: {$response}", 'ERROR');
            throw new Exception("Google API Error: {$errorMessage}", $httpCode);
        }
        
        $decodedResponse = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON response from Google API', 500);
        }
        
        return $decodedResponse;
    }
    
    /**
     * スプレッドシートの権限確認
     */
    public function checkSpreadsheetAccess($spreadsheetId) {
        try {
            $accessToken = $this->authenticator->getValidAccessToken();
            $url = $this->sheetsApiUrl . "/{$spreadsheetId}?fields=properties.title";
            $this->makeApiRequest($url, 'GET', $accessToken);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * スプレッドシートのメタデータ取得
     */
    public function getSpreadsheetInfo($spreadsheetId) {
        $accessToken = $this->authenticator->getValidAccessToken();
        $url = $this->sheetsApiUrl . "/{$spreadsheetId}?fields=properties,sheets.properties";
        
        $response = $this->makeApiRequest($url, 'GET', $accessToken);
        
        return [
            'title' => $response['properties']['title'],
            'url' => "https://docs.google.com/spreadsheets/d/{$spreadsheetId}/edit",
            'sheets' => array_map(function($sheet) {
                return [
                    'title' => $sheet['properties']['title'],
                    'id' => $sheet['properties']['sheetId']
                ];
            }, $response['sheets'] ?? [])
        ];
    }
}

// メイン処理
try {
    $integration = new SheetsIntegration();
    $integration->handleRequest();
} catch (Exception $e) {
    sendErrorResponse($e->getMessage(), $e->getCode() ?: 500);
}
?>