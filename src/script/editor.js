import * as alphaTab from 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.min.mjs';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    initAlphaTexEditor();
});

/**
 * 初始化AlphaTex编辑器
 */
function initAlphaTexEditor() {
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
        }
    });
    
    // 设置默认AlphaTex内容
    const defaultAlphaTex = `\\title "我的乐谱"
\\subtitle "AlphaTex示例"
\\tempo 120
\\time 4/4

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
                showError('初始渲染错误: ' + e.message);
                // 如果加载失败，则使用默认示例
                editorElement.value = defaultAlphaTex;
                api.tex(defaultAlphaTex);
            }
        })
        .catch(error => {
            console.error('加载文件失败:', error);
            showError('加载示例文件失败: ' + error.message);
            // 使用默认示例
            editorElement.value = defaultAlphaTex;
            api.tex(defaultAlphaTex);
        });
    
    // 注册事件处理函数
    
    // 渲染开始事件
    api.renderStarted.on((resized) => {
        console.log('渲染开始', resized);
        loadingIndicator.style.display = 'block';
    });
    
    // 渲染完成事件
    api.renderFinished.on(() => {
        console.log('渲染完成');
        loadingIndicator.style.display = 'none';
    });
    
    // 错误处理事件
    api.error.on((error) => {
        console.error('渲染错误:', error);
        
        // 处理不同类型的错误
        let errorMessage = '';
        if (error instanceof alphaTab.importer.UnsupportedFormatError) {
            // 处理格式错误
            errorMessage = '不支持的格式: ' + error.message;
        } else if (error.cause instanceof alphaTab.importer.AlphaTexImporter.AlphaTexError) {
            // 处理AlphaTex语法错误
            const alphaTexError = error.cause;
            errorMessage = `语法错误: ${alphaTexError.message}, 位置: ${alphaTexError.position}`;
        } else {
            // 处理其他错误
            errorMessage = '渲染错误: ' + error.message;
        }
        
        showError(errorMessage);
    });
    
    // 监听编辑器内容变化
    let debounceTimer;
    editorElement.addEventListener('input', function() {
        // 使用防抖技术避免频繁渲染
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            errorContainer.style.display = 'none'; // 清除之前的错误
            
            try {
                api.tex(editorElement.value);
            } catch (e) {
                console.error('解析错误:', e);
                showError('解析错误: ' + e.message);
            }
        }, 300); // 300ms延迟
    });
    
    // 按钮事件处理
    document.getElementById('btn-new').addEventListener('click', () => {
        if (confirm('确定要创建新的乐谱吗？当前编辑内容将会丢失。')) {
            editorElement.value = defaultAlphaTex;
            api.tex(defaultAlphaTex);
        }
    });
    
    document.getElementById('btn-save').addEventListener('click', () => {
        // 实现保存功能
        const content = editorElement.value;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-score.alphatab';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    document.getElementById('btn-examples').addEventListener('click', () => {
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
        const helpText = `AlphaTex 基本语法:

\\title "标题"       - 设置标题
\\artist "艺术家"    - 设置艺术家
\\tempo 120         - 设置曲速
\\time 4/4         - 设置拍号

.                  - 开始新小节
|                  - 小节线

音符格式: 品.弦.时值
例如: 3.4.8        - 第4弦3品，八分音符

休止符:
r.4              - 四分休止符

和弦:
(0.6 2.5 2.4)    - 多个音符组成的和弦

更多语法请参考文档!`;

        alert(helpText);
    });
    
    // 显示错误信息的辅助函数
    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // 5秒后自动隐藏
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
    
    console.log('AlphaTex编辑器初始化完成');
}
