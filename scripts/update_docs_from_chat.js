#!/usr/bin/env node

/**
 * チャット履歴から設計書を自動更新するスクリプト
 * 
 * 使用方法:
 * node scripts/update_docs_from_chat.js [chat-export.csv]
 */

const fs = require('fs');
const path = require('path');

class DocumentUpdater {
    constructor() {
        this.patterns = {
            // 機能追加の検出パターン
            features: [
                /追加した機能[:：]\s*(.+)/gi,
                /実装(?:した|完了)[:：]\s*(.+)/gi,
                /新機能[:：]\s*(.+)/gi,
                /feat[:：]\s*(.+)/gi
            ],
            // 環境設定の検出パターン
            environment: [
                /環境変数[:：]\s*(.+)/gi,
                /設定(?:した|追加)[:：]\s*(.+)/gi,
                /config[:：]\s*(.+)/gi,
                /デプロイ先[:：]\s*(.+)/gi
            ],
            // テスト関連の検出パターン
            tests: [
                /テスト(?:追加|実装|作成)[:：]\s*(.+)/gi,
                /test[:：]\s*(.+)/gi,
                /動作確認[:：]\s*(.+)/gi
            ],
            // API変更の検出パターン
            api: [
                /API(?:追加|変更|更新)[:：]\s*(.+)/gi,
                /エンドポイント[:：]\s*(.+)/gi,
                /route[:：]\s*(.+)/gi
            ]
        };
        
        this.updates = {
            features: [],
            environment: [],
            tests: [],
            api: []
        };
    }

    /**
     * チャット履歴から情報を抽出
     */
    extractFromChat(chatContent) {
        const lines = chatContent.split('\n');
        
        lines.forEach(line => {
            // 各パターンをチェック
            Object.keys(this.patterns).forEach(category => {
                this.patterns[category].forEach(pattern => {
                    const matches = line.matchAll(pattern);
                    for (const match of matches) {
                        if (match[1]) {
                            this.updates[category].push({
                                content: match[1].trim(),
                                timestamp: new Date().toISOString(),
                                originalLine: line
                            });
                        }
                    }
                });
            });
        });
    }

    /**
     * README.mdを更新
     */
    updateReadme() {
        const readmePath = path.join(__dirname, '../README.md');
        let content = fs.readFileSync(readmePath, 'utf8');
        
        // 新機能セクションを更新
        if (this.updates.features.length > 0) {
            const featuresSection = this.generateFeaturesSection();
            content = this.updateSection(content, '## 最近の更新', featuresSection);
        }
        
        fs.writeFileSync(readmePath, content);
        console.log('✅ README.md を更新しました');
    }

    /**
     * 設計書HTMLを更新
     */
    updateDesignDoc() {
        const designPath = path.join(__dirname, '../docs/detailed/detailed_design.html');
        let content = fs.readFileSync(designPath, 'utf8');
        
        // API仕様セクションを更新
        if (this.updates.api.length > 0) {
            const apiSection = this.generateApiSection();
            content = this.updateHtmlSection(content, 'API仕様', apiSection);
        }
        
        fs.writeFileSync(designPath, content);
        console.log('✅ 詳細設計書を更新しました');
    }

    /**
     * CLAUDE.mdに変更履歴を追記
     */
    updateChangeLog() {
        const claudePath = path.join(__dirname, '../CLAUDE.md');
        let content = fs.readFileSync(claudePath, 'utf8');
        
        const changeLog = this.generateChangeLog();
        
        // 最新の更新として追記
        const insertPoint = content.indexOf('## 🔧 技術・アーキテクチャ改善実装完了');
        if (insertPoint !== -1) {
            content = content.slice(0, insertPoint) + changeLog + '\n\n' + content.slice(insertPoint);
        } else {
            content += '\n\n' + changeLog;
        }
        
        fs.writeFileSync(claudePath, content);
        console.log('✅ CLAUDE.md を更新しました');
    }

    /**
     * セクション生成メソッド
     */
    generateFeaturesSection() {
        let section = '## 最近の更新\n\n';
        section += `### ${new Date().toLocaleDateString('ja-JP')} の更新\n\n`;
        
        this.updates.features.forEach(feature => {
            section += `- ${feature.content}\n`;
        });
        
        return section;
    }

    generateApiSection() {
        let section = '<h3>API仕様の更新</h3>\n';
        section += '<ul>\n';
        
        this.updates.api.forEach(api => {
            section += `  <li>${this.escapeHtml(api.content)}</li>\n`;
        });
        
        section += '</ul>\n';
        return section;
    }

    generateChangeLog() {
        const date = new Date().toISOString().split('T')[0];
        let log = `### 第XX回セッション: ${date}\n`;
        log += '- **更新内容**: チャット履歴からの自動抽出\n\n';
        
        if (this.updates.features.length > 0) {
            log += '#### 機能追加\n';
            this.updates.features.forEach(f => log += `- ${f.content}\n`);
            log += '\n';
        }
        
        if (this.updates.environment.length > 0) {
            log += '#### 環境設定\n';
            this.updates.environment.forEach(e => log += `- ${e.content}\n`);
            log += '\n';
        }
        
        if (this.updates.tests.length > 0) {
            log += '#### テスト\n';
            this.updates.tests.forEach(t => log += `- ${t.content}\n`);
            log += '\n';
        }
        
        return log;
    }

    /**
     * ユーティリティメソッド
     */
    updateSection(content, sectionTitle, newContent) {
        const regex = new RegExp(`(${sectionTitle}[\\s\\S]*?)(?=##|$)`, 'i');
        return content.replace(regex, newContent + '\n\n');
    }

    updateHtmlSection(content, sectionTitle, newContent) {
        const regex = new RegExp(`(<h2[^>]*>${sectionTitle}</h2>[\\s\\S]*?)(?=<h2|$)`, 'i');
        return content.replace(regex, `$1\n${newContent}\n`);
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * メイン実行
     */
    run(chatFile) {
        console.log('📝 チャット履歴から設計書を更新します...\n');
        
        // チャット履歴を読み込み
        const chatContent = fs.readFileSync(chatFile, 'utf8');
        
        // 情報を抽出
        this.extractFromChat(chatContent);
        
        // 抽出結果を表示
        console.log('抽出された情報:');
        console.log(`- 機能: ${this.updates.features.length}件`);
        console.log(`- 環境: ${this.updates.environment.length}件`);
        console.log(`- テスト: ${this.updates.tests.length}件`);
        console.log(`- API: ${this.updates.api.length}件\n`);
        
        // 各ドキュメントを更新
        if (this.updates.features.length > 0 || this.updates.api.length > 0) {
            this.updateReadme();
            this.updateDesignDoc();
        }
        
        // 変更履歴を更新
        this.updateChangeLog();
        
        console.log('\n✨ 設計書の更新が完了しました！');
    }
}

// スクリプト実行
if (require.main === module) {
    const chatFile = process.argv[2];
    
    if (!chatFile) {
        console.error('使用方法: node update_docs_from_chat.js <chat-export.csv>');
        process.exit(1);
    }
    
    if (!fs.existsSync(chatFile)) {
        console.error(`エラー: ファイルが見つかりません: ${chatFile}`);
        process.exit(1);
    }
    
    const updater = new DocumentUpdater();
    updater.run(chatFile);
}

module.exports = DocumentUpdater;