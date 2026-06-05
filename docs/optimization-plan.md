# 前端深度优化计划表

> 基于四维度全面审查：事件监听与内存管理、DOM 操作与重排重绘、CSS 动画性能、首屏加载优化

---

## 一、事件监听泄漏修复（23 项）

### 🔴 CRITICAL — 必须立即修复

| # | 文件 | 问题 | 修复方案 | 功能影响 | 优点 | 缺点/风险 | 状态 |
|---|------|------|----------|----------|------|-----------|------|
| 1 | `MainGridLayout.astro:212` | `initArticleTOC` 内 click 监听器每次导航累加 | 存储 handler 引用，cleanup 时 removeEventListener | ❌ **不影响功能** | 消除内存泄漏 | 无 | ✅ |
| 2 | `Layout.astro:326,341-348` | Swup hook 内 setTimeout 未清除，快速导航竞态 | 模块作用域存储 timeout ID，visit:start 时 clearTimeout | ⚠️ **修复 bug** — 消除快速导航闪烁 | 过渡类在正确时机移除 | 无 | ✅ |
| 3 | `Live2DWidget.astro` | 15+ 个 document/window 监听器无 cleanup | AbortController 统一管理，cleanup 时 abort | ❌ **不影响功能** | 内存不再持续增长 | 无 | ✅ |
| 4 | `SpineModel.astro:353` | setInterval 返回值未存储 | 存储 interval ID，cleanup 时 clearInterval | ❌ **不影响功能** | 定时器不再残留 | 无 | ✅ |
| 5 | `SiteStats.astro:145-173,219-221` | 两个 rAF 无限循环无 cancelAnimationFrame | 存储 rAF ID；动画按需启动；DOM 查询缓存 | ❌ **不影响功能** | CPU 占用降为 0 | 无 | ✅ |
| 6 | `Calendar.astro:498` | is:inline 脚本每次渲染重复注册监听 | 添加 `__calendarListenerAdded` guard | ❌ **不影响功能** | 避免 N 次重复初始化 | 无 | ✅ |

### 🟡 HIGH — 优先修复

| # | 文件 | 问题 | 修复方案 | 功能影响 | 优点 | 缺点/风险 | 状态 |
|---|------|------|----------|----------|------|-----------|------|
| 7 | `Navbar.astro:181,217-219` | `initHoverSlider` 每次导航重新调用，监听累加 | 提取 cleanupHoverSlider，调用前先移除旧监听 | ❌ **不影响功能** | 消除监听累加 | 无 | ✅ |
| 8 | `DropdownMenu.astro:150,163` | 每个实例各注册一个 document click handler | 添加 guard 防止重复注册 | ❌ **不影响功能** | 减少 document 上的监听器 | 无 | ✅ |
| 9 | `FloatingDock.astro:198,281,320,321` | 4 个 document/window 监听器无 cleanup | 添加 AbortController | ❌ **不影响功能** | 消除潜在泄漏 | 无 | ✅ |
| 10 | `MusicPlayer.astro:399` | playlist scroll 监听器未在 cleanup 中移除 | 扩展 cleanup 逻辑 | ❌ **不影响功能** | scroll handler 不残留 | 无 | ✅ |
| 11 | `PostPage.astro:290-297,330-337` | DOMContentLoaded 和 astro:page-load 都给 img 添加 load 监听 | 统一用 astro:page-load + 事件委托 | ❌ **不影响功能** | 消除重复监听 | 无 | ✅ |
| 12 | `HomePortal.astro:210` | setInterval 未存储 ID | 存储 ID，重新挂载前 clearInterval | ❌ **不影响功能** | 避免重复 interval | 无 | ✅ |
| 13 | `CategoryBubbleMenu.svelte:94-101` | addEventListener 在 onMount 外执行 | 移入 onMount cleanup | ❌ **不影响功能** | 组件销毁时正确移除 | 无 | ✅ |
| 14 | `LightDarkSwitch.svelte:60` | swup:enable 监听 cleanup 未移除 | 在 onMount 返回中移除 | ❌ **不影响功能** | 消除监听泄漏 | 无 | ✅ |

### 🟢 MEDIUM — 计划修复

