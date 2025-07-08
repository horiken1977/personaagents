#!/usr/bin/env node

/**
 * チャット内容を自動的にCLAUDE.mdに記録するスクリプト
 * 
 * 使用方法:
 * node scripts/record_chat_to_claude.js "チャットメッセージ" [--session "セッション名"]
 * node scripts/record_chat_to_claude.js --file chat-export.txt [--session "セッション名"]
 */

const fs = require('fs');
const path = require('path');

class ChatRecorder {
    constructor() {
        this.claudePath = path.join(__dirname, '../CLAUDE.md');
        this.sessionCounter = this.getLastSessionNumber() + 1;
    }

    /**
     * 最後のセッション番号を取得
     */
    getLastSessionNumber() {
        if (!fs.existsSync(this.claudePath)) {
            return 0;
        }

        const content = fs.readFileSync(this.claudePath, 'utf8');
        const matches = content.match(/### 第(\d+)回セッション/g);
        
        if (!matches) {
            return 0;
        }

        const numbers = matches.map(match => {
            const num = match.match(/第(\d+)回/);
            return num ? parseInt(num[1]) : 0;
        });

        return Math.max(...numbers);
    }

    /**
     * チャットメッセージから重要な情報を抽出
     */
    extractKeyInfo(message) {
        const keyInfo = {
            features: [],
            fixes: [],
            configs: [],
            deployments: [],
            documentation: [],
            errors: [],
            todos: []
        };

        // 機能追加/実装
        const featurePatterns = [
            /(?:追加|実装|作成)(?:した|しました|完了)[:：]\s*(.+)/gi,
            /新機能[:：]\s*(.+)/gi,
            /feat[:：]\s*(.+)/gi,
            /(?:作成|追加)しました。?\s*[:：]?\s*(.+)/gi
        ];

        // バグ修正
        const fixPatterns = [
            /(?:修正|fix|fixed)[:：]\s*(.+)/gi,
            /(?:エラー|バグ)を?修正[:：]\s*(.+)/gi,
            /問題を?解決[:：]\s*(.+)/gi
        ];

        // 設定変更
        const configPatterns = [
            /設定(?:を?変更|追加|更新)[:：]\s*(.+)/gi,
            /環境変数[:：]\s*(.+)/gi,
            /config[:：]\s*(.+)/gi
        ];

        // デプロイ関連
        const deployPatterns = [
            /デプロイ(?:先|設定|完了)[:：]\s*(.+)/gi,
            /(?:Vercel|AWS|Sakura)(?:へ|に|の)(.+)/gi,
            /deployment[:：]\s*(.+)/gi
        ];

        // ドキュメント更新
        const docPatterns = [
            /(?:README|ドキュメント|文書)(?:を?更新|追加)[:：]\s*(.+)/gi,
            /(?:\.md|\.txt)ファイル(?:を?作成|更新)[:：]\s*(.+)/gi
        ];

        // エラー/問題
        const errorPatterns = [
            /エラー[:：]\s*(.+)/gi,
            /(?:失敗|問題|issue)[:：]\s*(.+)/gi,
            /(?:Error|Failed)[:：]\s*(.+)/gi
        ];

        // TODO/タスク
        const todoPatterns = [
            /TODO[:：]\s*(.+)/gi,
            /(?:次回|今後)の?(?:タスク|課題)[:：]\s*(.+)/gi,
            /(?:要|必要)(?:実装|対応)[:：]\s*(.+)/gi
        ];

        // パターンマッチング実行
        const applyPatterns = (patterns, category) => {
            patterns.forEach(pattern => {
                const matches = message.matchAll(pattern);
                for (const match of matches) {
                    if (match[1]) {
                        keyInfo[category].push(match[1].trim());
                    }
                }
            });
        };

        applyPatterns(featurePatterns, 'features');
        applyPatterns(fixPatterns, 'fixes');
        applyPatterns(configPatterns, 'configs');
        applyPatterns(deployPatterns, 'deployments');
        applyPatterns(docPatterns, 'documentation');
        applyPatterns(errorPatterns, 'errors');
        applyPatterns(todoPatterns, 'todos');

        return keyInfo;
    }

    /**
     * セッション記録を生成
     */
    generateSessionRecord(messages, sessionName = null) {
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toTimeString().split(' ')[0];
        
        let record = `### 第${this.sessionCounter}回セッション: ${date} ${time}\n`;
        
        if (sessionName) {
            record += `- **セッション名**: ${sessionName}\n`;
        }

        // すべてのメッセージから情報を抽出
        const allKeyInfo = {
            features: [],
            fixes: [],
            configs: [],
            deployments: [],
            documentation: [],
            errors: [],
            todos: []
        };

        messages.forEach(message => {
            const keyInfo = this.extractKeyInfo(message);
            Object.keys(keyInfo).forEach(key => {
                allKeyInfo[key].push(...keyInfo[key]);
            });
        });

        // 重複を削除
        Object.keys(allKeyInfo).forEach(key => {
            allKeyInfo[key] = [...new Set(allKeyInfo[key])];
        });

        // 実装内容
        if (allKeyInfo.features.length > 0) {
            record += '\n#### 🎯 実装内容\n';
            allKeyInfo.features.forEach(feature => {
                record += `- ${feature}\n`;
            });
        }

        // バグ修正
        if (allKeyInfo.fixes.length > 0) {
            record += '\n#### 🐛 バグ修正\n';
            allKeyInfo.fixes.forEach(fix => {
                record += `- ${fix}\n`;
            });
        }

        // 設定変更
        if (allKeyInfo.configs.length > 0) {
            record += '\n#### ⚙️ 設定変更\n';
            allKeyInfo.configs.forEach(config => {
                record += `- ${config}\n`;
            });
        }

        // デプロイ
        if (allKeyInfo.deployments.length > 0) {
            record += '\n#### 🚀 デプロイ\n';
            allKeyInfo.deployments.forEach(deploy => {
                record += `- ${deploy}\n`;
            });
        }

        // ドキュメント
        if (allKeyInfo.documentation.length > 0) {
            record += '\n#### 📝 ドキュメント更新\n';
            allKeyInfo.documentation.forEach(doc => {
                record += `- ${doc}\n`;
            });
        }

        // エラー/問題
        if (allKeyInfo.errors.length > 0) {
            record += '\n#### ⚠️ 発生した問題\n';
            allKeyInfo.errors.forEach(error => {
                record += `- ${error}\n`;
            });
        }

        // TODO
        if (allKeyInfo.todos.length > 0) {
            record += '\n#### 📋 今後のタスク\n';
            allKeyInfo.todos.forEach(todo => {
                record += `- ${todo}\n`;
            });
        }

        // チャット全文も記録（折りたたみ形式）
        record += '\n<details>\n<summary>チャット全文</summary>\n\n```\n';
        messages.forEach((message, index) => {
            record += `[${index + 1}] ${message}\n\n`;
        });
        record += '```\n</details>\n';

        return record;
    }

    /**
     * CLAUDE.mdに追記
     */
    appendToClaudeMd(sessionRecord) {
        let content = '';
        
        if (fs.existsSync(this.claudePath)) {
            content = fs.readFileSync(this.claudePath, 'utf8');
        } else {
            // 新規作成時のヘッダー
            content = `# CLAUDE.md - プロジェクト開発履歴

このファイルは、Claude Code との対話履歴を自動的に記録したものです。

## 📝 開発セッション履歴

`;
        }

        // 技術・アーキテクチャ改善実装完了の前に挿入
        const insertPoint = content.indexOf('## 🔧 技術・アーキテクチャ改善実装完了');
        
        if (insertPoint !== -1) {
            content = content.slice(0, insertPoint) + sessionRecord + '\n\n' + content.slice(insertPoint);
        } else {
            // セクションが見つからない場合は末尾に追加
            content += '\n' + sessionRecord + '\n';
        }

        fs.writeFileSync(this.claudePath, content);
        console.log(`✅ CLAUDE.md に第${this.sessionCounter}回セッションを記録しました`);
    }

    /**
     * ファイルからチャット履歴を読み込み
     */
    readChatFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 改行で分割してメッセージの配列にする
        const messages = content.split('\n').filter(line => line.trim());
        
        return messages;
    }

