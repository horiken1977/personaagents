#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

class ProgressGenerator {
    constructor() {
        this.mdFilePath = path.join(__dirname, 'project-progress.md');
        this.htmlFilePath = path.join(__dirname, 'progress-dashboard.html');
    }

    parseMarkdown(content) {
        const lines = content.split('\n');
        const tasks = [];
        let stats = { total: 0, completed: 0, inProgress: 0, pending: 0 };
        
        lines.forEach(line => {
            // チェックボックス付きタスクを検出
            const taskMatch = line.match(/^- \[([ x])\] \*\*(.*?)\*\*/);
            if (taskMatch) {
                const isCompleted = taskMatch[1] === 'x';
                const taskName = taskMatch[2];
                
                // 優先度を推定（高優先度タスクの下にあるかどうか）
                let priority = 'medium';
                const previousLines = lines.slice(0, lines.indexOf(line));
                for (let i = previousLines.length - 1; i >= 0; i--) {
                    if (previousLines[i].includes('高優先度')) {
                        priority = 'high';
                        break;
                    } else if (previousLines[i].includes('中優先度')) {
                        priority = 'medium';
                        break;
                    } else if (previousLines[i].includes('低優先度')) {
                        priority = 'low';
                        break;
                    }
                }
                
                // タスクに関連するドキュメントへのリンクを検出
                let documentLink = null;
                if (isCompleted) {
                    if (taskName.includes('要件定義とアプリケーション仕様の策定')) {
                        // このタスクには複数のドキュメントがあるので、配列として扱う
                        documentLink = ['requirements-definition.html', 'roic-calculation-spec.html'];
                    } else if (taskName.includes('要件定義')) {
                        documentLink = 'requirements-definition.html';
                    } else if (taskName.includes('ROIC計算仕様')) {
                        documentLink = 'roic-calculation-spec.html';
                    }
                }
                
                tasks.push({
                    name: taskName,
                    completed: isCompleted,
                    priority: priority,
                    description: this.extractDescription(lines, line),
                    documentLink: documentLink
                });
                
                stats.total++;
                if (isCompleted) {
                    stats.completed++;
                } else {
                    stats.pending++;
                }
            }
        });
        
        stats.completionRate = Math.round((stats.completed / stats.total) * 100) || 0;
        
        return { tasks, stats };
    }

    extractDescription(lines, taskLine) {
        const taskIndex = lines.indexOf(taskLine);
        let description = '';
        
        // タスク行の次の行から説明を抽出
        for (let i = taskIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('- ')) {
                // 次のタスクに到達したら終了
                break;
            } else if (line.startsWith('#')) {
                // 次のセクションに到達したら終了
                break;
            } else if (line && !line.startsWith('-')) {
                // 説明文を追加
                description += line + ' ';
            }
        }
        
