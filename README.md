# 北米市場調査AIエージェント

日系調味料メーカーの北米進出を支援するAIペルソナ対話システム

## 概要

このシステムは、北米市場の多様な消費者層を代表する10のペルソナとAIによる対話を通じて、日系調味料メーカーの北米進出における市場調査を支援します。

### 主な機能

- **10の戦略的ペルソナ**: DeepResearchに基づく北米消費者の詳細なプロファイル
- **マルチLLM対応**: OpenAI GPT-4、Anthropic Claude、Google Gemini
- **対話システム**: 自然言語での質問・回答インターフェース
- **Google Sheets連携**: OAuth2認証による自動データ保存
- **履歴管理**: 対話履歴の保存・検索・エクスポート機能

## システム要件

### サーバー要件
- PHP 7.4 以上
- Apache ウェブサーバー
- cURL拡張機能
- JSON拡張機能
- セッション機能

### さくらインターネット対応
- スタンダードプラン以上
- PHP 7.4/8.x 対応
- SSL証明書（推奨）

## インストール手順

### 1. ファイルのアップロード

```bash
# さくらインターネットのサーバーにファイルをアップロード
# FTP/SFTP または ファイルマネージャーを使用
```

### 2. 環境設定

```bash
# 環境設定ファイルの作成
cp .env.example .env

# 環境設定ファイルの編集
vi .env
```

### 3. 必要なAPIキーの取得

#### OpenAI API
1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. APIキーを生成
3. `.env` ファイルに `OPENAI_API_KEY` を設定

#### Anthropic Claude API
1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. APIキーを生成
3. `.env` ファイルに `ANTHROPIC_API_KEY` を設定

#### Google AI (Gemini) API
1. [Google AI Studio](https://makersuite.google.com/) にアクセス
2. APIキーを生成
3. `.env` ファイルに `GOOGLE_AI_API_KEY` を設定

### 4. Google OAuth2設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. Google Sheets API を有効化
3. OAuth2認証情報を作成
4. リダイレクトURIを設定: `https://yourdomain.com/agetsite/google_auth.php`
5. `.env` ファイルに認証情報を設定

### 5. ディレクトリ権限設定

```bash
# ログディレクトリの作成と権限設定
mkdir logs
chmod 755 logs
```

## 使用方法

### 1. ペルソナ選択
- ブラウザで `index.html` にアクセス
- 10のペルソナから対話したい相手を選択
- LLMプロバイダーとAPIキーを設定

### 2. 対話実行
- 選択したペルソナとの対話画面に移動
- 調味料に関する質問を自由に入力
- AIがペルソナになりきって回答

### 3. データ保存
- Google アカウントで認証
- 対話データを自動的にGoogle Sheetsに保存
- 既存のスプレッドシートまたは新規作成を選択

## ペルソナプロファイル

### 1. Sarah Williams (65歳)
- **セグメント**: プレミアム志向ベビーブーマー
- **特徴**: 健康重視、高品質調味料への支払い意欲が高い
- **居住地**: カリフォルニア州サンディエゴ

### 2. Jennifer Martinez (32歳)
- **セグメント**: 忙しいミレニアル世代ママ
- **特徴**: 利便性重視、時短料理ソリューションを求める
- **居住地**: テキサス州オースティン

### 3. Michael Thompson (45歳)
- **セグメント**: 健康志向ジェネレーションX
- **特徴**: クリーンラベル・オーガニック製品偏重
- **居住地**: ワシントン州シアトル

*（以下、7つのペルソナが続く）*

## API仕様

### LLM API エンドポイント

```http
POST /api.php
Content-Type: application/json

{
  "provider": "openai|claude|gemini",
  "prompt": "質問内容",
  "apiKey": "your-api-key",
  "personaId": 1
}
```

### Google Sheets API

```http
POST /sheets_integration.php
Content-Type: application/json

{
  "action": "save",
  "spreadsheetId": "optional-spreadsheet-id",
  "data": [
    {
      "personaName": "Sarah Williams",
      "personaId": 1,
      "question": "質問内容",
      "answer": "回答内容",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## セキュリティ対策

### 実装済み対策
- **レート制限**: 1分間60リクエスト、1時間1000リクエスト
- **入力値検証**: SQLインジェクション、XSS対策
- **CSRF保護**: トークンベース保護
- **セキュリティヘッダー**: X-Frame-Options、CSP等
- **OAuth2認証**: Google API安全なアクセス

### 本番環境での追加設定
```bash
# HTTPS強制
FORCE_HTTPS=true

# デバッグモード無効
DEBUG_MODE=false

# 本番ドメイン設定
ALLOWED_ORIGINS=https://yourdomain.com
```

## トラブルシューティング

### よくある問題

#### 1. APIキーエラー
```
Error: Invalid API key
```
**解決方法**: `.env` ファイルのAPIキーを確認

#### 2. Google認証エラー
```
Error: OAuth2 authentication failed
```
**解決方法**: Google Cloud ConsoleでOAuth2設定を確認

#### 3. 権限エラー
```
Error: Permission denied
```
**解決方法**: ディレクトリ権限を確認 (`chmod 755`)

### ログ確認
```bash
# エラーログの確認
tail -f logs/error.log

# アクセスログの確認
tail -f logs/access.log
```

## 開発・テスト

### ローカル開発環境
```bash
# PHPビルトインサーバーで起動
php -S localhost:8000

# ブラウザでアクセス
open http://localhost:8000
```

### テスト実行
```bash
# PHPUnit テスト（将来実装）
composer test

# API テスト
curl -X POST http://localhost:8000/api.php/health
```

## 今後の拡張計画

### Phase 2 機能
- **データベース統合**: MySQL/PostgreSQL対応
- **ユーザー管理**: 複数ユーザー対応
- **レポート機能**: 分析結果の可視化
- **API認証**: JWT ベース認証

### Phase 3 機能
- **多言語対応**: 英語・スペイン語対応
- **AI音声合成**: 音声での対話機能
- **リアルタイム分析**: ライブダッシュボード

## ライセンス

このプロジェクトは日系食品メーカーの北米進出支援を目的として開発されています。

## サポート

技術的なサポートが必要な場合は、以下の情報を含めてお問い合わせください：

- エラーメッセージ
- ログファイル（`logs/error.log`）
- 実行環境（PHP バージョン、サーバー情報）
- 再現手順

---

## 更新履歴

### v1.0.0 (2024-06-27)
- 初期リリース
- 10ペルソナの実装
- マルチLLM対応（OpenAI、Claude、Gemini）
- Google Sheets連携機能
- セキュリティ対策実装