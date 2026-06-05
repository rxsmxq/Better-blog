# 归档下拉菜单 + 分类玫瑰图 + 标签树图 设计文档

> 日期：2026-06-06
> 状态：已批准

## 概述

将顶部导航栏的"归档"独立链接改为下拉菜单，包含三个子项：归档（保持不变）、分类（新增玫瑰图页面）、标签（新增矩阵树图页面）。

## 需求

1. 导航栏"归档"改为下拉菜单，复用现有 `DropdownMenu.astro` 组件
2. 新增 `/categories/` 页面，使用 ECharts 玫瑰图展示分类分布
3. 新增 `/tags/` 页面，使用 ECharts 矩阵树图展示标签分布
4. 图表支持：悬停提示（Tooltip）、点击跳转到对应归档筛选、加载动画
5. 图表配色跟随网站亮色/暗色主题
6. 使用 ECharts 按需引入减小体积
7. 遵循项目 CSS 架构规范（样式集中在 `src/styles/`，BEM 命名）
8. 兼容 Swup 页面过渡（使用 `astro:page-load` 事件初始化/销毁图表）

## 架构设计

### 导航结构

```
┌─ 归档 ▼ ─┐
│  📅 归档  │  → /archive/
│  📊 分类  │  → /categories/
│  🏷️ 标签  │  → /tags/
└───────────┘
```

### 数据流

```
Astro 构建时
├── getCategoryList() → [{ name, count, url }]
└── getTagList() → [{ name, count }]

前端 ECharts
├── 玫瑰图：series.data = [{ name: "java", value: 25 }, ...]
└── 树图：series.data = [{ name: "JavaScript", value: 8 }, ...]
```

### 文件结构

```
新增文件：
├── src/pages/categories.astro              ── 分类页
├── src/pages/tags.astro                    ── 标签页
├── src/components/widget/CategoryRose.astro ── 玫瑰图组件
├── src/components/widget/TagTreemap.astro   ── 树图组件
├── src/utils/charts.ts                     ── ECharts 按需引入
├── src/styles/pages/categories.css         ── 分类页样式
└── src/styles/pages/tags.css               ── 标签页样式

修改文件：
├── src/config/navBarConfig.ts              ── 导航配置
├── src/constants/link-presets.ts           ── 链接预设
├── src/types/config.ts                     ── 类型定义
├── src/i18n/i18nKey.ts                     ── 国际化键
├── src/i18n/languages/zh_CN.ts             ── 中文翻译
├── src/i18n/languages/en.ts                ── 英文翻译
├── src/styles/main.css                     ── 导入新样式
└── package.json                            ── 添加 echarts 依赖
```

## 组件设计

### 1. ECharts 按需引入 (`src/utils/charts.ts`)

```typescript
import * as echarts from "echarts/core";
import { PieChart, TreemapChart } from "echarts/charts";
import { TooltipComponent, LegendComponent, TitleComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([PieChart, TreemapChart, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);
export default echarts;
```

预估打包体积：200-300KB（gzip 后约 60-80KB）

### 2. 分类玫瑰图 (`CategoryRose.astro`)

- 服务端通过 `getCategoryList()` 获取数据，以 `data-*` 属性传递给前端
- 前端使用 `astro:page-load` 事件初始化 ECharts 实例
- 配置：`pie` + `roseType: "area"`，标签显示分类名和数量
- 点击事件：`window.navigateToPage(getCategoryUrl(categoryName))`
- 主题跟随：从 CSS 变量读取颜色，监听 `data-theme` 属性变化

### 3. 标签树图 (`TagTreemap.astro`)

- 服务端通过 `getTagList()` 获取数据
- 前端使用 `treemap` 图表类型
- 配置：单层平铺，标签名显示在色块内
- 点击事件：`window.navigateToPage(getTagUrl(tagName))`
- 主题跟随：同上

### 4. Swup 兼容性

```typescript
document.addEventListener("astro:page-load", () => {
  const chartDom = document.getElementById("chart-container");
  if (!chartDom) return;

  const chart = echarts.init(chartDom);
  chart.setOption(option);

  const resizeHandler = () => chart.resize();
  window.addEventListener("resize", resizeHandler);

  // Swup 页面离开时销毁
  document.addEventListener("swup:willReplaceContent", () => {
    window.removeEventListener("resize", resizeHandler);
    chart.dispose();
  }, { once: true });
});
```

## 样式规范

- 所有 CSS 在 `src/styles/pages/` 目录下
- 使用 BEM 命名：`.categories-page__chart-container`
- 颜色使用 CSS 变量：`var(--card-bg)`, `var(--deep-text)`
- 响应式：图表容器宽度 100%，高度自适应（min-height: 400px）

## 交互设计

| 交互 | 行为 |
|------|------|
| 悬停分类扇区 | 显示 Tooltip："{分类名}：{N} 篇文章" |
| 点击分类扇区 | 跳转到 `/archive/?category=xxx` |
| 悬停标签色块 | 显示 Tooltip："{标签名}：{N} 篇文章" |
| 点击标签色块 | 跳转到 `/archive/?tag=xxx` |
| 页面加载 | 图表渐入动画（1000ms, cubicOut） |
| 窗口缩放 | 图表自动 resize |
| 主题切换 | 图表颜色实时更新 |
