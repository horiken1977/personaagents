#!/bin/bash

# crontab設定スクリプト
# 1時間毎に自動記録を実行するcrontabエントリを設定

PROJECT_DIR="/Users/aa479881/Library/CloudStorage/OneDrive-IBM/Personal/development/personaagents"
SCRIPT_PATH="$PROJECT_DIR/scripts/auto_record.sh"

echo "PersonaAgents 自動記録のcrontab設定"
echo "===================================="

# 現在のcrontabを確認
echo "現在のcrontab設定:"
crontab -l 2>/dev/null || echo "crontabエントリなし"

echo ""
echo "追加するcrontabエントリ:"
echo "0 * * * * $SCRIPT_PATH"
echo ""

read -p "この設定を追加しますか？ (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 既存のcrontabを取得して新しいエントリを追加
    (crontab -l 2>/dev/null; echo "0 * * * * $SCRIPT_PATH") | crontab -
    echo "✅ crontabに追加しました"
    echo ""
    echo "新しいcrontab設定:"
    crontab -l
    echo ""
    echo "🔄 1時間毎（毎時0分）に自動記録が実行されます"
    echo "📝 ログは $PROJECT_DIR/logs/ に保存されます"
else
    echo "❌ 設定をキャンセルしました"
fi

echo ""
echo "手動実行方法:"
echo "  ./scripts/auto_record.sh"
echo ""
echo "連続監視方法:"
echo "  ./scripts/start_monitor.sh"