# セットアップガイド

## 🚀 クイックスタートガイド

### 必要な準備

1. **APIキーの取得**
2. **Google OAuth2の設定**
3. **環境設定**
4. **動作確認**

---

## 📋 ステップ1: APIキーの取得

### OpenAI API キー
1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. アカウント作成・ログイン
3. 「API Keys」から新しいキーを生成
4. キーをコピー（`sk-...`で始まる）

### Anthropic Claude API キー
1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. アカウント作成・ログイン
3. 「API Keys」から新しいキーを生成
4. キーをコピー（`sk-ant-...`で始まる）

### Google AI (Gemini) API キー
1. [Google AI Studio](https://makersuite.google.com/) にアクセス
2. 「Get API Key」をクリック
3. 新しいプロジェクトまたは既存プロジェクトを選択
4. キーをコピー（`AIza...`で始まる）

---

## 🔐 ステップ2: Google OAuth2設定

### Google Cloud Console 設定

1. **プロジェクトの作成**
   ```
   https://console.cloud.google.com/
   → 新しいプロジェクトを作成
   ```

2. **APIの有効化**
   ```
   Google Sheets API を有効化
   Google Drive API を有効化
   ```

3. **OAuth2認証情報の作成**
   ```
   認証情報 → OAuth 2.0 クライアント ID
   アプリケーションの種類: ウェブアプリケーション
   ```

4. **リダイレクトURIの設定**
   ```
   承認済みのリダイレクト URI:
   https://yourdomain.com/agetsite/google_auth.php
   
   ローカル開発時:
   http://localhost/agetsite/google_auth.php
   ```

5. **クライアント情報のダウンロード**
   - JSONファイルをダウンロード
   - `client_id` と `client_secret` をメモ

---

## ⚙️ ステップ3: 環境設定

### 3.1 環境設定ファイルの作成

```bash
# .env ファイルの作成
cp .env.example .env
```

### 3.2 .envファイルの編集

```bash
# LLM API設定
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-claude-api-key-here
GOOGLE_AI_API_KEY=AIza-your-google-ai-api-key-here

# Google OAuth2設定
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/agetsite/google_auth.php

# セキュリティ設定
DEBUG_MODE=false  # 本番環境では false
ALLOWED_ORIGINS=https://yourdomain.com

# その他設定
TIMEZONE=Asia/Tokyo
```

### 3.3 ディレクトリ権限の設定

```bash
# ログディレクトリの作成
mkdir logs
chmod 755 logs

# テスト結果ディレクトリの作成
mkdir tests/results
chmod 755 tests/results
```

---

## 🔧 ステップ4: さくらインターネット設定

### 4.1 ファイルアップロード

```
さくらインターネット コントロールパネル
→ ファイルマネージャー
→ www フォルダ内に agetsite フォルダを作成
→ 全ファイルをアップロード
```

### 4.2 PHP設定の確認

```php
# PHP バージョン: 7.4 以上
# 必要な拡張機能:
# - curl
# - json
# - session
# - mbstring
```

### 4.3 SSL証明書の設定

```
さくらインターネット コントロールパネル
→ ドメイン/SSL設定
→ 無料SSL（Let's Encrypt）を設定
```

---

## ✅ ステップ5: 動作確認

### 5.1 システムヘルスチェック

```bash
# ブラウザでアクセス
https://yourdomain.com/agetsite/api.php/health

# 期待されるレスポンス:
{
  "status": "healthy",
  "providers": ["openai", "claude", "gemini"],
  "timestamp": "2024-06-27T12:00:00+00:00",
  "version": "1.0.0"
}
```

### 5.2 基本機能テスト

1. **ペルソナ選択画面**
   ```
   https://yourdomain.com/agetsite/index.html
   → 10のペルソナが表示される
   → LLMプロバイダーが選択できる
   ```

2. **対話機能**
   ```
   APIキーを入力
   → ペルソナを選択
   → 質問を入力
   → AI応答が返る
   ```

3. **Google Sheets連携**
   ```
   「Google Sheetsに保存」ボタン
   → Google認証画面
   → 保存完了メッセージ
   ```

### 5.3 テストスイートの実行

```bash
# PHPコマンドラインから実行
php tests/run_all_tests.php

# または個別テスト
php tests/ConfigTest.php
php tests/LLMAPITest.php
php tests/GoogleSheetsTest.php
php tests/SecurityTest.php
php tests/IntegrationTest.php
```

---

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. 「APIキーが無効」エラー
```bash
原因: APIキーが正しく設定されていない
解決: .env ファイルのAPIキーを確認
確認方法: echo $OPENAI_API_KEY
```

#### 2. 「Google認証に失敗」エラー
```bash
原因: OAuth2設定が不正
解決: Google Cloud Console で以下を確認
- クライアントID・シークレット
- リダイレクトURI
- APIの有効化状況
```

#### 3. 「Permission denied」エラー
```bash
原因: ディレクトリの権限が不足
解決: chmod 755 logs
確認: ls -la
```

#### 4. 「500 Internal Server Error」
```bash
原因: PHP設定・ファイル破損・権限問題
解決: 
1. エラーログを確認: tail -f logs/error.log
2. PHP設定を確認: php -v
3. ファイル権限を確認: chmod 644 *.php
```

#### 5. APIレスポンスが遅い
```bash
原因: ネットワーク・API制限・サーバー負荷
解決:
1. ネットワーク確認: ping api.openai.com
2. API制限確認: 使用量ダッシュボード
3. タイムアウト設定を調整
```

---

## 📊 監視・運用

### ログ監視

```bash
# エラーログの確認
tail -f logs/error.log

# アクセスログの確認  
tail -f logs/access.log

# ログローテーション設定
logrotate /etc/logrotate.d/agetsite
```

### パフォーマンス監視

```bash
# メモリ使用量
free -h

# ディスク使用量
df -h

# CPU使用率
top

# PHP プロセス確認
ps aux | grep php
```

### バックアップ

```bash
# データベースバックアップ（将来実装時）
mysqldump -u user -p database > backup.sql

# ファイルバックアップ
tar -czf agetsite_backup_$(date +%Y%m%d).tar.gz agetsite/

# 設定ファイルバックアップ
cp .env .env.backup.$(date +%Y%m%d)
```

---

## 🔄 更新・メンテナンス

### アプリケーション更新

```bash
# バックアップ作成
cp -r agetsite agetsite_backup_$(date +%Y%m%d)

# 新版ファイルのアップロード
# 設定ファイルの確認
# テストの実行
php tests/run_all_tests.php

# 本番環境への反映
```

### 定期メンテナンス

- **毎日**: ログファイルの確認
- **毎週**: システムヘルスチェック
- **毎月**: セキュリティアップデート
- **四半期**: バックアップの検証

---

## 📞 サポート

### 技術サポート

問題が発生した場合は以下の情報を含めてお問い合わせください：

1. **エラーメッセージ**: 完全なエラーテキスト
2. **エラーログ**: `logs/error.log` の該当箇所
3. **環境情報**: PHP バージョン、サーバー情報
4. **再現手順**: エラーが発生するまでの詳細な手順
5. **設定情報**: .env ファイル（APIキー等は除く）

### 追加リソース

- **API ドキュメント**: [OpenAI](https://platform.openai.com/docs) | [Claude](https://docs.anthropic.com/) | [Gemini](https://ai.google.dev/)
- **Google Sheets API**: [公式ドキュメント](https://developers.google.com/sheets/api)
- **さくらインターネット**: [サポートページ](https://help.sakura.ad.jp/)

---

## ✨ 高度な設定

### カスタムペルソナの追加

1. `personas.json` を編集
2. 新しいペルソナオブジェクトを追加
3. 必須フィールドを全て記入
4. IDは一意の値を設定

### API プロバイダーの追加

1. `config.php` の `LLM_PROVIDERS` に設定追加
2. `api.php` に新プロバイダーの処理ロジック追加
3. テストケースの追加

### セキュリティ強化

```bash
# HTTPS強制
FORCE_HTTPS=true

# CORS設定厳格化
ALLOWED_ORIGINS=https://yourdomain.com

# レート制限強化
RATE_LIMIT_PER_MINUTE=30
RATE_LIMIT_PER_HOUR=500

# セッションセキュリティ
session.cookie_secure=1
session.cookie_httponly=1
session.use_strict_mode=1
```

---

🎉 **セットアップ完了！**

これで北米市場調査AIエージェントが利用可能になりました。ご質問がございましたらお気軽にお問い合わせください。