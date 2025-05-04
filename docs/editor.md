# AlphaTex编辑器实现计划

## 背景介绍

AlphaTex是alphaTab提供的一种音乐符号文本格式，允许用户通过文本语法创建和编辑乐谱。实现实时渲染的AlphaTex编辑器可以显著提高音乐创作和编辑的效率。

## 核心API和特性

要实现实时渲染的AlphaTex编辑器，需要使用以下核心API和特性：

### 1. 基础API

- **AlphaTabApi** - 主要接口类，用于初始化和控制渲染
- **tex()方法** - 将AlphaTex文本解析并渲染为乐谱
- **AlphaTexImporter** - 负责将AlphaTex文本解析为Score对象

### 2. 关键事件

- **renderStarted** - 渲染开始时触发
- **renderFinished** - 渲染完成时触发
- **error** - 发生错误时触发（如语法错误）

## 实现步骤

### 1. 创建基础HTML结构

```html
<div class="editor-container">
    <div class="editor-panel">
        <textarea id="alphatex-editor" class="alphatex-editor"></textarea>
    </div>
    <div class="preview-panel">
        <div id="alphatex-preview"></div>
    </div>
</div>
```

### 2. 初始化AlphaTab实例

```javascript
import * as alphaTab from 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.min.mjs';

// 获取DOM元素
const editorElement = document.getElementById('alphatex-editor');
const previewElement = document.getElementById('alphatex-preview');

// 初始化AlphaTab API
const api = new alphaTab.AlphaTabApi(previewElement, {
    display: {
        scale: 1.2,
        staveProfile: alphaTab.StaveProfile.ScoreTab // 显示五线谱和六线谱
    }
});

// 设置默认AlphaTex内容
editorElement.value = `\\title "我的乐谱"
\\tempo 120
\\time 4/4

.
4.4.4 0.2.4 1.3.4 |
4.4.4 0.2.4 1.3.4 |`;
```

### 3. 实现实时渲染逻辑

```javascript
// 监听编辑器内容变化
let debounceTimer;
editorElement.addEventListener('input', function() {
    // 使用防抖技术避免频繁渲染
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        try {
            api.tex(editorElement.value);
        } catch (e) {
            console.error('解析错误:', e);
            // 可以在UI上显示错误信息
        }
    }, 300); // 300ms延迟
});

// 初始渲染
api.tex(editorElement.value);
```

### 4. 添加事件处理

```javascript
// 渲染开始事件
api.renderStarted.on((resized) => {
    console.log('渲染开始', resized);
    // 显示加载指示器
    document.querySelector('.loading-indicator').style.display = 'block';
});

// 渲染完成事件
api.renderFinished.on(() => {
    console.log('渲染完成');
    // 隐藏加载指示器
    document.querySelector('.loading-indicator').style.display = 'none';
});

// 错误处理事件
api.error.on((error) => {
    console.error('渲染错误:', error);
    
    // 处理不同类型的错误
    if (error instanceof alphaTab.importer.UnsupportedFormatError) {
        // 处理格式错误
        showError('不支持的格式: ' + error.message);
    } else if (error.cause instanceof alphaTab.importer.AlphaTexError) {
        // 处理AlphaTex语法错误
        const alphaTexError = error.cause;
        showError(`语法错误: ${alphaTexError.message}, 位置: ${alphaTexError.position}, 符号: ${alphaTexError.symbolData}`);
    } else {
        // 处理其他错误
        showError('渲染错误: ' + error.message);
    }
});

// 显示错误信息的辅助函数
function showError(message) {
    const errorContainer = document.querySelector('.error-container');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // 5秒后自动隐藏
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}
```

### 5. 使用高级API直接控制解析过程

如果需要更精细的控制，可以直接使用`AlphaTexImporter`：

```javascript
function parseAndRenderTex(texContent) {
    try {
        const parser = new alphaTab.importer.AlphaTexImporter();
        parser.logErrors = true; // 启用错误日志
        parser.initFromString(texContent, api.settings);
        const score = parser.readScore();
        api.renderScore(score);
        return true;
    } catch (e) {
        api.onError(e);
        return false;
    }
}
```

## 样式设计

```css
/* 编辑器容器 */
.editor-container {
    display: flex;
    height: 100%;
    overflow: hidden;
}

/* 编辑器面板 */
.editor-panel {
    flex: 1;
    padding: 10px;
    border-right: 1px solid #ddd;
    display: flex;
    flex-direction: column;
}

/* 预览面板 */
.preview-panel {
    flex: 2;
    padding: 10px;
    overflow: auto;
}

/* AlphaTex编辑器 */
.alphatex-editor {
    width: 100%;
    height: 100%;
    font-family: monospace;
    font-size: 14px;
    line-height: 1.5;
    padding: 10px;
    border: 1px solid #ddd;
    resize: none;
}

/* 工具栏 */
.editor-toolbar {
    display: flex;
    padding: 5px 0;
    margin-bottom: 10px;
}

/* 错误容器 */
.error-container {
    background-color: #fee;
    border: 1px solid #faa;
    color: #a00;
    padding: 10px;
    margin: 10px 0;
    display: none;
}

/* 加载指示器 */
.loading-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 255, 255, 0.8);
    padding: 20px;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    display: none;
}
```

