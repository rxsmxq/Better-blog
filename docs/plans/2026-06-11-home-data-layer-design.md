# 首页数据层组件设计文档

> 日期：2026-06-11
> 主题：首页数据层组件，包含访问量、文章信息、社交联系跑马灯、技能图标跑马灯

## 核心摘要

本方案在首页 `HomeHero` 后新增一个全屏数据层，与 hero 区域同级。数据层采用 9x9 矩阵结构：第一层展示访问量和文章信息，第二层展示社交联系，第三层展示技能图标。评审重点：`Logo Loop.md` 的跑马灯逻辑如何适配到 Svelte、桌面端交互遮罩时间线是否可逆、移动端是否避免 hover 依赖。目标：交付一个可维护、可响应式适配、可通过构建检查的数据层组件。

## 背景与范围

当前首页由 `HomeHero`、`HomeTicker`、`HomePending` 组成。项目已存在访问量接口 `/api/count`、文章统计工具、社交链接配置和技能配置。本次新增数据层，不重构 hero，不替换公告跑马灯，不调整文章列表。

本次覆盖：

- 首页数据层全屏 section。
- 访问量卡片和文章信息卡片。
- 社交联系跑马灯。
- 技能图标跑马灯。
- 桌面端卡片交互层动画。
- 移动端布局适配。

本次不覆盖：

- 新增后端统计接口。
- 新增 React 运行时。
- 修改现有 Umami Worker 统计逻辑。
- 修改 hero 入场动画。

## 技术选型

采用 `Astro 容器 + Svelte LogoLoop + 独立 CSS`。

| 方案 | 结论 | 原因 | 代价 |
|---|---|---|---|
| Astro + 原生 JS 跑马灯 | 不采用 | 依赖少，但测量、复制轨道、悬停暂停会分散在页面脚本中 | 维护成本高 |
| Astro + Svelte LogoLoop | 采用 | 项目已接入 Svelte，适合承载 RAF、ResizeObserver、hover 状态和卸载清理 | 首页增加一个 Svelte island |
| Astro + React LogoLoop | 不采用 | 最贴近 `Logo Loop.md` 原始代码 | 需要为单个组件引入 React 集成和运行时 |

## 文件设计

| 文件 | 操作 | 职责 |
|---|---|---|
| `src/components/layout/HomeDataLayer.astro` | 新增 | 数据层主组件，负责布局、构建期文章统计、数据注入 |
| `src/components/features/LogoLoop.svelte` | 新增 | Svelte 版 LogoLoop，负责无缝滚动、复制轨道、悬停暂停、边缘渐隐 |
| `src/components/features/DataMetricCard.astro` | 新增 | 访问量和文章信息通用卡片，封装 4 个 Z 层 |
| `src/styles/components/home-data-layer.css` | 新增 | 数据层布局、卡片层级、交互动画、移动端样式 |
| `src/config/skillsConfig.ts` | 修改 | 将技能配置扩展为带图标的数据结构 |
| `src/pages/index.astro` | 修改 | 在 `HomeHero` 后插入 `HomeDataLayer` |
| `src/styles/main.css` | 修改 | 引入 `home-data-layer.css` |

## 组件关系

[配图：展示首页数据层组件关系，包括 index.astro、HomeDataLayer、DataMetricCard、LogoLoop.svelte、配置和统计工具之间的依赖关系]

```text
index.astro
  ├─ HomeHero
  ├─ HomeDataLayer
  │   ├─ DataMetricCard 访问量
  │   ├─ DataMetricCard 文章信息
  │   ├─ LogoLoop.svelte 社交联系
  │   └─ LogoLoop.svelte 技能展示
  ├─ HomeTicker
  └─ HomePending
```

## 布局设计

数据层为全屏 section，宽度突破主布局限制。

```css
.home-data-layer {
  width: 100vw;
  min-height: 100svh;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}
```

桌面端采用 9x9 矩阵，三层等高，每层高度为 3 个单位。

[配图：展示 9x9 数据层矩阵，第一层为 3x3 访问量和 6x3 文章信息，第二层为 3x3 社交介绍和 6x3 社交跑马灯，第三层为 3x3 技能介绍和 6x3 技能跑马灯]

```text
┌─────────────── 9 units ───────────────┐
│ 访问量 3x3 │ 文章信息 6x3             │
├───────────────────────────────────────┤
│ 社交介绍 3x3 │ 社交跑马灯 6x3          │
├───────────────────────────────────────┤
│ 技能介绍 3x3 │ 技能跑马灯 6x3          │
└───────────────────────────────────────┘
```

卡片间距使用同一个变量：

```css
.home-data-layer {
  --data-layer-gap: clamp(0.75rem, 1.4vw, 1.25rem);
  --data-card-radius: 1.25rem;
}
```

水平间距和垂直间距均使用 `--data-layer-gap`。所有卡片使用同一圆角。仅 Z-1 显示边框。

## 卡片 Z 层规范

每张卡片包含 4 个 Z 层。

