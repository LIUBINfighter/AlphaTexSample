/**
 * 编辑器专用的曲谱列表管理
 */

// 编辑器曲谱数据存储
const editorScores = [
    { id: 'editor-simple', title: '简单示例', filename: 'simple.alphaTex' },
    { id: 'editor-scales', title: '音阶练习', filename: 'scales.alphaTex' },
    { id: 'editor-template', title: '新建模板', filename: 'template.alphaTex' }
];

// 本地存储键名
const STORAGE_KEY = 'alphatab-editor-scores';

/**
 * 初始化编辑器曲谱列表
 */
function initScoreList() {
    // 尝试从本地存储加载曲谱
    const storedScores = localStorage.getItem(STORAGE_KEY);
    const scoreList = storedScores ? JSON.parse(storedScores) : editorScores;
    
    // 渲染曲谱列表
    renderScoreList(scoreList);

    // 监听点击事件
    document.querySelector('.score-items').addEventListener('click', (e) => {
        if (e.target.classList.contains('score-item')) {
            loadScore(e.target.dataset.id);
        }
    });
}

/**
 * 渲染曲谱列表
 */
function renderScoreList(scores) {
    const container = document.querySelector('.score-items');
    container.innerHTML = '';
    
    scores.forEach(score => {
        const item = document.createElement('li');
        item.className = 'score-item';
        item.dataset.id = score.id;
        item.textContent = score.title;
        container.appendChild(item);
    });
}

/**
 * 加载指定ID的曲谱
 */
function loadScore(id) {
    // 这里会通过事件或其他机制与editor.js通信
    // 通知编辑器加载特定的曲谱
    const event = new CustomEvent('editorLoadScore', { detail: { id } });
    document.dispatchEvent(event);
}

/**
 * 保存曲谱到本地列表
 */
function saveScoreToList(id, title, content) {
    // 尝试从本地存储加载曲谱
    const storedScores = localStorage.getItem(STORAGE_KEY);
    let scoreList = storedScores ? JSON.parse(storedScores) : editorScores;
    
    // 检查是否已存在该ID
    const existingIndex = scoreList.findIndex(s => s.id === id);
    
    if (existingIndex >= 0) {
        // 更新现有曲谱
        scoreList[existingIndex].title = title;
        scoreList[existingIndex].content = content;
    } else {
        // 添加新曲谱
        scoreList.push({ id, title, content });
    }
    
    // 保存到本地存储
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scoreList));
    
    // 刷新列表显示
    renderScoreList(scoreList);
}

// 初始化
document.addEventListener('DOMContentLoaded', initScoreList);

// 导出公共方法供editor.js使用
window.editorNavigation = {
    saveScoreToList,
    loadScore
};
