import * as alphaTab from 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.min.mjs';

// 编辑器状态管理类
class EditorState {
    constructor() {
        this._isDirty = false;
        this._currentScoreId = null;
        this._lastSavedContent = '';
    }

    get isDirty() {
        return this._isDirty;
    }

    markDirty() {
        this._isDirty = true;
    }

    markSaved(id, content) {
        this._currentScoreId = id;
        this._lastSavedContent = content;
        this._isDirty = false;
    }

    checkSafetyBefore(action) {
        if (!this._isDirty) return true;
        return confirm(`当前曲谱未保存，确定要${action}吗？`);
    }

    updateCurrentScore(id) {
        this._currentScoreId = id;
    }

    getCurrentScoreId() {
        return this._currentScoreId;
    }

    hasCurrentScore() {
        return this._currentScoreId !== null;
    }
}

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    initAlphaTexEditor();
});

/**
 * 初始化AlphaTex编辑器
 */
function initAlphaTexEditor() {
    // 添加加载状态锁
    let isLoading = false;

    // 初始化状态管理器
    const editorState = new EditorState();
    
    // 获取DOM元素
    const editorElement = document.getElementById('alphatex-editor');
    const previewElement = document.getElementById('alphatex-preview');
    const errorContainer = document.querySelector('.error-container');
    const loadingIndicator = document.querySelector('.loading-indicator');
    
    // 确保DOM元素存在
    if (!editorElement || !previewElement) {
        console.error('找不到编辑器或预览元素');
        return;
    }
    
    console.log('初始化AlphaTex编辑器...');
    
    // 初始化AlphaTab API
    const api = new alphaTab.AlphaTabApi(previewElement, {
        display: {
            scale: 1.2,
            staveProfile: alphaTab.StaveProfile.ScoreTab, // 显示五线谱和六线谱
            layoutMode: alphaTab.LayoutMode.Page // 使用分页布局
        },
        player: {
            enablePlayer: true,
            soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@alpha/dist/soundfont/sonivox.sf2',
            scrollElement: document.querySelector('.at-viewport'),
            scrollMode: alphaTab.ScrollMode.Continuous
        }
    });

    // 添加用户交互初始化
    function initAudioContext() {
        if (api.playerReady) {
            try {
                api.playPause();
                api.stop();
                document.removeEventListener('click', initAudioContext);
            } catch (e) {
                console.error('初始化音频上下文失败:', e);
            }
        }
    }
    document.addEventListener('click', initAudioContext);
    
    // 设置默认AlphaTex内容
    const defaultAlphaTex = `\\title "歌曲标题"
\\subtitle "副标题"  
\\artist "艺术家"  
\\album "专辑"  
\\words "作词"  
\\music "作曲"  
\\copyright "版权信息"  
\\tempo 120  
\\instrument 25
.
4.4.4 0.2.4 1.3.4 |
4.4.4 0.2.4 1.3.4 |`;
    
    // 加载Laputa-Castle-in-the-Sky.alphatab文件作为默认内容
    fetch('assets/tex/Laputa-Castle-in-the-Sky.alphatab')
        .then(response => {
            if (!response.ok) {
                throw new Error('无法加载文件');
            }
            return response.text();
        })
        .then(texContent => {
            editorElement.value = texContent;
            try {
                api.tex(texContent);
            } catch (e) {
                console.error('初始渲染错误:', e);
                showError(e, texContent);
                // 如果加载失败，则使用默认示例
                editorElement.value = defaultAlphaTex;
                api.tex(defaultAlphaTex);
            }
        })
        .catch(error => {
            console.error('加载文件失败:', error);
            showError(error, defaultAlphaTex);
            // 使用默认示例
            editorElement.value = defaultAlphaTex;
            api.tex(defaultAlphaTex);
        });
    
    // 注册事件处理函数
    
    // 修改渲染开始事件
    api.renderStarted.on((resized) => {
        console.log('渲染开始', resized);
        loadingIndicator.style.display = 'block';
        isLoading = true;
    });
    
    // 修改渲染完成事件
    api.renderFinished.on(() => {
        console.log('渲染完成');
        loadingIndicator.style.display = 'none';
        isLoading = false;
    });

    // 封装渲染函数
    async function renderScore(content) {
        if (isLoading) {
            console.log('已有渲染任务正在进行，等待完成...');
            return;
        }

        try {
            await api.tex(content);
            return true;
        } catch (error) {
            console.error('渲染失败:', error);
            showError(error, content);
            return false;
        }
    }

    // 修改监听曲谱加载事件
    document.addEventListener('scoreLoad', async (e) => {
        if (isLoading) {
            showError('请等待当前操作完成');
            return;
        }

        if (!editorState.checkSafetyBefore('加载新曲谱')) {
            return;
        }
        
        const { score } = e.detail;
        if (!score || !score.content) {
            showError('无效的曲谱内容');
            return;
        }

        try {
            isLoading = true;
            loadingIndicator.style.display = 'block';
            
            // 先更新编辑器内容
            const content = score.content.trim() + '\n';
            editorElement.value = content;
            
            // 等待渲染完成
            const renderSuccess = await renderScore(content);
            
            // 更新状态
            if (renderSuccess) {
                editorState.markSaved(score.id, content);
                editorState.updateCurrentScore(score.id);
            } else {
                showError('曲谱已加载，但渲染可能存在问题。建议检查格式。');
            }
        } catch (error) {
            console.error('加载曲谱失败:', error);
            showError(error, score.content);
        } finally {
            isLoading = false;
            loadingIndicator.style.display = 'none';
        }
    });

    // 显示错误信息的辅助函数
    function showError(error, sourceContent) {
        if(!errorContainer) return;

        let errorTitle = '错误';
        let errorMessage = '';
        let errorDetails = '';
        let position = null;

        // 解析不同类型的错误
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (error instanceof alphaTab.importer.UnsupportedFormatError) {
            errorTitle = '格式错误';
            if (error.cause instanceof alphaTab.importer.AlphaTexImporter.AlphaTexError) {
                const alphaTexError = error.cause;
                errorTitle = 'AlphaTex 语法错误';
                errorMessage = `在第 ${alphaTexError.line} 行，第 ${alphaTexError.col} 列`;
                errorDetails = `预期: ${alphaTexError.expected}\n实际: ${alphaTexError.symbol} "${alphaTexError.symbolData}"`;
                position = alphaTexError.position;
            } else {
                errorMessage = error.message;
            }
        } else {
            errorMessage = error.message || '未知错误';
        }

        // 构建错误提示HTML
        errorContainer.innerHTML = `
            <div class="error-header">
                <span class="error-title">${errorTitle}</span>
                <button class="error-close" title="关闭">&times;</button>
            </div>
            <div class="error-body">
                <div class="error-message">${errorMessage}</div>
                ${errorDetails ? `<div class="error-details">${errorDetails}</div>` : ''}
                ${position !== null && sourceContent ? `
                    <div class="error-position">
                        出错位置: ${highlightErrorPosition(sourceContent, position)}
                    </div>
                ` : ''}
            </div>
        `;
        
        // 添加关闭按钮事件
        errorContainer.querySelector('.error-close').onclick = () => {
            errorContainer.style.display = 'none';
        };
        
        errorContainer.style.display = 'block';
    }

    // 高亮错误位置
    function highlightErrorPosition(content, position) {
        const start = Math.max(0, position - 20);
        const end = Math.min(content.length, position + 20);
        const snippet = content.substring(start, end);
        const positionInSnippet = position - start;
        
        return `...${snippet.substring(0, positionInSnippet)}<mark>${
            snippet.charAt(positionInSnippet)
        }</mark>${snippet.substring(positionInSnippet + 1)}...`;
    }

    // 修改渲染错误处理
    function handleRenderError(error) {
        console.error('渲染错误:', error);
        showError(error, editorElement.value);
    }

    // 修改API错误事件处理
    api.error.on(handleRenderError);

    // 修改编辑器内容变化处理
    let debounceTimer;
    editorElement.addEventListener('input', function() {
        editorState.markDirty();
        
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            if (isLoading) return;
            
            errorContainer.style.display = 'none';
            try {
                await renderScore(editorElement.value);
            } catch (error) {
                handleRenderError(error);
            }
        }, 500);
    });

    // 按钮事件处理
    document.getElementById('btn-new').addEventListener('click', () => {
        if (editorState.checkSafetyBefore('创建新曲谱') &&
            confirm('确定要创建新的乐谱吗？当前编辑内容将会丢失。')) {
            editorElement.value = defaultAlphaTex;
            api.tex(defaultAlphaTex);
        }
    });
    
    // 保存按钮事件处理
    document.getElementById('btn-save').addEventListener('click', () => {
        const currentId = editorState.getCurrentScoreId();
        
        try {
            // 如果有当前曲谱ID就更新，没有就相当于另存为
            if (currentId) {
                window.scoreManager.updateScore(currentId, editorElement.value);
                editorState.markSaved(currentId, editorElement.value);
                showSuccess('保存成功');
            } else {
                const id = window.scoreManager.saveScore('未命名曲谱', editorElement.value);
                editorState.markSaved(id, editorElement.value);
                showSuccess('保存成功');
            }
        } catch (e) {
            showError(e.message, editorElement.value);
        }
    });

    // 另存为按钮事件处理（原保存逻辑移到这里）
    document.getElementById('btn-save-as').addEventListener('click', () => {
        const title = prompt('请输入曲谱标题:', '未命名曲谱');
        if (title !== null) { // 用户没有取消
            try {
                const id = window.scoreManager.saveScore(title, editorElement.value);
                editorState.markSaved(id, editorElement.value);
                showSuccess('另存为成功');
            } catch (e) {
                showError(e.message, editorElement.value);
            }
        }
    });

    document.getElementById('btn-examples').addEventListener('click', () => {
        if (!editorState.checkSafetyBefore('加载示例')) {
            return;
        }
        
        // 提供几个示例
        const examples = {
            '基本和弦': `\\title "基本和弦示例"
\\tempo 60
\\time 4/4

.
(0.6 2.5 2.4 0.3 0.2 0.1).1 |`,
            '旋律线': `\\title "旋律线示例"
\\tempo 100
\\time 3/4

.
0.6.8 1.6.8 3.6.8 |
5.5.8 3.5.8 0.5.8 |
2.4.8 3.4.8 5.4.8 |`,
            '扫弦效果': `\\title "扫弦效果"
\\tempo 80
\\time 4/4

.
/8(0.6 2.5 2.4 0.3 0.2 0.1) r.8 r.4 r.2 |
\\8(0.6 2.5 2.4 0.3 0.2 0.1) r.8 r.4 r.2 |`
        };
        
        const example = prompt('选择一个示例:\n1. 基本和弦\n2. 旋律线\n3. 扫弦效果', '1');
        if (example) {
            let selectedExample = '';
            switch(example) {
                case '1': selectedExample = examples['基本和弦']; break;
                case '2': selectedExample = examples['旋律线']; break;
                case '3': selectedExample = examples['扫弦效果']; break;
                default: return;
            }
            
            editorElement.value = selectedExample;
            api.tex(selectedExample);
        }
    });
    
    document.getElementById('btn-help').addEventListener('click', () => {
        window.location.href = 'docs.html'; // 直接跳转到 docs.html
    });
    
    // 显示成功信息的辅助函数
    function showSuccess(message) {
        if(!errorContainer) return;
        
        errorContainer.innerHTML = `
            <div class="success-message">${message}</div>
            <button class="error-close" title="关闭">&times;</button>
        `;
        errorContainer.style.display = 'block';
        errorContainer.style.backgroundColor = '#d4edda';
        
        setTimeout(() => {
            errorContainer.style.display = 'none';
            errorContainer.style.backgroundColor = '';
        }, 2000);
    }

    // 添加播放器控制逻辑
    const playPauseButton = document.querySelector('.at-play-pause');
    const stopButton = document.querySelector('.at-stop');
    const metronomeButton = document.querySelector('.at-metronome');
    const loopButton = document.querySelector('.at-loop');
    const timePosition = document.querySelector('.at-time-position');
    const timeSlider = document.querySelector('.at-time-slider-value');

    // 播放器准备就绪
    api.playerReady.on(() => {
        document.querySelectorAll('.at-player .disabled').forEach(el => {
            el.classList.remove('disabled');
        });
    });

    // 播放/暂停
    playPauseButton.onclick = (e) => {
        e.preventDefault();
        if (!e.target.classList.contains('disabled')) {
            api.playPause();
        }
    };

    // 停止播放
    stopButton.onclick = (e) => {
        e.preventDefault();
        if (!e.target.classList.contains('disabled')) {
            api.stop();
        }
    };

    // 节拍器控制
    metronomeButton.onclick = (e) => {
        e.preventDefault();
        const button = e.target.closest('a');
        button.classList.toggle('active');
        api.metronomeVolume = button.classList.contains('active') ? 1 : 0;
    };

    // 循环控制
    loopButton.onclick = (e) => {
        e.preventDefault();
        const button = e.target.closest('a');
        button.classList.toggle('active');
        api.isLooping = button.classList.contains('active');
    };

    // 播放器状态变化
    api.playerStateChanged.on((args) => {
        const icon = playPauseButton.querySelector('i');
        if (!icon) return;
        
        if (args.state === 0) { // 停止状态
            icon.setAttribute('data-lucide', 'play');
        } else { // 播放状态
            icon.setAttribute('data-lucide', 'pause');
        }
        lucide.replace();
    });

    // 播放进度更新
    let previousTime = -1;
    api.playerPositionChanged.on((args) => {
        const currentSeconds = (args.currentTime / 1000) | 0;
        if (currentSeconds === previousTime) return;
        previousTime = currentSeconds;

        // 更新时间显示
        const formatTime = (ms) => {
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        timePosition.textContent = `${formatTime(args.currentTime)} / ${formatTime(args.endTime)}`;
        
        // 更新进度条
        timeSlider.style.width = `${(args.currentTime / args.endTime) * 100}%`;
    });

    // 速度控制
    document.querySelectorAll('.at-speed-options a').forEach((a) => {
        a.onclick = (e) => {
            e.preventDefault();
            const speed = parseFloat(e.target.textContent);
            api.playbackSpeed = speed;
            document.querySelector('.at-speed-label').textContent = e.target.textContent;
        };
    });

    // 添加缩放功能实现
    document.querySelectorAll('.at-zoom-options .dropdown-item').forEach((item) => {
        item.onclick = (e) => {
            e.preventDefault();
            // 解析缩放百分比
            const scale = parseInt(e.target.textContent) / 100;
            // 更新缩放设置
            api.settings.display.scale = scale;
            // 更新显示的缩放比例文本
            document.querySelector('.at-zoom-label').textContent = e.target.textContent;
            // 应用更改并重新渲染
            api.updateSettings();
            api.render();
        };
    });

    // 在初始化时设置默认缩放比例
    api.settings.display.scale = 1.0;
    document.querySelector('.at-zoom-label').textContent = '100%';
    
    // 监听窗口大小变化，自动调整缩放（可选）
    window.addEventListener('resize', () => {
        // 使用防抖处理resize事件
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            const width = window.innerWidth;
            let scale = 1.0;
            
            // 根据窗口宽度调整缩放
            if (width > 1300) {
                scale = 1.2;
            } else if (width > 800) {
                scale = 1.0;
            } else {
                scale = 0.8;
            }
            
            api.settings.display.scale = scale;
            document.querySelector('.at-zoom-label').textContent = `${scale * 100}%`;
            api.updateSettings();
            api.render();
        }, 250);
    });

    console.log('AlphaTex编辑器初始化完成');
}
