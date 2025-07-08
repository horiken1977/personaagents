#!/bin/bash

# PersonaAgent 自動記録スクリプト
# チャット内容と作業内容を1時間毎にCLAUDE.mdに記録

# 設定
PROJECT_DIR="/Users/aa479881/Library/CloudStorage/OneDrive-IBM/Personal/development/personaagent"
CLAUDE_MD="$PROJECT_DIR/CLAUDE.md"
LOGS_DIR="$PROJECT_DIR/logs"
EXPORTS_DIR="$PROJECT_DIR/exports"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
DATE_HOUR=$(date '+%Y-%m-%d_%H')

# ログファイル
RECORD_LOG="$LOGS_DIR/auto_record_${DATE_HOUR}.log"

# 関数: ログ出力
log_message() {
    echo "[$TIMESTAMP] $1" | tee -a "$RECORD_LOG"
}

# 関数: チャット履歴の確認
check_chat_activity() {
    local activity_count=0
    
    # 過去1時間のアクセスログを確認
    if [[ -f "$LOGS_DIR/access.log" ]]; then
        local hour_ago=$(date -v-1H '+%d/%b/%Y:%H')
        local log_count=$(grep "$hour_ago" "$LOGS_DIR/access.log" 2>/dev/null | grep -c "api.php\|chat.html" 2>/dev/null)
        activity_count=${log_count:-0}
    fi
    
    # エクスポートディレクトリの新しいファイルを確認
    if [[ -d "$EXPORTS_DIR" ]]; then
        local new_exports=$(find "$EXPORTS_DIR" -name "*.csv" -newer "$LOGS_DIR/access.log" 2>/dev/null | wc -l | tr -d ' ')
        activity_count=$((${activity_count:-0} + ${new_exports:-0}))
    fi
    
    echo $activity_count
}

# 関数: Git活動の確認
check_git_activity() {
    cd "$PROJECT_DIR" || exit 1
    local commits_count=$(git log --since='1 hour ago' --oneline 2>/dev/null | wc -l)
    echo $commits_count
}

# 関数: CLAUDE.mdに記録を追加
update_claude_md() {
    local chat_activity=$1
    local git_activity=$2
    local summary="$3"
    
    # バックアップを作成
    cp "$CLAUDE_MD" "${CLAUDE_MD}.backup_${DATE_HOUR}"
    
    # 新しい記録セクションを作成
    local new_section="
## 自動記録 - $TIMESTAMP

### 活動サマリー
- **チャット活動**: ${chat_activity}件のAPI呼び出し/エクスポート
- **Git活動**: ${git_activity}件のコミット
- **記録時刻**: $TIMESTAMP

### システム状態
- **ログファイルサイズ**: $(du -h "$LOGS_DIR" 2>/dev/null | tail -1 | cut -f1 || echo "不明")
- **エクスポートファイル数**: $(find "$EXPORTS_DIR" -name "*.csv" 2>/dev/null | wc -l || echo "0")
- **最新コミット**: $(cd "$PROJECT_DIR" && git log -1 --oneline 2>/dev/null || echo "取得失敗")

$summary
"
    
    # CLAUDE.mdの最後に追加
    echo "$new_section" >> "$CLAUDE_MD"
}

# 関数: ターミナル出力
terminal_output() {
    local chat_activity=$1
    local git_activity=$2
    
    echo "======================================"
    echo "PersonaAgent 自動記録 - $TIMESTAMP"
    echo "======================================"
    echo "📊 チャット活動: ${chat_activity}件"
    echo "🔄 Git活動: ${git_activity}件"
    echo "📁 ログディレクトリ: $LOGS_DIR"
    echo "📝 記録ファイル: $CLAUDE_MD"
    echo "======================================"
    
    if [[ $chat_activity -gt 0 || $git_activity -gt 0 ]]; then
        echo "✅ 活動を検出しました - CLAUDE.mdを更新"
    else
        echo "ℹ️  活動なし - 監視継続中"
    fi
    echo ""
}

# メイン処理
main() {
    log_message "自動記録スクリプト開始"
    
    # ディレクトリの確認・作成
    mkdir -p "$LOGS_DIR" "$EXPORTS_DIR"
    
    # 活動チェック
    chat_activity=$(check_chat_activity)
    git_activity=$(check_git_activity)
    
    # ターミナル出力
    terminal_output "$chat_activity" "$git_activity"
    
    # 活動があった場合のみCLAUDE.mdを更新
    if [[ $chat_activity -gt 0 || $git_activity -gt 0 ]]; then
        local summary="### 検出された活動詳細
- API呼び出しまたはエクスポート: ${chat_activity}件
- コミット: ${git_activity}件
- 記録方式: 自動記録スクリプト v1.0"
        
        update_claude_md "$chat_activity" "$git_activity" "$summary"
        log_message "CLAUDE.mdを更新しました (チャット:$chat_activity, Git:$git_activity)"
        
        # Git に自動コミット（オプション）
        cd "$PROJECT_DIR"
        if [[ -n "$(git status --porcelain CLAUDE.md 2>/dev/null)" ]]; then
            git add CLAUDE.md
            git commit -m "auto: $TIMESTAMP の活動記録を追加 (チャット:${chat_activity}件, Git:${git_activity}件)"
            log_message "変更をGitにコミットしました"
        fi
    else
        log_message "活動なし - 記録をスキップ"
    fi
    
    log_message "自動記録スクリプト完了"
}

# スクリプト実行
main "$@"