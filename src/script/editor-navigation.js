/**
 * 编辑器专用的曲谱列表管理
 */

// 本地存储键名
const STORAGE_KEY = 'alphatab-editor-scores';

// 编辑器曲谱管理类
class ScoreManager {
    constructor() {
        this.scores = [];
        this.loadFromStorage();
    }

    // 从本地存储加载曲谱
    loadFromStorage() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this.scores = JSON.parse(stored);
            } catch (e) {
                console.error('加载曲谱失败:', e);
                this.scores = [];
            }
        }
    }

    // 保存到本地存储
    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores));
            return true;
        } catch (e) {
            console.error('保存到本地存储失败:', e);
            return false;
        }
    }

    // 添加或更新曲谱
    saveScore(title, content) {
        const id = Date.now().toString();
        const date = new Date().toLocaleString();
        
        // 所有内容都允许保存，仅做基本格式化处理
        const formattedContent = content.trim() + '\n';
        
        this.scores.unshift({
            id,
            title: title || '未命名曲谱',
            content: formattedContent,
            date
        });

        if (this.saveToStorage()) {
            this.renderScoreList();
            return id;
        } else {
            throw new Error('保存到本地存储失败');
        }
    }

    // 更新现有曲谱
    updateScore(id, content) {
        const scoreIndex = this.scores.findIndex(s => s.id === id);
        if (scoreIndex === -1) {
            throw new Error('找不到要更新的曲谱');
        }

        // 更新内容和日期
        this.scores[scoreIndex].content = content.trim() + '\n';
        this.scores[scoreIndex].date = new Date().toLocaleString() + ' (已更新)';

        // 保存并刷新列表
        this.saveToStorage();
        this.renderScoreList();
    }

    // 删除曲谱
    deleteScore(id) {
        this.scores = this.scores.filter(s => s.id !== id);
        this.saveToStorage();
        this.renderScoreList();
    }

    // 添加重命名曲谱方法
    renameScore(id, newTitle) {
        const scoreIndex = this.scores.findIndex(s => s.id === id);
        if (scoreIndex === -1) {
            throw new Error('找不到要重命名的曲谱');
        }

        // 更新标题
        this.scores[scoreIndex].title = newTitle;
        this.scores[scoreIndex].date = this.scores[scoreIndex].date + ' (已重命名)';

        // 保存并刷新列表
        this.saveToStorage();
        this.renderScoreList();
    }

    // 渲染曲谱列表
    renderScoreList() {
        const container = document.querySelector('.score-items');
        if (!container) return;

        container.innerHTML = '';
        
        this.scores.forEach(score => {
            const li = document.createElement('li');
            li.className = 'score-item';
            li.innerHTML = `
                <div class="score-item-header">
                    <span class="score-title">${score.title}</span>
                    <div class="score-actions">
                        <button class="btn-rename" title="重命名"><i data-lucide="edit"></i></button>
                        <button class="btn-delete" title="删除"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
                <div class="score-date">${score.date}</div>
            `;

            // 点击加载曲谱
            li.querySelector('.score-title').addEventListener('click', () => {
                this.loadScore(score);
                // 添加选中效果
                document.querySelectorAll('.score-item').forEach(item => 
                    item.classList.remove('active'));
                li.classList.add('active');
            });

            // 删除按钮事件
            li.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                
                // 显示模态确认框
                const modal = document.getElementById('scoreActionModal');
                const modalTitle = modal.querySelector('.modal-title');
                const modalBody = modal.querySelector('.modal-body');
                const confirmBtn = modal.querySelector('.btn-confirm');
                
                modalTitle.textContent = '确认删除';
                modalBody.innerHTML = `确定要删除曲谱「${score.title}」吗？`;
                
                // 绑定确认按钮事件
                const confirmHandler = () => {
                    this.deleteScore(score.id);
                    $(modal).modal('hide');
                    confirmBtn.removeEventListener('click', confirmHandler);
                };
                
                confirmBtn.addEventListener('click', confirmHandler);
                
                $(modal).modal('show');
            });

            // 重命名按钮事件
            li.querySelector('.btn-rename').addEventListener('click', (e) => {
                e.stopPropagation();
                
                // 显示模态确认框
                const modal = document.getElementById('scoreActionModal');
                const modalTitle = modal.querySelector('.modal-title');
                const modalBody = modal.querySelector('.modal-body');
                const confirmBtn = modal.querySelector('.btn-confirm');
                
                modalTitle.textContent = '重命名曲谱';
                modalBody.innerHTML = `
                    <p>请输入新的曲谱名称：</p>
                    <input type="text" class="form-control" id="newScoreTitle" value="${score.title}">
                `;
                
                // 绑定确认按钮事件
                const confirmHandler = () => {
                    const newTitle = document.getElementById('newScoreTitle').value.trim();
                    if (newTitle) {
                        this.renameScore(score.id, newTitle);
                        $(modal).modal('hide');
                    }
                    confirmBtn.removeEventListener('click', confirmHandler);
                };
                
                confirmBtn.addEventListener('click', confirmHandler);
                
                $(modal).modal('show');
                setTimeout(() => document.getElementById('newScoreTitle').focus(), 500);
            });

            container.appendChild(li);
        });

        // 初始化Lucide图标
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // 加载曲谱到编辑器
    loadScore(score) {
        // 确保content存在且不为空
        if (!score.content || score.content.trim() === '') {
            console.error('曲谱内容为空');
            return;
        }

        // 触发自定义事件通知编辑器
        const event = new CustomEvent('scoreLoad', { 
            detail: { score } 
        });
        document.dispatchEvent(event);
    }
}

// 初始化和导出
const scoreManager = new ScoreManager();
document.addEventListener('DOMContentLoaded', () => {
    scoreManager.renderScoreList();
});

// 导出供editor.js使用
window.scoreManager = scoreManager;
