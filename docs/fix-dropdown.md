# 修复 Bootstrap Dropdown 依赖问题

## 问题描述

前端交互的时候发现三个dropdown（速度，缩放和layout）都不能正常使用。

定位后发现在使用 Bootstrap 的 dropdown.js 模块时，出现以下错误：

```
Uncaught TypeError: Bootstrap's dropdowns require Popper.js
```

### 原因分析

Bootstrap 的 dropdown.js 模块依赖 Popper.js，但由于以下原因导致错误：
1. Popper.js 使用了 `defer` 属性，可能未及时加载完成。
2. Bootstrap 的 JS 文件加载时，Popper.js 尚未可用。

---

## 解决方案

### 方案一：调整加载顺序（推荐）

确保 Popper.js 在 Bootstrap 之前加载，并移除 `defer` 属性：

```html
<script src="https://cdn.jsdelivr.net/npm/jquery@3.5.1/dist/jquery.min.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js" crossorigin="anonymous"></script> <!-- 移除 defer -->
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js" crossorigin="anonymous" defer></script>
```

### 方案二：使用 Bootstrap Bundle

使用包含 Popper.js 的 Bootstrap Bundle 替代单独加载：

```html
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous" defer></script>
```

---

## 修改记录

### 修改文件

1. **docs.html**
2. **index.html**
3. **editor.html**

### 修改内容

调整 Popper.js 和 Bootstrap 的加载顺序，确保 Popper.js 在 Bootstrap 之前加载，并移除 `defer` 属性。

---

## 总结

通过调整加载顺序或使用 Bootstrap Bundle，可以解决 dropdown.js 模块依赖 Popper.js 的问题，确保功能正常运行。
