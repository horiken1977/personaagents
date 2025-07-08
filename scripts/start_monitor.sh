#!/bin/bash

# PersonaAgents 監視スクリプト起動
# 1時間毎に自動記録を実行し、ターミナルに出力

PROJECT_DIR="/Users/aa479881/Library/CloudStorage/OneDrive-IBM/Personal/development/personaagents"
SCRIPT_PATH="$PROJECT_DIR/scripts/auto_record.sh"
LOG_FILE="$PROJECT_DIR/logs/monitor_$(date '+%Y-%m-%d').log"

echo "PersonaAgents 自動記録監視を開始します..."
echo "監視開始時刻: $(date)"
echo "ログファイル: $LOG_FILE"
echo "実行間隔: 1時間毎"
echo "停止方法: Ctrl+C"
echo "=================================="

# 初回実行
echo "初回記録を実行..."
"$SCRIPT_PATH"

# 1時間毎の実行ループ
while true; do
    echo "次回実行まで1時間待機中... ($(date '+%H:%M:%S'))"
    sleep 3600  # 1時間 = 3600秒
    
    echo "定期記録を実行中... ($(date '+%H:%M:%S'))"
    "$SCRIPT_PATH" 2>&1 | tee -a "$LOG_FILE"
done