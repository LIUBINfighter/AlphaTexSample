const themeToggle = document.getElementById('theme-toggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// 初始化主题
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 
                    (prefersDarkScheme.matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateToggleText(savedTheme);
}

// 切换主题
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateToggleText(newTheme);
}

// 更新按钮文本
function updateToggleText(theme) {
  themeToggle.textContent = theme === 'dark' ? '☀️ 明亮模式' : '🌙 暗黑模式';
}

// 初始化
initTheme();
themeToggle.addEventListener('click', toggleTheme);