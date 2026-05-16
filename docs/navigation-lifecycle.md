# 页面导航生命周期与组件分类

## 导航机制概览

项目使用 **Swup** (`@swup/astro@1.8.0`) 作为唯一的 SPA 页面切换引擎。

- **普通 `<a>` 链接**：Swup 自动拦截内部链接，执行 SPA 过渡
- **程序化导航**：统一使用 `navigateToPage()`（`src/utils/navigation-utils.ts`）
- **整页刷新**：`window.location.href`（仅用于外部链接降级场景）

Swup 管理的容器（页面切换时被替换）：
- `#swup-container` — 主内容区
- `#left-sidebar-dynamic` — 左侧栏占位（当前 hidden）
- `#right-sidebar-dynamic` — 右侧栏占位（当前 hidden）

侧边栏、Navbar、FloatingDock 等在容器**之外**，SPA 切换时**不会被替换**。

---

## 组件分类

### A. 切换时保持不变（持久化组件）

这些组件位于 Swup 容器之外，或标记了 `data-swup-ignore-script`，SPA 页面切换时**不会销毁重建**。

#### A1. 容器外持久组件（DOM 不变）

| 组件 | 位置 | 说明 |
|------|------|------|
| `Navbar.astro` | 布局顶层 | 导航栏 DOM 保持，通过事件更新激活状态 |
| `SideBar.astro` | 布局顶层 | 侧边栏整体保持，内部 widget 各自更新 |
| `Footer.astro` | 布局顶层 | 完全静态，无需更新 |
| `FloatingDock.astro` | 布局顶层 | DOM 保持，通过事件更新显隐状态 |
| `BackToTop.astro` | 布局顶层 | 纯滚动监听，与页面无关 |
| `BackToHome.astro` | 布局顶层 | 通过事件更新显隐 |
| `BackToComment.astro` | 布局顶层 | 通过事件更新显隐 |
| `LightDarkSwitch.svelte` | Navbar 内 | 通过 swup hook 同步主题状态 |
| `Search.svelte` | Navbar 内 | 搜索面板状态保持 |
| `DisplaySettings.astro` | Navbar 内 | 设置面板状态保持 |
| `WallpaperSwitch.astro` | Navbar 内 | 壁纸面板状态保持 |
| `Profile.astro` | 侧边栏 | 静态内容 |
| `Announcement.astro` | 侧边栏 | 静态内容 |
| `Tags.astro` | 侧边栏 | 静态内容 |
| `Advertisement.astro` | 侧边栏 | 静态内容 |

#### A2. `data-swup-ignore-script` 脚本不重执行

这些组件的 `<script>` 标记了 `data-swup-ignore-script`，Swup 的 `SwupScriptsPlugin` 不会在页面切换时重新执行它们。组件初始化一次后持久运行。

| 组件 | 文件 | 说明 |
|------|------|------|
| `GoogleAnalytics.astro` | analytics | 统计脚本，初始化一次即可 |
| `UmamiAnalytics.astro` | analytics | 统计脚本，初始化一次即可 |
| `MicrosoftClarity.astro` | analytics | 统计脚本，初始化一次即可 |
| `La51Analytics.astro` | analytics | 统计脚本，初始化一次即可 |
| `MusicManager.astro` | features | 脚本持久，但通过 swup hook 重同步播放状态 |
| `Calendar.astro` | widget | 脚本持久，但通过 `swup:contentReplaced` 更新日历数据 |
| `Navbar.astro`（Pagefind 脚本） | layout | 搜索索引脚本，初始化一次即可 |

---

### B. 切换时重新初始化（响应 Swup/Astro 事件）

这些组件在 SPA 页面切换后会重新初始化自身逻辑。按事件类型分组：

#### B1. 监听 `swup:contentReplaced`（DOM 事件，content:replace 完成后触发）

| 组件 | 动作 |
|------|------|
| `MainGridLayout.astro` | 重新初始化文章 TOC |
| `SidebarTOC.astro` | 重新初始化侧边栏目录 |
| `SiteStats.astro` | 更新统计数据 |
| `Calendar.astro` | 更新日历数据 |
| `Categories.astro` | 更新 banner 标题 |
| `HomePortal.astro` | 重新获取 UV/PV 计数 |
| `RecommendedPost.astro` | 重新渲染随机推荐文章 |
| `BackToHome.astro` | 更新按钮显隐 |
| `BackToComment.astro` | 更新按钮显隐 |
| `FloatingDock.astro` | 关闭抽屉、更新路径相关按钮 |
| `MusicManager.astro` | 重同步播放器状态 |
| `TypewriterText.astro` | 重新初始化打字机效果 |

#### B2. 监听 `swup:page:view`（DOM 事件，新页面视图就绪后触发）

| 组件 | 动作 |
|------|------|
| `Navbar.astro` | 重新检测激活导航项、重初始化 hover 滑块 |
| `NavMenuPanel.astro` | 关闭移动端抽屉 |
| `CategoryFollowBar.astro` | 重新初始化粘性分类栏 |
| `TypewriterText.astro` | 重新初始化打字机效果（冗余） |

#### B3. 监听 `swup.hooks.on("content:replace")`（Hook API）