| # | 文件 | 问题 | 修复方案 | 功能影响 | 优点 | 缺点/风险 | 状态 |
|---|------|------|----------|----------|------|-----------|------|
| 15 | `MainGridLayout.astro:217` | `window.tocInternalNavigation = true` 永不重置 | 在 visit:end hook 中重置为 false | ⚠️ **修复隐藏 bug** | TOC 高亮逻辑更准确 | 无 | ✅ |
| 16 | `SidebarTOC.astro:79-104` | 5 个监听器无 cleanup，双重触发 | 只保留 astro:page-load | ❌ **不影响功能** | 消除重复初始化 | 无 | ✅ |
| 17 | `AnimatedTabs.svelte:45` | 监听在 onMount 外注册 | 移入 onMount | ❌ **不影响功能** | 生命周期正确管理 | 无 | ✅ |
| 18 | `ClientPagination.astro:310` | initPagination 无 guard | 添加 guard | ❌ **不影响功能** | 避免按钮监听累加 | 无 | ✅ |
| 19 | `TypewriterText.astro:169` | DOMContentLoaded 监听未移除 | 改用 astro:page-load | ❌ **不影响功能** | 监听器与 Swup 同步 | 无 | ✅ |
| 20 | `FloatingLyrics.astro:175` | visibilitychange 监听未纳入 cleanup | 添加到 cleanup 中 | ❌ **不影响功能** | 监听器不残留 | 无 | ✅ |
| 21 | `TerrariumModel.astro:143` | canvas click 在 dispose() 中未移除 | 存储 handler，dispose 时移除 | ❌ **不影响功能** | 避免多次 toggle | 无 | ✅ |
| 22 | `FilterControls.astro:44-76` | 按钮 click 监听累加 | 添加 guard | ❌ **不影响功能** | 避免多次过滤 | 无 | ✅ |
| 23 | `PrivacyModal.astro:70` | privacy:open 监听无 cleanup | 添加 cleanup | ❌ **不影响功能** | 消除监听泄漏 | 无 | ✅ |

---

## 二、DOM 操作与重排重绘优化（7 项）

| # | 文件:行号 | 问题 | 修复方案 | 功能影响 | 优点 | 缺点/风险 | 状态 |
|---|----------|------|----------|----------|------|-----------|------|
| 1 | `PostPage.astro:255-279` | Masonry 布局循环内 write→read，N 次强制重排 | 两遍法：先批量写样式，再批量读高度写位置 | ❌ **不影响功能** | O(N) 重排降为 O(1) | 代码复杂度略增 | ✅ |
| 2 | `MainGridLayout.astro:175-187` | alignTOCCoverImage 多次 getBoundingClientRect + style 写入 | 合并读取到 rAF；批量读取所有 rect | ❌ **不影响功能** | 减少布局抖动 | 无 | ✅ |
| 3 | `SiteStats.astro:146-152` | rAF 循环内每帧 querySelectorAll | 初始化时缓存 NodeList | ❌ **不影响功能** | 每帧省去 DOM 查询 | 需 resize 时更新缓存 | ✅ |
| 4 | `Layout.astro:248-255` | scheduleContentOverflowEnhancements 同步+rAF 各执行一遍 | 移除同步调用，只保留 rAF | ❌ **不影响功能** | 减少一次无用 DOM 查询 | 无 | ✅ |
| 5 | `PostPage.astro:104` | container.offsetHeight 强制重排 | 可改用 rAF | ❌ **不影响功能** | 微优化 | 需确认动画仍触发 | ⬜ |
| 6 | `FilterControls.astro:50,60` | click handler 内每次 querySelectorAll | 缓存到闭包外 | ❌ **不影响功能** | 减少重复查询 | 需 DOM 变化时更新 | ⬜ |
| 7 | `TabNav.astro:156-170` | hashchange handler 内每次 querySelectorAll | 同上 | ❌ **不影响功能** | 减少重复查询 | 同上 | ⬜ |

---

## 三、CSS 动画性能优化（14 项）

### 🔴 布局触发动画 → 改用 transform

| # | 文件:行号 | 当前属性 | 优化方案 | 功能影响 | 优点 | 缺点/风险 | 状态 |
|---|----------|----------|----------|----------|------|-----------|------|
| 1 | `navbar-new.css:174` | hover-border transition `left/width/height/top` | 改用 `transform: translateX() scaleX()` | ❌ **不影响功能** | 动画不触发 Layout | 需同步修改 JS 设置逻辑 | ⬜ |
| 2 | `layout-styles.css:155-162` | 主内容区 transition `top` | 改用 `transform: translateY()` | ❌ **不影响功能** | 滚动不触发 Layout | 需注意不影响文档流 | ⬜ |
| 3 | `toc.css:149` | toc-active-indicator transition `top/height` | `transform: translateY()` + 固定 height | ❌ **不影响功能** | 滚动时不触发 Layout | height 仍触发 Layout | ✅ |
| 4 | `grid.css:21` | article-toc-wrapper transition `left` | 改用 `transform: translateX()` | ❌ **不影响功能** | 动画不触发 Layout | 无 | ✅ |
| 5 | `guestbook.css:30` | tab-indicator transition `left/width` | `transform: translateX() scaleX()` | ❌ **不影响功能** | 动画性能提升 | scaleX 计算逻辑稍复杂 | ⬜ |
| 6 | `bangumi.css:30` | tab-underline-indicator transition `left/width` | 同上 | ❌ **不影响功能** | 同上 | 同上 | ⬜ |
| 7 | `gallery.css:15` | gallery-tab-indicator transition `left/width` | 同上 | ❌ **不影响功能** | 同上 | 同上 | ⬜ |
| 8 | `post-card.css:63` | ::after underline transition `width` | 改用 `transform: scaleX()` | ❌ **不影响功能** | 合成属性动画 | 需设置 transform-origin | ✅ |
| 9 | `floating-dock.css:21` | dock-buttons transition `max-height` | `transform: translateY()` + `clip-path` | ⚠️ **视觉微调** | 动画不触发 Layout | clip-path 浏览器兼容性 | ⬜ |
| 10 | `nav-menu-panel.css:172` | mobile-submenu transition `max-height` | `grid-template-rows: 0fr → 1fr` | ❌ **不影响功能** | 不触发 Layout | 需改为 display: grid | ⬜ |