## 完整实现示例

以下是完整的AlphaTex编辑器实现，集成到editor.html页面：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8" />
    <title>AlphaTex编辑器</title>
    <link rel="stylesheet" href="src/styles/editor.css" />
    <link rel="stylesheet" href="src/styles/sidebar.css" />
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css" crossorigin="anonymous" />
    <script src="https://cdn.jsdelivr.net/npm/jquery@3.5.1/dist/jquery.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
    <script type="module" src="src/script/editor.js"></script>
</head>
<body>
    <div class="app-container">
        <div class="app-sidebar">
            <!-- 侧边栏内容 -->
            <a href="index.html" class="app-button">返回播放器</a>
            <div class="score-list">
                <h5>曲谱列表</h5>
                <ul class="score-items"></ul>
            </div>
        </div>
        <div class="app-content">
            <div class="editor-container">
                <div class="editor-panel">
                    <div class="editor-toolbar">
                        <button class="btn btn-sm btn-outline-primary" id="btn-new">新建</button>
                        <button class="btn btn-sm btn-outline-success" id="btn-save">保存</button>
                        <button class="btn btn-sm btn-outline-info" id="btn-examples">示例</button>
                        <button class="btn btn-sm btn-outline-secondary" id="btn-help">帮助</button>
                    </div>
                    <div class="error-container"></div>
                    <textarea id="alphatex-editor" class="alphatex-editor"></textarea>
                </div>
                <div class="preview-panel">
                    <div id="alphatex-preview"></div>
                    <div class="loading-indicator">
                        <div class="spinner-border" role="status">
                            <span class="sr-only">加载中...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
```

## AlphaTex语法参考

为方便用户使用，可以提供以下基本语法参考：

### 基本元数据

```
\title "曲谱标题"
\subtitle "副标题"
\artist "艺术家"
\album "专辑"
\words "作词"
\music "作曲"
\copyright "版权信息"
\tempo 120
\time 4/4
\key e   // E调
```

### 音符语法

```
// 基本结构
.                    // 开始新小节
|                    // 小节线
:4                   // 四分音符
:8                   // 八分音符
:16                  // 十六分音符
r                    // 休止符
x                    // 无声音符

// 音符定义
0.6                  // 第6弦空弦
1.6                  // 第6弦1品
3.5.8                // 第5弦3品，八分音符
5.4.4.                // 第4弦5品，四分附点音符

// 和弦
(0.6 2.5 2.4 0.3)    // 和弦
```

### 装饰音和效果

```
b(5.3)               // 弯音
h5                   // 吊弦到5品
p0                   // 切音到空弦
/8                   // 向上扫弦，八分音符
\16                  // 向下扫弦，十六分音符
v                    // 颤音
```

## 注意事项与提示

1. **性能优化**：
   - 使用防抖技术限制渲染频率，避免每次按键都触发渲染
   - 对于复杂乐谱，考虑添加延迟渲染选项

2. **错误处理**：
   - 提供用户友好的错误提示
   - 高亮显示错误所在的行
   - 保存上一次成功渲染的内容，以便从错误中恢复

3. **用户体验**：
   - 添加语法高亮（可使用CodeMirror等库）
   - 提供自动完成功能
   - 添加常用片段库，方便快速插入

4. **响应式设计**：
   - 在窗口大小变化时重新渲染
   - 在小屏幕设备上提供垂直布局选项

5. **导出功能**：
   - 添加导出为GP、PDF、MIDI等格式的功能
   - 提供分享和嵌入功能

6. **本地存储**：
   - 使用localStorage保存用户的编辑内容
   - 提供自动保存功能

7. **AlphaTex语法提示**：
   - 提供常见语法的模板
   - 添加交互式教程帮助用户学习

## 进阶功能

1. **版本控制**：实现简单的撤销/重做功能

2. **协作编辑**：集成WebSocket实现多人协作编辑

3. **导入功能**：允许用户导入现有GP文件并转换为AlphaTex

4. **自定义主题**：提供多种编辑器主题和乐谱样式

5. **插件系统**：设计一个插件架构允许扩展编辑器功能

## 总结

AlphaTex编辑器的实现需要关注以下几个核心方面：
- 使用alphaTab API实现实时渲染
- 提供直观的用户界面
- 处理各种可能的错误情况
- 优化性能以应对复杂乐谱
- 提供足够的辅助功能帮助用户编写AlphaTex

通过实现这个编辑器，您可以为音乐创作者提供一个强大、高效的工具，简化乐谱创建和编辑过程。