    /**
     * メイン実行
     */
    run(args) {
        let messages = [];
        let sessionName = null;

        // コマンドライン引数の解析
        let i = 0;
        while (i < args.length) {
            if (args[i] === '--file' && args[i + 1]) {
                // ファイルから読み込み
                const filePath = args[i + 1];
                if (!fs.existsSync(filePath)) {
                    console.error(`エラー: ファイルが見つかりません: ${filePath}`);
                    process.exit(1);
                }
                messages = this.readChatFile(filePath);
                i += 2;
            } else if (args[i] === '--session' && args[i + 1]) {
                sessionName = args[i + 1];
                i += 2;
            } else {
                // 直接メッセージ
                messages.push(args[i]);
                i++;
            }
        }

        if (messages.length === 0) {
            console.error('エラー: 記録するメッセージがありません');
            console.log('使用方法:');
            console.log('  node record_chat_to_claude.js "メッセージ"');
            console.log('  node record_chat_to_claude.js --file chat.txt');
            console.log('  node record_chat_to_claude.js --file chat.txt --session "機能追加"');
            process.exit(1);
        }

        // セッション記録を生成
        const sessionRecord = this.generateSessionRecord(messages, sessionName);
        
        // CLAUDE.mdに追記
        this.appendToClaudeMd(sessionRecord);

        // 抽出された情報のサマリーを表示
        console.log('\n📊 記録された内容のサマリー:');
        const keyInfo = this.extractKeyInfo(messages.join('\n'));
        Object.keys(keyInfo).forEach(key => {
            if (keyInfo[key].length > 0) {
                console.log(`- ${key}: ${keyInfo[key].length}件`);
            }
        });
    }
}

// スクリプト実行
if (require.main === module) {
    const args = process.argv.slice(2);
    const recorder = new ChatRecorder();
    recorder.run(args);
}

module.exports = ChatRecorder;