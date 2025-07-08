<?php
/**
 * セキュリティヘッダー設定
 */

function setSecurityHeaders() {
    // CSP (Content Security Policy)
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com");
    
    // X-Frame-Options
    header("X-Frame-Options: DENY");
    
    // X-Content-Type-Options
    header("X-Content-Type-Options: nosniff");
    
    // X-XSS-Protection
    header("X-XSS-Protection: 1; mode=block");
    
    // Referrer-Policy
    header("Referrer-Policy: strict-origin-when-cross-origin");
    
    // Permissions-Policy
    header("Permissions-Policy: geolocation=(), microphone=(), camera=()");
    
    // HSTS (HTTPS強制)
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
    }
}

function setCORSHeaders() {
    $allowedOrigins = [
        'https://yourdomain.com',
        'https://localhost',
        'http://localhost'
    ];
    
    // 環境変数から許可ドメインを取得
    $envOrigins = getenv('ALLOWED_ORIGINS');
    if ($envOrigins) {
        $additionalOrigins = explode(',', $envOrigins);
        $allowedOrigins = array_merge($allowedOrigins, $additionalOrigins);
    }
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    }
    
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Max-Age: 86400");
}

function initializeSecurity() {
    setSecurityHeaders();
    setCORSHeaders();
}
?>