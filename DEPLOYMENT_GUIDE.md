# PersonaAgents Vercel デプロイメントガイド

## 概要

このガイドでは、PersonaAgentsアプリケーションをVercelでホスティングするための設定方法について説明します。

## Vercelデプロイの特徴

### 1. 自動デプロイ
- GitHubからのプッシュで自動デプロイ
- ブランチプレビュー機能
- 環境変数の安全な管理

### 2. PHPランタイム
- Vercel PHP Runtimeを使用
- サーバーレス関数でAPIを実行
- グローバルCDNで高速配信

## Vercelデプロイ手順

### 1. Vercelプロジェクトの作成

1. [Vercel](https://vercel.com/)にログイン
2. 「New Project」からGitHubリポジトリを連携
3. プロジェクト名: `personaagents`
4. Framework Preset: `Other`

### 2. 環境変数の設定

Vercelダッシュボードで環境変数を設定：

```bash
# LLM API Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
GOOGLE_AI_API_KEY=AIza-your-google-ai-api-key-here

# セキュリティ設定
ALLOWED_ORIGINS=https://personaagents-h6bpmq747-horikens-projects.vercel.app
DEBUG_MODE=false
```

### 3. GitHub Secretsの設定

GitHub Actions用のSECRETSを設定：

```bash
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
```

### 4. デプロイの実行

```bash
# ローカルでテスト（オプション）
npx vercel dev

# 本番デプロイ
git push origin main
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

1. ブラウザで `https://personaagents-h6bpmq747-horikens-projects.vercel.app` にアクセス
2. カテゴリ選択が正常に表示されることを確認
3. ペルソナ選択が正常に動作することを確認
4. APIキー状態が正しく表示されることを確認
5. LLMとの対話が正常に動作することを確認

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