#!/usr/bin/env node

/**
 * チャット監視デーモン - 設計書自動更新とチャット記録の常時実行
 * 
 * 機能:
 * - チャットディレクトリの監視
 * - 新しいチャットファイルの自動検出
 * - 設計書の自動更新
 * - CLAUDE.mdへの自動記録
 * - 1時間毎のログ出力
 * 
 * 使用方法:
 * node scripts/chat_monitor_daemon.js [--watch-dir /path/to/chat/files] [--interval 3600]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar');

class ChatMonitorDaemon {
    constructor(options = {}) {
        this.watchDir = options.watchDir || path.join(process.env.HOME, 'Downloads');
        this.interval = options.interval || 3600000; // 1時間 = 3600秒 = 3600000ms
        this.projectRoot = path.join(__dirname, '..');
        
        // 処理済みファイルの記録
        this.processedFiles = new Set();
        this.lastProcessTime = Date.now();
        
        // 統計情報
        this.stats = {
            filesProcessed: 0,
            docsUpdated: 0,
            chatRecorded: 0,
            errors: 0,
            startTime: new Date()
        };
        
        // ログファイル
        this.logFile = path.join(this.projectRoot, 'logs', 'chat_monitor.log');
        this.ensureLogDirectory();
        
        // 監視対象のファイルパターン
        this.chatFilePatterns = [
            /^chat.*\.txt$/i,
            /^conversation.*\.txt$/i,
            /^claude.*\.txt$/i,
            /.*chat.*export.*\.csv$/i,
            /.*conversation.*\.json$/i
        ];
        
        this.log('🚀 チャット監視デーモンを開始します');
        this.log(`📁 監視ディレクトリ: ${this.watchDir}`);
        this.log(`⏰ ログ出力間隔: ${this.interval / 1000 / 60}分`);
    }
    
    /**
     * ログディレクトリの確保
     */
    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    
    /**
     * ログ出力（コンソール + ファイル）
     */
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        // コンソール出力
        console.log(logMessage);
        
        // ファイル出力
        try {
            fs.appendFileSync(this.logFile, logMessage + '\n');
        } catch (error) {
            console.error('ログファイル書き込みエラー:', error);
        }
    }
    
    /**
     * チャットファイル判定
     */
    isChatFile(filename) {
        return this.chatFilePatterns.some(pattern => pattern.test(filename));
    }
    
    /**
     * ファイル処理の実行
     */
    async processFile(filePath) {
        const filename = path.basename(filePath);
        const fileKey = `${filePath}:${fs.statSync(filePath).mtime.getTime()}`;
        
        // 処理済みファイルのチェック
        if (this.processedFiles.has(fileKey)) {
            return;
        }
        
        this.log(`📝 新しいチャットファイルを検出: ${filename}`);
        
        try {
            // 設計書更新スクリプトの実行
            await this.runDocumentUpdater(filePath);
            
            // チャット記録スクリプトの実行  
            await this.runChatRecorder(filePath);
            
            // 処理済みとしてマーク
            this.processedFiles.add(fileKey);
            this.stats.filesProcessed++;
            
            this.log(`✅ ファイル処理完了: ${filename}`);
            
        } catch (error) {
            this.stats.errors++;
            this.log(`❌ ファイル処理エラー: ${filename} - ${error.message}`, 'ERROR');
        }
    }
    
    /**
     * 設計書更新スクリプトの実行
     */
    async runDocumentUpdater(filePath) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(this.projectRoot, 'scripts', 'update_docs_from_chat.js');
            const child = spawn('node', [scriptPath, filePath], {
                cwd: this.projectRoot,
                stdio: 'pipe'
            });
            
            let output = '';
            let errorOutput = '';
            
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    this.stats.docsUpdated++;
                    this.log('📋 設計書更新完了');
                    resolve(output);
                } else {
                    reject(new Error(`設計書更新失敗 (code: ${code}): ${errorOutput}`));
                }
            });
            
            child.on('error', reject);
        });
    }
    
    /**
     * チャット記録スクリプトの実行
     */
    async runChatRecorder(filePath) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(this.projectRoot, 'scripts', 'record_chat_to_claude.js');
            const sessionName = `自動記録_${new Date().toLocaleDateString('ja-JP')}`;
            
            const child = spawn('node', [scriptPath, '--file', filePath, '--session', sessionName], {
                cwd: this.projectRoot,
                stdio: 'pipe'
            });
            
            let output = '';
            let errorOutput = '';
            
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    this.stats.chatRecorded++;
                    this.log('📝 CLAUDE.md記録完了');
                    resolve(output);
                } else {
                    reject(new Error(`チャット記録失敗 (code: ${code}): ${errorOutput}`));
                }
            });
            
            child.on('error', reject);
        });
    }
    
    /**
     * 1時間毎の統計レポート
     */
    generateHourlyReport() {
        const uptime = Date.now() - this.stats.startTime.getTime();
        const uptimeHours = Math.floor(uptime / 1000 / 60 / 60);
        const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / 1000 / 60);
        
        const report = [
            '📊 === チャット監視デーモン 1時間レポート ===',
            `🕐 稼働時間: ${uptimeHours}時間${uptimeMinutes}分`,
            `📄 処理ファイル数: ${this.stats.filesProcessed}`,
            `📋 設計書更新数: ${this.stats.docsUpdated}`,
            `📝 チャット記録数: ${this.stats.chatRecorded}`,
            `❌ エラー数: ${this.stats.errors}`,
            `📁 監視ディレクトリ: ${this.watchDir}`,
            `🔍 処理済みファイル: ${this.processedFiles.size}`,
            '================================================'
        ].join('\n');
        
        this.log(report);
        
        // メモリ使用量も記録
        const memUsage = process.memoryUsage();
        this.log(`💾 メモリ使用量: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB`);
    }
    
    /**
     * 既存ファイルの初期スキャン
     */
    async initialScan() {
        this.log('🔍 既存ファイルの初期スキャンを開始');
        
        try {
            const files = fs.readdirSync(this.watchDir);
            const chatFiles = files.filter(file => this.isChatFile(file));
            
            this.log(`📁 ${chatFiles.length}個のチャットファイルを発見`);
            
            for (const file of chatFiles) {
                const filePath = path.join(this.watchDir, file);
                const stats = fs.statSync(filePath);
                
                // 24時間以内に作成/更新されたファイルのみ処理
                const ageHours = (Date.now() - stats.mtime.getTime()) / 1000 / 60 / 60;
                if (ageHours <= 24) {
                    await this.processFile(filePath);
                }
            }
            
            this.log('✅ 初期スキャン完了');
            
        } catch (error) {
            this.log(`❌ 初期スキャンエラー: ${error.message}`, 'ERROR');
        }
    }
    
    /**
     * ファイル監視の開始
     */
    startFileWatcher() {
        const watcher = chokidar.watch(this.watchDir, {
            ignored: /(^|[\/\\])\../, // 隠しファイルを無視
            persistent: true,
            ignoreInitial: true // 初期スキャンは手動で行う
        });
        
        watcher.on('add', (filePath) => {
            const filename = path.basename(filePath);
            if (this.isChatFile(filename)) {
                this.log(`📁 新しいファイル検出: ${filename}`);
                // 少し遅延してから処理（ファイル書き込み完了を待つ）
                setTimeout(() => {
                    this.processFile(filePath);
                }, 2000);
            }
        });
        
        watcher.on('change', (filePath) => {
            const filename = path.basename(filePath);
            if (this.isChatFile(filename)) {
                this.log(`📝 ファイル更新検出: ${filename}`);
                setTimeout(() => {
                    this.processFile(filePath);
                }, 2000);
            }
        });
        
        watcher.on('error', (error) => {
            this.log(`❌ ファイル監視エラー: ${error.message}`, 'ERROR');
        });
        
        this.log('👁️  ファイル監視を開始しました');
        return watcher;
    }
    
    /**
     * 定期レポートの開始
     */
    startPeriodicReporting() {
        // 即座に最初のレポートを出力
        this.generateHourlyReport();
        
        // 定期実行を設定
        const interval = setInterval(() => {
            this.generateHourlyReport();
        }, this.interval);
        
        this.log(`⏰ 定期レポート開始（${this.interval / 1000 / 60}分間隔）`);
        return interval;
    }
    
    /**
     * 古い処理済みファイル記録のクリーンアップ
     */
    cleanupProcessedFiles() {
        const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7日前
        const toRemove = [];
        
        for (const fileKey of this.processedFiles) {
            const [, timestampStr] = fileKey.split(':');
            const timestamp = parseInt(timestampStr);
            
            if (timestamp < cutoffTime) {
                toRemove.push(fileKey);
            }
        }
        
        toRemove.forEach(key => this.processedFiles.delete(key));
        
        if (toRemove.length > 0) {
            this.log(`🧹 古い処理記録をクリーンアップ: ${toRemove.length}件`);
        }
    }
    
    /**
     * デーモンの開始
     */
    async start() {
        try {
            // 既存ファイルの初期スキャン
            await this.initialScan();
            
            // ファイル監視開始
            const watcher = this.startFileWatcher();
            
            // 定期レポート開始
            const reportInterval = this.startPeriodicReporting();
            
            // 定期クリーンアップ（6時間毎）
            const cleanupInterval = setInterval(() => {
                this.cleanupProcessedFiles();
            }, 6 * 60 * 60 * 1000);
            
            // 終了処理
            const cleanup = () => {
                this.log('🛑 チャット監視デーモンを停止します');
                watcher.close();
                clearInterval(reportInterval);
                clearInterval(cleanupInterval);
                this.generateHourlyReport(); // 最終レポート
                process.exit(0);
            };
            
            process.on('SIGINT', cleanup);
            process.on('SIGTERM', cleanup);
            
            this.log('✅ チャット監視デーモンが正常に開始されました');
            
        } catch (error) {
            this.log(`❌ デーモン開始エラー: ${error.message}`, 'ERROR');
            process.exit(1);
        }
    }
}

// スクリプト実行
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};
    
    // コマンドライン引数の解析
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--watch-dir':
                options.watchDir = args[++i];
                break;
            case '--interval':
                options.interval = parseInt(args[++i]) * 1000; // 秒 → ミリ秒
                break;
            case '--help':
                console.log(`
使用方法: node chat_monitor_daemon.js [options]

オプション:
  --watch-dir <path>    監視するディレクトリ (default: ~/Downloads)
  --interval <seconds>  レポート出力間隔(秒) (default: 3600)
  --help               このヘルプを表示

例:
  node chat_monitor_daemon.js
  node chat_monitor_daemon.js --watch-dir /path/to/chats --interval 1800
                `);
                process.exit(0);
                break;
        }
    }
    
    const daemon = new ChatMonitorDaemon(options);
    daemon.start();
}

module.exports = ChatMonitorDaemon;