/**
 * 边栏曲谱列表加载器
 * 专门用于播放器页面加载边栏曲谱列表
 */

// 导出加载曲谱列表的函数
export function loadSidebarScores(scoreList, onScoreSelected) {
    if (!scoreList) {
        console.error('找不到曲谱列表元素');
        return;
    }
    
    console.log('开始初始化播放器曲谱列表');
    
    try {
        // 修复路径，确保 JSON 文件正确加载
        return fetch('src/data/scores.json') // 添加正确的相对路径
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('加载播放器曲谱列表:', data.scores);
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
                    
                    // 添加点击事件
                    li.onclick = () => {
                        // 移除之前选中的项
                        document.querySelectorAll('.score-items li').forEach(item => {
                            item.classList.remove('active');
                        });
                        li.classList.add('active');
                        
                        // 调用回调函数加载曲谱
                        if (typeof onScoreSelected === 'function') {
                            onScoreSelected(score);
                        }
                    };
                    
                    scoreList.appendChild(li);
                });
                
                return data.scores;
            })
            .catch(error => {
                console.error('加载曲谱列表JSON失败:', error);
                // 加载失败时显示错误信息
                scoreList.innerHTML = '<li style="color: red;">加载曲谱列表失败</li>';
                return [];
            });
    } catch (error) {
        console.error('加载曲谱列表失败:', error);
        return Promise.resolve([]);
    }
}
