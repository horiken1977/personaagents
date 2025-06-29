# ROIC分析アプリケーション 進捗管理システム

## 概要

このシステムは、マークダウンファイル（`project-progress.md`）を自動的に監視し、進捗が更新されると美しいHTMLダッシュボード（`progress-dashboard.html`）を自動生成します。

## ファイル構成

```
docs/
├── project-progress.md      # 進捗管理用マークダウンファイル（編集対象）
├── progress-dashboard.html  # 自動生成されるHTMLダッシュボード
├── progress-generator.js    # HTMLダッシュボード生成スクリプト
├── package.json            # Node.js依存関係
└── README.md              # このファイル
```

## セットアップ

1. **依存関係のインストール**
   ```bash
   cd docs
   npm install
   ```

## 使用方法

### 1. 一回だけHTMLを生成する場合

```bash
cd docs
npm run build
```

または

```bash
cd docs
node progress-generator.js
```

### 2. マークダウンファイルを監視して自動更新する場合

```bash
cd docs
npm run watch
```

または

```bash
cd docs
node progress-generator.js --watch
```

**注意:** 監視モードでは、`project-progress.md`ファイルが変更されるたびに自動的にHTMLダッシュボードが更新されます。終了するには `Ctrl+C` を押してください。

### 3. 初回セットアップから監視開始まで一括実行

```bash
cd docs
npm start
```

## 進捗の更新方法

1. `project-progress.md`ファイルを開く
2. 完了したタスクのチェックボックスを更新する
   - 未完了: `- [ ] **タスク名**`
   - 完了: `- [x] **タスク名**`
3. ファイルを保存
4. 監視モードが動いている場合、自動的にHTMLダッシュボードが更新される

## HTMLダッシュボードの機能

- **リアルタイム統計**: 総タスク数、完了タスク数、完了率
- **視覚的進捗バー**: 全体の完了率をバーで表示
- **タスク一覧**: 各タスクの状態と優先度を色分け表示
- **レスポンシブデザイン**: PC・タブレット・スマホ対応
- **自動リロード**: 5秒間隔でページを自動更新（監視モード時）

## カスタマイズ

### スタイルの変更
`progress-generator.js`の`generateHTML()`メソッド内のCSSを編集してください。

### データ構造の変更
マークダウンの解析ロジックは`parseMarkdown()`メソッドで制御されています。

### 更新間隔の変更
HTMLファイル内の自動リロード間隔は以下の行で変更できます：
```javascript
setInterval(() => {
    window.location.reload();
}, 5000); // 5000ms = 5秒
```

## トラブルシューティング

### よくある問題

1. **「module not found」エラー**
   ```bash
   cd docs
   npm install
   ```

2. **HTMLが生成されない**
   - `project-progress.md`ファイルが存在することを確認
   - ファイルの読み取り権限を確認

3. **監視が動作しない**
   - ファイルパスが正しいことを確認
   - 別のプロセスでファイルがロックされていないか確認

### ログの確認
監視モードではコンソールにログが表示されます：
```
Watching for changes in: /path/to/project-progress.md
Progress dashboard updated: /path/to/progress-dashboard.html
```

## 開発者向け情報

### 依存関係
- **Node.js**: v14以上推奨
- **marked**: マークダウンパーサー（HTMLダッシュボード生成では直接使用していませんが、将来の拡張用）

### API
`ProgressGenerator`クラスの主要メソッド：
- `parseMarkdown(content)`: マークダウンコンテンツを解析
- `generateHTML(data)`: HTMLダッシュボードを生成
- `generateDashboard()`: 一回だけHTMLを生成
- `watchFile()`: ファイル監視を開始