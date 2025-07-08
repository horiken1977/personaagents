# Vercel プロジェクト設定ガイド

## 問題
GitHub ActionsでVercelデプロイが失敗: `Error! Project not found`

## 解決方法

### オプション1: Vercelダッシュボードから情報を取得

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. `personaagents` プロジェクトを探す
3. プロジェクトの Settings → General に移動
4. 以下の情報を確認：
   - **Project ID**: プロジェクト設定ページのURLまたは設定内に表示
   - **Team/Org ID**: 個人アカウントの場合は不要、チームの場合はチーム設定から取得

### オプション2: Vercel CLIで新規プロジェクトを作成

```bash
# 1. Vercel CLIをインストール
npm i -g vercel

# 2. ログイン
vercel login

# 3. プロジェクトディレクトリで実行
cd /path/to/personaagents
vercel

# 4. 以下の質問に答える：
# - Set up and deploy? → Y
# - Which scope? → あなたのアカウントを選択
# - Link to existing project? → N（新規作成）または Y（既存プロジェクト）
# - Project name? → personaagents
# - Directory? → ./

# 5. .vercel/project.json が作成される
cat .vercel/project.json
```

### オプション3: 手動でプロジェクトをインポート

1. [Vercel Import](https://vercel.com/new) にアクセス
2. GitHubリポジトリ `horiken1977/personaagents` をインポート
3. プロジェクト設定で以下を確認：
   - Framework Preset: `Other`
   - Root Directory: `./`
   - Build Command: （空白）
   - Output Directory: `./`

## GitHub Secretsの設定

プロジェクト情報を取得したら、GitHubで設定：

1. リポジトリの Settings → Secrets and variables → Actions
2. 以下を追加/更新：
   ```
   VERCEL_TOKEN=xxx（Vercelアカウント設定から取得）
   VERCEL_ORG_ID=xxx（.vercel/project.jsonのorgIdまたはチームID）
   VERCEL_PROJECT_ID=xxx（.vercel/project.jsonのprojectId）
   ```

## 環境変数の設定（Vercel側）

Vercelダッシュボードで：
1. プロジェクトの Settings → Environment Variables
2. 以下を追加：
   ```
   OPENAI_API_KEY=sk-xxx
   ANTHROPIC_API_KEY=sk-ant-xxx
   GOOGLE_AI_API_KEY=AIza-xxx
   ALLOWED_ORIGINS=https://personaagents-h6bpmq747-horikens-projects.vercel.app
   DEBUG_MODE=false
   ```

## 注意事項

- `.vercel` ディレクトリはgitignoreに追加（機密情報を含む）
- Vercel PHPランタイムは実験的機能のため、制限がある可能性
- 本番環境ではNext.js/Node.jsへの移行を推奨