| 组件 | 动作 |
|------|------|
| `Layout.astro` | 内容溢出处理、侧边栏显隐、图标加载 |
| `Live2DWidget.astro` | 重新初始化 Live2D 模型 |
| `SpineModel.astro`（widget + features） | 重新初始化 Spine 模型 |
| `MusicManager.astro` | 重同步播放器 |
| `Twikoo.astro` | 重新初始化评论 |
| `Giscus.astro` | 重新加载评论 iframe |
| `LightDarkSwitch.svelte` | 同步主题状态 |
| `TypewriterText.astro` | 重新初始化打字机效果（冗余） |
| `FancyboxManager.astro` | 重新绑定灯箱 |

#### B4. 监听 `astro:page-load`（Astro 生命周期事件，由 @swup/astro 桥接触发）

| 组件 | 动作 |
|------|------|
| `Layout.astro` | 内容溢出处理 |
| `MainGridLayout.astro` | 重新初始化文章 TOC |
| `SidebarTOC.astro` | 重新初始化侧边栏目录 |
| `Categories.astro` | 更新 banner 标题 |
| `CategoryFollowBar.astro` | 重新初始化 |
| `NavMenuPanel.astro` | 重新初始化抽屉 |
| `Navbar.astro` | 重新检测激活项 |
| `BackToHome.astro` | 更新显隐 |
| `BackToComment.astro` | 更新显隐 |
| `FloatingDock.astro` | 更新路径相关按钮 |
| `HomePortal.astro` | 重新获取数据 |
| `PostPage.astro` | 重新初始化布局 |
| `CoverImage.astro` | 重新初始化封面图 |
| `MusicManager.astro` | 重同步播放器 |

#### B5. 监听 `astro:after-swap`（Astro 生命周期事件，内容替换后立即触发）

| 组件 | 动作 |
|------|------|
| `PostPage.astro` | 重新初始化布局 |
| `friends.astro`（页面） | 初始化友链筛选 |
| `gallery/index.astro`（页面） | 初始化标签页和筛选 |
| `GuestbookComposeModal.astro` | 初始化留言板表单 |
| `GuestbookDetailModal.astro` | 初始化留言板详情 |
| `FriendRulesModal.astro` | 初始化友链规则弹窗 |

#### B6. 监听 `swup:enable`（Swup 初始化完成时触发，用于注册 hook）

| 组件 | 动作 |
|------|------|
| `BackToComment.astro` | 更新按钮显隐 |
| `LightDarkSwitch.svelte` | 注册 content:replace hook |
| `Twikoo.astro` | 注册 content:replace hook |
| `Giscus.astro` | 注册 content:replace hook |
| `Live2DWidget.astro`（widget + features） | 注册 content:replace hook |
| `SpineModel.astro` | 注册 content:replace hook |
| `MusicManager.astro` | 注册 hooks |

---

### C. 无 Swup 感知（纯服务端渲染或纯客户端逻辑）

这些组件不监听任何 Swup/Astro 生命周期事件：

| 组件 | 说明 |
|------|------|
| `PostCard.astro` | 纯 SSR，但卡片整体点击用 `window.location.href`（**绕过 Swup，导致整页刷新**） |
| `Pagination.astro` | 纯 `<a>` 标签，Swup 自动拦截 |
| `ClientPagination.astro` | 纯客户端分页，无页面导航 |
| `ButtonLink.astro` / `ButtonTag.astro` | 纯 `<a>` 标签 |
| `FriendCard.astro` | 外部链接，`target="_blank"` |
| `License.astro` | 静态内容 |
| `DropdownMenu.astro` | `<a>` 标签 + CustomEvent action |
| `CategoryBar.astro` | 纯 `<a>` 标签 |
| `BubbleMenu.svelte` | 外部链接 + mailto |

---

## 统一后的导航模式

### 原则

1. **内部页面导航**：统一使用 `navigateToPage(url)` 或原生 `<a href>` 标签
2. **外部链接**：`target="_blank"` + 原生 `<a>` 标签
3. **页面内锚点**：`navigateToPage("#id")` 或 TOCManager 处理
4. **不使用** `window.location.href` 做内部导航（会导致整页刷新）

### `navigateToPage()` 函数（`src/utils/navigation-utils.ts`）

```typescript
navigateToPage(url: string, options?: { replace?: boolean; force?: boolean })
```

- 外部链接 → `window.open(url, "_blank")`
- 锚点链接 → `scrollIntoView({ behavior: "smooth" })`
- 内部链接 + Swup 可用 → `window.swup.navigate(url)`
- 内部链接 + Swup 不可用 → `window.location.href`（降级）

全局可用：`window.navigateToPage(url)`（由 Layout.astro 注册）

### 组件事件监听建议

| 场景 | 推荐事件 |
|------|---------|
| 页面切换后更新 UI 状态 | `astro:page-load` |
| 内容替换后立即处理（DOM 已更新） | `astro:after-swap` |
| 注册 Swup hook（仅首次） | 监听 `swup:enable` 后调用 `window.swup.hooks.on(...)` |
| 脚本不应随 Swup 重执行 | `data-swup-ignore-script` |

> 避免同时监听 `swup:contentReplaced` + `swup:content:replace` + `swup:page:view`，
> 它们在同一次导航中会触发多次。优先使用 `astro:page-load`。