| 层级 | 类名 | 职责 | 边框 |
|---|---|---|---|
| Z-1 | `.data-card__frame` | 背景层，黑白边框，无背景 | 显示 |
| Z-2 | `.data-card__visual` | 中景层，SVG 图形元素 | 不显示 |
| Z-3 | `.data-card__content` | 前景层，图标、标题、详情 | 不显示 |
| Z-4 | `.data-card__hover` | 交互层，遮罩、标题、胶囊详情 | 不显示 |

Z-3 默认定位在左下角。信息结构固定为图标、标题、详情，便于访问量卡片和文章信息卡片复用。

## 第一层卡片

### 访问量卡片

比例为 3x3，视觉上为正方形。

默认态：

- 图标：访问量相关 Iconify 图标。
- 标题：站点访问。
- 详情：展示 PV/UV 加载状态或简写数值。
- 中景层：轻量 SVG 占位图形。

悬停态胶囊：

- `访客 UV: {uv}`
- `浏览 PV: {pv}`
- `统计源: Umami`

访问量数据在客户端请求 `/api/count`。请求失败时显示 `--`，不阻塞数据层渲染。

### 文章信息卡片

比例为 6x3，视觉上为长方形。

默认态：

- 图标：文章相关 Iconify 图标。
- 标题：文章档案。
- 详情：文章数、分类数、标签数的短句。
- 中景层：轻量 SVG 占位图形。

悬停态胶囊：

- `文章: {postCount}`
- `分类: {categoryCount}`
- `标签: {tagCount}`
- `字数: {totalWords}`

文章统计在 Astro 构建期完成。字数计算复用现有 `SiteStats.astro` 的规则：移除代码块、行内代码和多余空白后，统计中文字符和英文字母数量。

## 第二层社交联系

比例为 9x3，内部拆为 3x3 介绍区和 6x3 跑马灯区。

介绍区：

- 标题：联系。
- 详情：使用短说明，不写使用教程。
- 中景层：轻量 SVG 装饰。

跑马灯区：

- 数据来源：`profileConfig.links`。
- 胶囊格式：图标 + 名称。
- 交互：悬停暂停，点击跳转到对应链接。
- 外链使用 `target="_blank"` 和 `rel="noreferrer noopener"`。
- 站内链接保持同页导航能力。

## 第三层技能展示

比例为 9x3，内部拆为 3x3 介绍区和 6x3 跑马灯区。

介绍区：

- 标题：技能。
- 详情：展示技能谱系概览。
- 中景层：轻量 SVG 装饰。

跑马灯区：

- 数据来源：`skillsConfig`。
- 胶囊格式：技能图标或图标 + 短名。
- 交互：悬停暂停，悬停显示技能名称提示。
- 技能项不可点击。
- 缺失图标时显示文字 fallback。

建议将技能配置扩展为：

```ts
export type SkillItem = {
  name: string;
  icon: string;
  group?: string;
};
```

## LogoLoop Svelte 适配

`LogoLoop.svelte` 按 `Logo Loop.md` 的核心能力移植，不照搬 React 代码。

保留能力：

- `items`：跑马灯数据。
- `speed`：速度，单位 px/s。
- `direction`：`left`、`right`、`up`、`down`。
- `logoHeight`：图标高度。
- `gap`：元素间距。
- `hoverSpeed`：悬停速度，`0` 表示暂停。
- `fadeOut`：边缘渐隐。
- `ariaLabel`：无障碍名称。

实现要点：

1. 使用 `ResizeObserver` 测量容器和序列尺寸。
2. 根据容器尺寸计算复制份数，保证无缝循环。
3. 使用 `requestAnimationFrame` 更新 transform。
4. 使用 Svelte `onDestroy` 清理 RAF 和 ResizeObserver。
5. `prefers-reduced-motion: reduce` 下停止 RAF，展示静态内容。

## 桌面端交互层动画

访问量卡片和文章信息卡片启用交互层动画。社交和技能跑马灯区域不启用此遮罩动画。

触发条件：

```js
window.matchMedia("(hover: hover) and (pointer: fine)").matches
```

进入时间线：

1. Z-4 激活，默认内容保持在 Z-3。
2. 底部超大圆形遮罩从卡片下方向上扩张。
3. 遮罩覆盖完成后，顶部标题和角标显露。
4. 胶囊详情按 stagger 从上往下掉落。
5. 胶囊落点使用不同的 `x`、`y`、`rotate`，形成不规则布局。

退场时间线：

1. 胶囊按相反顺序上浮或下坠并淡出。
2. 顶部标题和角标淡出。
3. 圆形遮罩向下收回。
4. Z-3 默认内容重新成为视觉主层。

动画状态管理：

- 每张卡片创建 1 个 GSAP timeline。
- 初始状态为 `paused: true`。
- `pointerenter` 调用 `timeline.play()`。
- `pointerleave` 调用 `timeline.reverse()`。
- 快速进出时不创建新 timeline，避免状态卡死。

圆形遮罩规则：

```css
.data-card__hover-orb {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 180%;
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(-50%, 58%) scale(0.18);
}
```

主题规则：

