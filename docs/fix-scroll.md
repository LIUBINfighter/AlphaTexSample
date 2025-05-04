# AlphaTab 曲谱自动滚动功能修复记录

## 问题描述

在 AlphaTab 曲谱播放器中，高亮显示当前播放小节的功能正常工作，但是页面没有随着当前播放小节自动滚动的功能。这导致用户在播放较长曲谱时需要手动滚动页面来查看当前播放位置。

## 错误日志分析

通过浏览器控制台日志分析，发现了以下错误：

```
Uncaught TypeError: Cannot read properties of null (reading 'setAttribute')
    at control.js:268:18
    at ya.trigger (AlphaSynthWebAudioOutputBase.ts:140:15)
    at wr.onPlayerStateChanged (DynamicsEffectInfo.ts:62:54)
    at ya.trigger (AlphaSynthWebAudioOutputBase.ts:140:15)
    at gr.handleWorkerMessage (HorizontalScreenLayout.ts:53:31)
```

以及：

```
Uncaught TypeError: Cannot read properties of null (reading 'setAttribute')
    at control.js:272:18
    at ya.trigger (AlphaSynthWebAudioOutputBase.ts:140:15)
    at wr.onPlayerStateChanged (DynamicsEffectInfo.ts:62:54)
    at ya.trigger (AlphaSynthWebAudioOutputBase.ts:140:15)
    at gr.handleWorkerMessage (HorizontalScreenLayout.ts:53:31)
```

这些错误出现在播放器状态变化时（`playerStateChanged`事件处理函数中），这与滚动功能直接相关。错误表明代码尝试在一个不存在（null）的元素上调用`setAttribute`方法。

## 相关上下文

### AlphaTab 滚动实现原理

根据 AlphaTab 文档，高亮当前播放小节和自动滚动功能的实现如下：

1. 当音乐播放时，`cursorUpdateTick` 方法会被调用来更新光标位置，该方法根据当前播放的 MIDI tick 位置找到对应的小节和节拍。

2. 找到对应的节拍后，会调用 `cursorUpdateBeat` 方法来更新光标和高亮显示。

3. 实际的高亮逻辑在 `internalCursorUpdateBeat` 方法中实现，该方法会：
   - 更新光标位置
   - 如果启用了元素高亮功能，会调用 `highlightElements` 方法高亮当前节拍的所有音符

4. 当播放进行时，alphaTab 会根据 `internalScrollToCursor` 方法自动滚动页面以跟随当前播放的小节。

5. 实际的滚动操作是通过 `BrowserUiFacade` 类中的 `scrollToY` 和 `scrollToX` 方法实现的。

### 问题代码分析

在 `control.js` 文件中，`playerStateChanged` 事件处理函数试图在不存在的 DOM 元素上设置属性：

```javascript
at.playerStateChanged.on(function (args) {
    const icon = playPauseButton.querySelector('i');
    if (args.state == 0) {
        // 使用data-lucide属性替换图标
        icon.setAttribute('data-lucide', 'play');
        lucide.replace(); // 刷新图标
    } else {
        // 使用data-lucide属性替换图标
        icon.setAttribute('data-lucide', 'pause');
        lucide.replace(); // 刷新图标
    }
});
```

当 `playPauseButton` 中没有找到 `i` 元素时，`icon` 变量为 `null`，导致调用 `setAttribute` 方法时抛出错误。这个错误会中断事件处理流程，可能阻止了滚动相关代码的执行。

## 解决方案

### 1. 修复 `playerStateChanged` 事件处理函数

在 `control.js` 文件中修改 `playerStateChanged` 事件处理函数，添加空值检查：

```javascript
at.playerStateChanged.on(function (args) {
    const icon = playPauseButton.querySelector('i');
    if (!icon) {
        return; // 防止在null上调用方法
    }
    
    if (args.state == 0) {
        // 使用data-lucide属性替换图标
        icon.setAttribute('data-lucide', 'play');
        lucide.replace(); // 刷新图标
    } else {
        // 使用data-lucide属性替换图标
        icon.setAttribute('data-lucide', 'pause');
        lucide.replace(); // 刷新图标
    }
});
```

### 2. 确保正确设置滚动参数

确保 AlphaTab 初始化时正确设置了滚动相关参数：

```javascript
const at = new alphaTab.AlphaTabApi(el, {
    file: 'https://www.alphatab.net/files/canon.gp',
    player: {
        enablePlayer: true,
        soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@alpha/dist/soundfont/sonivox.sf2',
        scrollElement: viewPort,
        scrollOffsetX: -10,
        scrollMode: alphaTab.ScrollMode.Continuous, // 明确设置滚动模式
        scrollSpeed: 300 // 控制滚动速度
    }
});
```

### 3. 修改 CSS 确保支持水平滚动

在 `control.css` 中修改 `.at-viewport` 类，确保同时支持水平和垂直滚动：

```css
.at-viewport {
    position: absolute;
    top: 0;
    left: 70px; 
    right: 0;
    bottom: 0;
    overflow-y: auto;
    overflow-x: auto; /* 添加水平滚动支持 */
    padding-right: 20px;
}
```

### 4. 确保布局切换时滚动设置一致

在切换布局模式的代码中，确保滚动设置与布局模式一致：

```javascript
control.querySelectorAll('.at-layout-options a').forEach(function (a) {
    a.onclick = function (e) {
        e.preventDefault();
        const settings = at.settings;
        
        switch (e.target.dataset.layout) {
            case 'page':
                settings.display.layoutMode = alphaTab.LayoutMode.Page;
                settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                break;
            case 'horizontal-bar':
                settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                break;
            case 'horizontal-screen':
                settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                settings.player.scrollMode = alphaTab.ScrollMode.OffScreen;
                break;
        }

        at.updateSettings();
        at.render();
    };
});
```

## 总结

通过添加空值检查修复 `playerStateChanged` 事件处理函数中的错误，解决了导致滚动功能失效的问题。同时，确保了正确的滚动配置和 CSS 设置，以支持不同布局模式下的自动滚动功能。这些修改使 AlphaTab 的自动滚动功能恢复正常工作，提升了用户体验。

