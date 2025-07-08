#!/bin/bash

# チャット監視デーモンのセットアップスクリプト
# Usage: ./setup_chat_monitoring.sh [start|stop|restart|status]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DAEMON_SCRIPT="$SCRIPT_DIR/chat_monitor_daemon.js"
PID_FILE="$PROJECT_ROOT/logs/chat_monitor.pid"
LOG_FILE="$PROJECT_ROOT/logs/chat_monitor.log"

# ログディレクトリを作成
mkdir -p "$PROJECT_ROOT/logs"

# 関数定義
start_daemon() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "🔄 チャット監視デーモンは既に実行中です (PID: $(cat "$PID_FILE"))"
        return 1
    fi
    
    echo "🚀 チャット監視デーモンを開始します..."
    
    # Node.jsの存在確認
    if ! command -v node &> /dev/null; then
        echo "❌ エラー: Node.jsがインストールされていません"
        return 1
    fi
    
    # 必要なパッケージの確認
    cd "$PROJECT_ROOT"
    if ! npm list chokidar &> /dev/null; then
        echo "📦 chokidarパッケージをインストールします..."
        npm install chokidar
    fi
    
    # デーモンを開始
    nohup node "$DAEMON_SCRIPT" > "$LOG_FILE" 2>&1 &
    DAEMON_PID=$!
    
    # PIDファイルに記録
    echo $DAEMON_PID > "$PID_FILE"
    
    # 起動確認
    sleep 3
    if kill -0 $DAEMON_PID 2>/dev/null; then
        echo "✅ チャット監視デーモンが開始されました (PID: $DAEMON_PID)"
        echo "📝 ログファイル: $LOG_FILE"
        echo "🔍 監視ディレクトリ: ~/Downloads"
        echo ""
        echo "リアルタイムログを確認するには:"
        echo "  tail -f $LOG_FILE"
        return 0
    else
        echo "❌ デーモンの開始に失敗しました"
        rm -f "$PID_FILE"
        return 1
    fi
}

stop_daemon() {
    if [ ! -f "$PID_FILE" ]; then
        echo "⚠️  PIDファイルが見つかりません。デーモンは停止している可能性があります"
        return 1
    fi
    
    local PID=$(cat "$PID_FILE")
    
    if kill -0 "$PID" 2>/dev/null; then
        echo "🛑 チャット監視デーモンを停止します (PID: $PID)..."
        kill -TERM "$PID"
        
        # 終了を待つ
        local count=0
        while kill -0 "$PID" 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            ((count++))
        done
        
        if kill -0 "$PID" 2>/dev/null; then
            echo "⚠️  通常終了に失敗しました。強制終了します..."
            kill -KILL "$PID"
        fi
        
        rm -f "$PID_FILE"
        echo "✅ チャット監視デーモンを停止しました"
        return 0
    else
        echo "⚠️  プロセス (PID: $PID) は既に停止しています"
        rm -f "$PID_FILE"
        return 1
    fi
}

restart_daemon() {
    echo "🔄 チャット監視デーモンを再起動します..."
    stop_daemon
    sleep 2
    start_daemon
}

status_daemon() {
    if [ ! -f "$PID_FILE" ]; then
        echo "⚫ チャット監視デーモンは停止中"
        return 1
    fi
    
    local PID=$(cat "$PID_FILE")
    
    if kill -0 "$PID" 2>/dev/null; then
        echo "🟢 チャット監視デーモンは実行中 (PID: $PID)"
        
        # プロセス情報を表示
        if command -v ps &> /dev/null; then
            echo ""
            echo "📊 プロセス情報:"
            ps -p "$PID" -o pid,ppid,cmd,etime,rss
        fi
        
        # ログファイルの最後の数行を表示
        if [ -f "$LOG_FILE" ]; then
            echo ""
            echo "📝 最新のログ (最後の5行):"
            tail -n 5 "$LOG_FILE"
        fi
        
        return 0
    else
        echo "⚫ チャット監視デーモンは停止中 (PIDファイルは存在)"
        rm -f "$PID_FILE"
        return 1
    fi
}

install_service() {
    echo "🔧 システムサービスとしてインストールします..."
    
    # macOS (launchd)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        local PLIST_FILE="$HOME/Library/LaunchAgents/com.personaagents.chatmonitor.plist"
        
        cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.personaagents.chatmonitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>node</string>
        <string>$DAEMON_SCRIPT</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PROJECT_ROOT</string>
    <key>StandardOutPath</key>
    <string>$LOG_FILE</string>
    <key>StandardErrorPath</key>
    <string>$LOG_FILE</string>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF
        
        echo "✅ launchd設定ファイルを作成しました: $PLIST_FILE"
        echo ""
        echo "サービスを開始するには:"
        echo "  launchctl load $PLIST_FILE"
        echo ""
        echo "サービスを停止するには:"
        echo "  launchctl unload $PLIST_FILE"
        
    # Linux (systemd)
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        local SERVICE_FILE="/etc/systemd/system/personaagents-chatmonitor.service"
        
        echo "📝 systemd設定ファイルを作成します (sudo権限が必要)..."
        
        sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=PersonaAgents Chat Monitor Daemon
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_ROOT
ExecStart=node $DAEMON_SCRIPT
Restart=always
RestartSec=10
StandardOutput=append:$LOG_FILE
StandardError=append:$LOG_FILE

[Install]
WantedBy=multi-user.target
EOF
        
        echo "✅ systemd設定ファイルを作成しました: $SERVICE_FILE"
        echo ""
        echo "サービスを有効化して開始するには:"
        echo "  sudo systemctl enable personaagents-chatmonitor"
        echo "  sudo systemctl start personaagents-chatmonitor"
        echo ""
        echo "サービスの状態を確認するには:"
        echo "  sudo systemctl status personaagents-chatmonitor"
        
    else
        echo "⚠️  このOSではシステムサービスの自動インストールは対応していません"
        echo "手動でサービス設定を行ってください"
        return 1
    fi
}

show_usage() {
    cat << EOF
🤖 PersonaAgents チャット監視デーモン管理スクリプト

使用方法:
  $0 [command]

コマンド:
  start       デーモンを開始
  stop        デーモンを停止  
  restart     デーモンを再起動
  status      デーモンの状態を確認
  install     システムサービスとしてインストール
  logs        リアルタイムログを表示
  help        このヘルプを表示

例:
  $0 start              # デーモンを開始
  $0 status             # 状態確認
  $0 logs               # ログをリアルタイム表示

ファイル:
  設定: $DAEMON_SCRIPT
  PID:  $PID_FILE  
  ログ: $LOG_FILE
EOF
}

show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "📝 チャット監視デーモンのリアルタイムログ:"
        echo "   (Ctrl+C で終了)"
        echo ""
        tail -f "$LOG_FILE"
    else
        echo "❌ ログファイルが見つかりません: $LOG_FILE"
        return 1
    fi
}

# メイン処理
case "${1:-help}" in
    start)
        start_daemon
        ;;
    stop)
        stop_daemon
        ;;
    restart)
        restart_daemon
        ;;
    status)
        status_daemon
        ;;
    install)
        install_service
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo "❌ 不明なコマンド: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac