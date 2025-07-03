# API キー隠蔽対応 デプロイメントガイド

## 概要

このガイドでは、ユーザーからAPIキーを隠蔽し、サーバーサイドで管理するように変更されたシステムのデプロイ方法について説明します。

## 変更内容

### 1. フロントエンド
- APIキー入力フィールドを削除
- APIキー状態確認機能を追加
- ユーザーはAPIキーを入力する必要がなくなりました

### 2. バックエンド
- APIキーはサーバー側で管理
- 環境変数または設定ファイルから読み込み
- セキュリティヘッダーの強化

## デプロイ手順

### 1. 環境変数の設定

`.env` ファイルを作成し、以下の内容を設定してください：

```bash
# LLM API Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
GOOGLE_AI_API_KEY=AIza-your-google-ai-api-key-here

# Google OAuth設定
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# セキュリティ設定
ALLOWED_ORIGINS=https://mokumoku.sakura.ne.jp
DEBUG_MODE=false
```

### 2. ファイルの権限設定

```bash
# .envファイルの権限を制限
chmod 600 .env

# api_keys.jsonファイルの権限を制限（使用している場合）
chmod 600 api_keys.json
```

### 3. Webサーバー設定

#### Apache (.htaccess)
```apache
# .envファイルへのアクセス禁止
<Files ".env">
    Order allow,deny
    Deny from all
</Files>

# api_keys.jsonファイルへのアクセス禁止
<Files "api_keys.json">
    Order allow,deny
    Deny from all
</Files>

# セキュリティヘッダー
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
```

#### Nginx
```nginx
# .envファイルへのアクセス禁止
location ~ /\.env {
    deny all;
    return 404;
}

# api_keys.jsonファイルへのアクセス禁止
location ~ /api_keys\.json {
    deny all;
    return 404;
}
```

### 4. 必要なファイルのアップロード

以下のファイルをサーバーにアップロードしてください：

```
├── .env（新規作成）
├── api_check.php（新規作成）
├── security_headers.php（新規作成）
├── env_setup.php（新規作成）
├── index.html（更新済み）
├── script.js（更新済み）
├── styles.css（更新済み）
├── config.php（更新済み）
└── api.php（更新済み）
```

### 5. 動作確認

1. ブラウザで `https://mokumoku.sakura.ne.jp/persona/` にアクセス
2. APIキー入力フィールドが表示されないことを確認
3. 「APIキーが利用可能です」または「APIキーが設定されていません」メッセージが表示されることを確認
4. LLMプロバイダーを変更してAPIキー状態が更新されることを確認

## トラブルシューティング

### APIキーが認識されない場合

1. `.env`ファイルの権限を確認
2. APIキーの形式が正しいことを確認
3. サーバーのPHPログを確認

### CORS エラーが発生する場合

1. `ALLOWED_ORIGINS` 環境変数を確認
2. `security_headers.php` の設定を確認

### APIキー状態が「エラー」と表示される場合

1. `api_check.php` にアクセス可能か確認
2. PHPのエラーログを確認
3. APIキーの形式が正しいか確認

## セキュリティ上の注意点

1. **`.env`ファイルの保護**
   - 適切な権限設定（600）
   - Webサーバーのアクセス制限

2. **APIキーの管理**
   - 定期的なローテーション
   - 不要なAPIキーの削除

3. **ログファイル**
   - APIキーがログに記録されないよう注意
   - 定期的なログの確認とクリーンアップ

4. **HTTPSの使用**
   - 本番環境では必ずHTTPS使用
   - HSTSヘッダーの設定

## サポート

問題が発生した場合は、以下を確認してください：

1. PHPのエラーログ
2. Webサーバーのアクセスログ
3. ブラウザのコンソールエラー
4. ネットワークタブでのAPIレスポンス

このガイドに従って設定することで、APIキーを安全に隠蔽し、ユーザーが直接APIキーを入力する必要のないシステムを構築できます。