        return description.trim();
    }

    generateHTML(data) {
        const { tasks, stats } = data;
        
        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ROIC分析アプリケーション - 開発進捗ダッシュボード</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f7fa;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .subtitle {
            color: #666;
            font-size: 18px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 3px 20px rgba(0,0,0,0.08);
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-number {
            font-size: 36px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .stat-label {
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .progress-section {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 3px 20px rgba(0,0,0,0.08);
            margin-bottom: 30px;
        }
        
        .progress-bar-container {
            margin: 30px 0;
        }
        
        .progress-bar {
            width: 100%;
            height: 25px;
            background-color: #e9ecef;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            border-radius: 12px;
            transition: width 0.8s ease;
            position: relative;
        }
        
        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-weight: bold;
            font-size: 14px;
        }
        
        .task-list {
            margin-top: 30px;
        }
        
        .task-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 20px;
            padding: 20px;
            border-radius: 10px;
            transition: all 0.3s ease;
            border-left: 4px solid transparent;
        }
        
        .task-item:hover {
            background-color: #f8f9fa;
            transform: translateX(5px);
        }
        
        .task-item.completed {
            border-left-color: #28a745;
            background-color: #f8fff9;
        }
        
        .task-item.pending {
            border-left-color: #6c757d;
        }
        
        .task-checkbox {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            margin-right: 15px;
            margin-top: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            flex-shrink: 0;
        }
        
        .task-checkbox.completed {
            background-color: #28a745;
        }
        
        .task-checkbox.pending {
            background-color: #6c757d;
        }
        
        .task-content {
            flex: 1;
        }
        
        .task-title {
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .task-description {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
        }
        
        .doc-link {
            text-decoration: none;
            font-size: 18px;
            transition: transform 0.2s ease;
            display: inline-block;
        }
        
        .doc-link:hover {
            transform: scale(1.2);
        }
        
        .priority-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
            flex-shrink: 0;
        }
        
        .priority-badge.high {
            background-color: #dc3545;
            color: white;
        }
        
        .priority-badge.medium {
            background-color: #fd7e14;
            color: white;
        }
        
        .priority-badge.low {
            background-color: #198754;
            color: white;
        }
        
        .last-updated {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .task-item {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .priority-badge {
                margin-left: 0;
                margin-top: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>ROIC分析アプリケーション</h1>
            <p class="subtitle">開発進捗ダッシュボード</p>
        </header>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${stats.total}</div>
                <div class="stat-label">総タスク数</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.completed}</div>
                <div class="stat-label">完了タスク</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.pending}</div>
                <div class="stat-label">未完了タスク</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.completionRate}%</div>
                <div class="stat-label">完了率</div>
            </div>
        </div>
        
        <div class="progress-section">
            <h2>全体進捗</h2>
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${stats.completionRate}%">
                        <span class="progress-text">${stats.completionRate}%</span>
                    </div>
                </div>
            </div>
            
            <h3>タスク一覧</h3>
            <div class="task-list">
                ${tasks.map(task => `
                    <div class="task-item ${task.completed ? 'completed' : 'pending'}">
                        <div class="task-checkbox ${task.completed ? 'completed' : 'pending'}">
                            ${task.completed ? '✓' : '○'}
                        </div>
                        <div class="task-content">
                            <div class="task-title">
                                ${task.name}
                                ${task.documentLink ? 
                                    (Array.isArray(task.documentLink) ? 
                                        task.documentLink.map(link => {
                                            const title = link.includes('requirements') ? '要件定義書' : 'ROIC計算仕様書';
                                            return `<a href="${link}" class="doc-link" title="${title}を表示">📄</a>`;
                                        }).join(' ')
                                        : `<a href="${task.documentLink}" class="doc-link" title="ドキュメントを表示">📄</a>`)
                                    : ''}
                            </div>
                            <div class="task-description">${task.description}</div>
                        </div>
                        <span class="priority-badge ${task.priority}">${task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="last-updated">
            最終更新: ${new Date().toLocaleString('ja-JP')}
        </div>
    </div>
    
    <script>
        // ページ読み込み時のアニメーション
        document.addEventListener('DOMContentLoaded', function() {
            const progressFill = document.querySelector('.progress-fill');
            const statNumbers = document.querySelectorAll('.stat-number');
            
            // 数値のカウントアップアニメーション
            statNumbers.forEach(el => {
                const target = parseInt(el.textContent);
                let current = 0;
                const increment = target / 30;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    el.textContent = Math.floor(current) + (el.textContent.includes('%') ? '%' : '');
                }, 50);
            });
            
            // プログレスバーのアニメーション
            setTimeout(() => {
                progressFill.style.width = '${stats.completionRate}%';
            }, 500);
        });
        
        // 自動リロード（5秒間隔）
        setInterval(() => {
            window.location.reload();
        }, 5000);
    </script>
</body>
</html>`;
    }

    generateDashboard() {
        try {
            // マークダウンファイルを読み込み
            const markdownContent = fs.readFileSync(this.mdFilePath, 'utf-8');
            
            // マークダウンを解析
            const data = this.parseMarkdown(markdownContent);
            
            // HTMLを生成
            const html = this.generateHTML(data);
            
            // HTMLファイルに書き込み
            fs.writeFileSync(this.htmlFilePath, html);
            
            console.log(`Progress dashboard updated: ${this.htmlFilePath}`);
        } catch (error) {
            console.error('Error generating dashboard:', error);
        }
    }

    watchFile() {
        console.log(`Watching for changes in: ${this.mdFilePath}`);
        
        // 初回生成
        this.generateDashboard();
        
        // ファイル監視
        fs.watchFile(this.mdFilePath, (curr, prev) => {
            console.log('Markdown file changed, regenerating dashboard...');
            this.generateDashboard();
        });
    }
}

// メイン実行
if (require.main === module) {
    const generator = new ProgressGenerator();
    
    // コマンドライン引数をチェック
    const args = process.argv.slice(2);
    
    if (args.includes('--watch')) {
        generator.watchFile();
        console.log('Press Ctrl+C to stop watching...');
    } else {
        generator.generateDashboard();
    }
}

module.exports = ProgressGenerator;