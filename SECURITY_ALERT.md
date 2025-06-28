# ⚠️ 重要なセキュリティ警告

APIキーが公開されてしまいました。以下の手順で**直ちに**対処してください：

## 1. 緊急対応（今すぐ実行）

### OpenAI APIキー
1. [OpenAI Platform](https://platform.openai.com/api-keys) にアクセス
2. 公開されたAPIキー（sk-proj-1Tjk...で始まるもの）を探して「Revoke」をクリック
3. 新しいAPIキーを生成

### Anthropic APIキー
1. [Anthropic Console](https://console.anthropic.com/account/keys) にアクセス
2. 公開されたAPIキー（sk-ant-api03-ql0N...で始まるもの）を無効化
3. 新しいAPIキーを生成

### Google AI APIキー
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) にアクセス
2. 公開されたAPIキー（AIzaSyC-ttNx...）を削除
3. 新しいAPIキーを生成

### Google Client Secret
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) にアクセス
2. OAuth 2.0クライアントIDの設定を開く
3. 新しいクライアントシークレットを生成

## 2. 新しいAPIキーの設定
1. https://mokumoku.sakura.ne.jp/persona/setup.php にアクセス
2. 新しいAPIキーを入力
3. 各キーをテストして保存

## 3. 今後の予防策
- APIキーを含むファイルは絶対に公開しない
- デバッグページには認証を追加する
- APIキーは環境変数で管理することを検討

## 4. 追加の推奨事項
- 各サービスでAPIキーの使用履歴を確認
- 不正な利用がないか請求情報を確認
- IPアドレス制限などの追加セキュリティを設定