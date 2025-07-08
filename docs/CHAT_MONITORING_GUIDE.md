# チャット監視システム利用ガイド

## 概要

PersonaAgentsプロジェクトのチャット監視システムは、チャット履歴から自動的に設計書を更新し、CLAUDE.mdに記録を残すシステムです。

## 🚀 システム構成

### 1. 主要スクリプト

- **`scripts/chat_monitor_daemon.js`** - メインデーモン（常時実行）
- **`scripts/update_docs_from_chat.js`** - 設計書自動更新
- **`scripts/record_chat_to_claude.js`** - CLAUDE.md記録
- **`scripts/setup_chat_monitoring.sh`** - デーモン管理スクリプト

### 2. 監視対象ファイル

以下のパターンのファイルを自動検出：
- `chat*.txt`
- `conversation*.txt`  
- `claude*.txt`
- `*chat*export*.csv`
- `*conversation*.json`

## 📋 使用方法

### デーモンの起動

```bash
# デーモンを開始
./scripts/setup_chat_monitoring.sh start

# 状態確認
./scripts/setup_chat_monitoring.sh status

# リアルタイムログ表示
./scripts/setup_chat_monitoring.sh logs
```

### 手動実行

```bash
# 設計書更新
node scripts/update_docs_from_chat.js chat-export.txt

# CLAUDE.md記録
node scripts/record_chat_to_claude.js --file chat.txt --session "機能追加"
```

## ⚙️ システム設定

### 監視ディレクトリの変更

```bash
# カスタムディレクトリを監視
node scripts/chat_monitor_daemon.js --watch-dir /path/to/chat/files

# レポート間隔を変更（秒単位）
node scripts/chat_monitor_daemon.js --interval 1800
```

### システムサービス化

```bash
# macOS/Linuxでシステムサービスとして登録
./scripts/setup_chat_monitoring.sh install
```

## 📊 監視機能詳細

### 1. ファイル監視

- **初期スキャン**: 24時間以内に更新されたファイルを処理
- **リアルタイム監視**: 新規作成・更新されたファイルを即座に検出
- **重複処理回避**: 同じファイルの複数回処理を防止

### 2. 情報抽出パターン

#### 機能追加
- `追加した機能: xxx`
- `実装完了: xxx` 
- `新機能: xxx`
- `feat: xxx`

#### バグ修正
- `修正: xxx`
- `エラーを修正: xxx`
- `fix: xxx`

#### 環境設定
- `設定変更: xxx`
- `環境変数: xxx`
- `デプロイ先: xxx`

#### API変更
- `API追加: xxx`
- `エンドポイント: xxx`

### 3. 自動更新対象

- **README.md** - 機能追加情報
- **docs/detailed/detailed_design.html** - API仕様
- **CLAUDE.md** - セッション履歴
- **docs/updates.json** - 更新情報のデータベース

## 📈 ログとレポート

### 1時間毎レポート内容

```
📊 === チャット監視デーモン 1時間レポート ===
🕐 稼働時間: 2時間30分
📄 処理ファイル数: 5
📋 設計書更新数: 3  
📝 チャット記録数: 5
❌ エラー数: 0
📁 監視ディレクトリ: /Users/username/Downloads
🔍 処理済みファイル: 12
================================================
💾 メモリ使用量: RSS=45MB, Heap=23MB
```

### ログファイル

- **場所**: `logs/chat_monitor.log`
- **形式**: `[timestamp] [level] message`
- **ローテーション**: 手動（定期クリーンアップ機能付き）

## 🔧 トラブルシューティング

### よくある問題

#### 1. デーモンが起動しない
```bash
# Node.jsの確認
node --version

# 依存パッケージの確認
npm install chokidar

# 権限の確認
chmod +x scripts/chat_monitor_daemon.js
```

#### 2. ファイルが検出されない
- ファイル名パターンを確認
- 監視ディレクトリのパスを確認
- ファイル権限を確認

#### 3. 処理済みファイルが再処理される
- タイムスタンプベースの重複判定
- 7日後に自動クリーンアップ

### デバッグ方法

```bash
# 詳細ログでデーモン実行
node scripts/chat_monitor_daemon.js --watch-dir . --interval 60

# 手動でファイル処理をテスト
node scripts/update_docs_from_chat.js test-chat.txt
```

## 🔒 セキュリティ

- ファイル監視は読み取り専用
- 機密情報のログ出力を回避
- プロセス権限の最小化

## 📝 カスタマイズ

### 抽出パターンの追加

`chat_monitor_daemon.js`の`patterns`オブジェクトを編集：

```javascript
this.patterns.customCategory = [
    /カスタムパターン[:：]\s*(.+)/gi
];
```

### 監視対象ファイルの追加

`chatFilePatterns`配列に正規表現を追加：

```javascript
/^my_custom_pattern.*\.txt$/i
```

## 📞 サポート

問題が発生した場合は、以下の情報を確認してください：

1. ログファイル: `logs/chat_monitor.log`
2. プロセス状態: `./scripts/setup_chat_monitoring.sh status`
3. システム要件: Node.js, npm, chokidar

---

*このガイドは自動生成された設計書の一部です。*