| 主题 | 遮罩 | 标题 | 胶囊 |
|---|---|---|---|
| 暗色 | 白色 | 黑色 | 黑/白混排 |
| 亮色 | 黑色 | 白色 | 白/黑混排 |

## 移动端适配

移动端不启用圆形遮罩和胶囊掉落动画。原因：移动端没有稳定 hover，模拟 hover 会导致点击目标和滚动行为冲突。

| 断点 | 布局 |
|---|---|
| `>= 1024px` | 标准 9x9 三层矩阵 |
| `769px - 1023px` | 第一层保持 1:2；第二/三层为 35% + 65% |
| `<= 768px` | 三层纵向堆叠；第一层两张卡片上下排列；介绍区在上，跑马灯在下 |
| `<= 480px` | 降低 `gap`、`logoHeight`、字体大小和胶囊 padding |

移动端卡片直接展示紧凑详情：

- 访问量卡片显示 UV/PV 两项。
- 文章信息卡片显示文章、分类、标签、字数。
- 社交和技能跑马灯保持横向滚动或静态换行，按实际可用宽度选择。

## 溢出与裁切规则

为避免 tooltip、胶囊和跑马灯常见裁切问题，溢出规则分层处理。

| 元素 | overflow |
|---|---|
| `.home-data-layer` | `visible` |
| `.data-card` | `visible` |
| `.data-card__frame` | `hidden`，只裁切边框内遮罩 |
| `.data-card__hover` | `hidden`，遮罩限制在卡片内 |
| `.logo-loop` 外层 | `visible` |
| `.logo-loop__viewport` | `hidden` |
| tooltip | `visible`，放在 viewport 外层 |

## 可访问性

- 数据层 section 使用 `aria-labelledby`。
- LogoLoop 根节点使用 `role="region"` 和 `aria-label`。
- 可点击社交胶囊使用 `<a>`，保留焦点样式。
- 技能项不可点击，使用 `aria-label` 暴露技能名称。
- `prefers-reduced-motion` 下关闭遮罩时间线和跑马灯 RAF。
- 访问量加载失败时显示文本 fallback，不只依赖颜色表达状态。

## Swup 与生命周期

首页脚本需兼容 Astro 页面加载和 Swup 替换。

1. `HomeDataLayer.astro` 的交互脚本在初次加载时执行。
2. 监听 `astro:page-load`，重新初始化当前页面的数据层交互。
3. 监听离场事件或组件卸载，清理 GSAP timeline。
4. `LogoLoop.svelte` 在 `onDestroy` 中清理 RAF 和 ResizeObserver。

## 验收标准

| 场景 | 标准 |
|---|---|
| 桌面 1440px | 数据层为完整三层 9x9 矩阵，第一层 3:6，第二/三层 3:6 |
| 桌面 hover | 访问量和文章卡片有圆形遮罩上涌、标题显露、胶囊掉落、离开反向退场 |
| 快速 hover | 多次快速进入/离开不卡状态，不残留半透明胶囊 |
| 社交跑马灯 | hover 暂停，点击胶囊跳转 |
| 技能跑马灯 | hover 暂停并显示名称提示，技能项不可点击 |
| 移动端 390px | 不启用遮罩动效，无横向溢出，无内容截断 |
| 减少动态 | `prefers-reduced-motion` 下动画关闭或降级 |
| 构建检查 | `pnpm astro check` 和 `pnpm build` 通过 |

## 风险

风险：圆形遮罩在不同卡片比例下覆盖不足。  
影响：卡片角落可能残留默认态内容，影响桌面 hover 视觉完整性。  
应对：遮罩直径按卡片对角线的 1.8 倍设置，并在 3x3、6x3 两种比例下用截图验证。

风险：LogoLoop 复制份数计算错误。  
影响：跑马灯在宽屏下出现空隙或跳动。  
应对：复制份数使用 `ceil(viewport / sequence) + 2`，并在图片/图标加载后重新测量。

风险：移动端模拟 hover 干扰点击和滚动。  
影响：用户无法稳定点击社交胶囊或滚动页面。  
应对：移动端禁用卡片 hover 时间线，直接展示紧凑详情。

风险：Swup 切页后 RAF 或 timeline 未清理。  
影响：后台动画继续运行，导致 CPU 占用增加。  
应对：Svelte `onDestroy` 清理 RAF；页面脚本维护 cleanup 列表并在重新初始化前执行。

## 实施顺序

1. 新增 `LogoLoop.svelte`，完成无缝滚动、悬停暂停和清理逻辑。
2. 新增 `DataMetricCard.astro`，完成 4 个 Z 层结构。
3. 新增 `HomeDataLayer.astro`，接入文章统计、访问量数据属性、社交和技能数据。
4. 新增 `home-data-layer.css`，完成 9x9 布局和移动端适配。
5. 实现桌面端 GSAP 交互时间线。
6. 扩展 `skillsConfig.ts` 技能图标结构。
7. 在 `index.astro` 和 `main.css` 中接入组件和样式。
8. 运行 `pnpm astro check`、`pnpm build`。
9. 使用 Playwright 截图检查桌面和移动端布局。