### 🟡 transition: all → 指定属性

| # | 文件:行号 | 修复 | 功能影响 | 优点 | 缺点/风险 | 状态 |
|---|----------|------|----------|------|-----------|------|
| 11 | `dropdown-menu.css:62` | `all` → `opacity, visibility, transform` | ❌ **不影响功能** | 减少样式计算开销 | 新增过渡属性需手动添加 | ✅ |
| 12 | `guestbook.css:731` | `all` → `background-color, color, border-color` | ❌ **不影响功能** | 同上 | 同上 | ✅ |
| 13 | `archive-heatmap.css:26` | `all` → `background, color, border-color` | ❌ **不影响功能** | 同上 | 同上 | ✅ |

### 🟡 其他

| # | 问题 | 修复 | 功能影响 | 优点 | 缺点/风险 | 状态 |
|---|------|------|----------|------|-----------|------|
| 14 | `main.css:394-396` 对 `span/strong/ul/ol/table/th/td/pre` 全局应用 `transition-colors` | 缩小选择器范围，只对 `h1-h6/p/a/li/blockquote` 应用 | ⚠️ **主题切换时部分元素颜色过渡变即时** | 减少样式计算范围 | strong/code/表格颜色不再渐变 | ✅ |

---

## 四、首屏加载与资源优化（8 项）

| # | 问题 | 修复方案 | 功能影响 | 优点 | 缺点/风险 | 状态 |
|---|------|----------|----------|------|-----------|------|
| 1 | CSS 全量打包 | **保持 `cssCodeSplit: false`**，清理未使用变量和重复文件 | ❌ **不影响功能** | CSS 体积减小 ~15% | 无 | ✅ |
| 2 | 未使用 CSS 变量 | 删除 `variables.styl` 中 ~150 行死代码 | ❌ **不影响功能** | 减少编译输出 | 无 | ✅ |
| 3 | 重复 navbar CSS | 合并 `navbar.css` + `navbar-new.css` | ❌ **不影响功能** | 消除重复声明 | 合并需仔细 diff | ⬜ |
| 4 | backdrop-filter 移动端 | 移动端降级为 `blur(4px)` 或移除 | ⚠️ **移动端视觉减弱** | GPU 负载降低 | 毛玻璃效果变弱 | ✅ |
| 5 | 图片缺少尺寸 | 添加 width/height | ❌ **不影响功能** | 减少 CLS | 需设置正确宽高比 | ✅ |
| 6 | Disqus 无重初始化 | DISQUS.reset() SPA 重置 | ✅ **修复功能缺失** | 评论跨页可用 | 无 | ✅ |
| 7 | 广告组件缺 astro:page-load | 改用 astro:page-load + 防重复绑定 | ✅ **修复功能缺失** | 广告导航后正常 | 无 | ✅ |
| 8 | will-change 过度使用 | 动画开始时动态添加，结束后移除 | ❌ **不影响功能** | 释放 GPU 内存 | 增加代码复杂度 | ⬜ |

---

## 进度统计

| 类别 | 总数 | 已完成 | 待处理 |
|------|------|--------|--------|
| 事件监听泄漏 | 23 | ✅ 23 | 0 |
| DOM 重排重绘 | 7 | ✅ 4 | 3 微优化 |
| CSS 动画性能 | 14 | ✅ 7 | 7 需 JS 配合 |
| 首屏资源优化 | 8 | ✅ 6 | 2 |
| **总计** | **52** | **40** | **12** |

---

## 风险评估

| 变更类型 | 风险 | 有无功能影响 | 回退难度 |
|----------|------|-------------|----------|
| 监听器 cleanup | 低 | 无 | 低 |
| Masonry 两遍法 | 低 | 无 | 低 |
| CSS transform 替换 | 中 — 视觉可能有 1-2px 偏差 | 无 | 低 |
| transition: all → 指定属性 | 低 | 无 | 低 |
