// 加载曲谱列表的通用功能

document.addEventListener('DOMContentLoaded', () => {
    // 仅在编辑器页面执行
    if (!window.location.href.includes('editor.html')) {
        return;
    }
    
    const scoreList = document.querySelector('.app-sidebar .score-items');
    if (!scoreList) {
        console.error('找不到曲谱列表元素');
        return;
    }
    
    console.log('开始初始化编辑器页面曲谱列表');
    
    try {
        // 修复路径，确保 JSON 文件正确加载
        fetch('src/data/scores.json') // 添加正确的相对路径
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('加载编辑器曲谱列表:', data.scores);
                scoreList.innerHTML = '';
                data.scores.forEach(score => {
                    console.log('添加曲谱:', score.file);
                    const li = document.createElement('li');
                    // 如果有标题则显示标题，否则显示文件名
                    li.textContent = score.title || score.file;
                    // 添加提示信息
                    if (score.artist) {
                        li.setAttribute('title', `${score.title || score.file} - ${score.artist}`);
                    }
                    
                    // 编辑器页面上，点击曲谱仅展示信息
                    li.onclick = () => {
                        alert(`将在编辑器中打开: ${score.title || score.file}\n作者: ${score.artist || '未知'}`);
                    };
                    
                    scoreList.appendChild(li);
                });
            })
            .catch(error => {
                console.error('加载曲谱列表JSON失败:', error);
                // 加载失败时显示错误信息
                scoreList.innerHTML = '<li style="color: red;">加载曲谱列表失败</li>';
            });
    } catch (error) {
        console.error('加载曲谱列表失败:', error);
    }
});
