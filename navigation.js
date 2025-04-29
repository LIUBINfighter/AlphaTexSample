// 处理页面跳转逻辑
document.addEventListener('DOMContentLoaded', () => {
    const newButton = document.querySelector('.app-button');
    if (newButton) {
        newButton.addEventListener('click', () => {
            window.location.href = 'editor.html';
        });
    }

    // 初始化 Lucide 图标
    lucide.createIcons();
});