# 首页 Hero 层重构设计文档

> 日期：2026-06-10
> 主题：首页第一层（HomeHero）全屏视觉重构 + 第二/三层留空

---

## 一、设计目标

将现有首页 `HomeHero.astro` 从"头像+简介"的紧凑布局，重构为**全屏沉浸式视觉层**（100vh），融合以下参考风格：

- **demo1.html**：三栏网格布局、暗色渐变、磨砂玻璃、花瓣飘落、鼠标视差、竖排文字
- **demo2.js**：anime.js v4 `scrambleText` 多模式打字机效果

第二、三层保持空的"修建中"占位。

---

## 二、视觉结构

```
┌─ 全屏容器 .home-hero (100vh, position: relative) ──────────────┐
│                                                                  │
│  背景层 (z-0): home1.webp + 暗色径向渐变遮罩 + vignette          │
│                                                                  │
│  ┌─ 左侧面板 (45%, z-10) ─────┐ ┌─ 中央区 (42%, z-5) ───┐ ┌─ 右侧 (13%, z-10) ─┐
│  │                            │ │                       │ │                     │
│  │  圆形头像 (6rem)            │ │  .art-window          │ │  pill标签           │
│  │  名字 (displayName)         │ │  磨砂玻璃卡片          │ │  "BLOG"             │
│  │  职业 (occupation)          │ │  + 背景图 home1       │ │                     │
│  │  打字机 (scramble bio)      │ │  (底层全屏背景的一部分)│ │  竖排文字装饰        │
│  │  社交链接 (气泡按钮 x2)      │ │                       │ │  名字               │
│  │                            │ │  悬浮人物 home2.jpeg   │ │  站点描述            │
│  │                            │ │  (鼠标视差+浮动动画)    │ │                     │
│  │                            │ │                       │ │  装饰元素            │
│  └────────────────────────────┘ └───────────────────────┘ └─────────────────────┘
│                                                                  │
│  前景层 (z-20): Canvas 花瓣飘落 + 点状网格 overlay               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、分区域详细设计

### 3.1 背景层

| 属性 | 值 |
|---|---|
| 背景图 | `/assets/images/home/home1.webp` |
| 叠加渐变 | `radial-gradient(circle at center, rgba(43,4,4,0.3) 0%, rgba(6,6,8,0.85) 100%)` |
| Vignette | `radial-gradient(circle, transparent 40%, rgba(6,6,8,0.85) 100%)` |
| 点状网格 | `radial-gradient(rgba(255,255,255,0.04) 15%, transparent 16%)`, 6px 间距 |

### 3.2 左侧面板（45%）

**内容（从上到下）**：

1. **圆形头像**
   - 尺寸：6rem（96px）
   - 边框：2px solid rgba(255,255,255,0.2)
   - 阴影：0 4px 20px rgba(0,0,0,0.5)
   - 数据来源：`profileConfig.avatar`

2. **名字**
   - 字体大小：2rem
   - 颜色：#ffffff
   - 字重：700
   - 数据来源：`profileConfig.displayName`

3. **职业**
   - 字体大小：0.875rem
   - 颜色：rgba(255,255,255,0.6)
   - 字重：400
   - 数据来源：`profileConfig.occupation`

4. **打字机效果（anime.js scrambleText）**
   - 容器：固定高度 3rem，防止布局跳动
   - 字体大小：1.125rem
   - 颜色：#b5893d（金色）
   - 数据来源：`profileConfig.bio`（字符串数组）
   - **多种 scramble 模式轮播**：
     - 模式A：`from: 'center'`, `cursor: '░▒▓█'`
     - 模式B：`from: 'right'`, `settleDuration: 500`
     - 模式C：`from: 'random'`, `perturbation: 0.3`
     - 模式D：`reversed: true`（删除效果）
   - 每条 bio 随机分配一种模式，循环播放

5. **社交链接（2个气泡按钮）**
   - 数据来源：`profileConfig.links` 前两项
   - 样式：圆形按钮，边框 1px solid rgba(255,255,255,0.3)
   - 尺寸：2.5rem x 2.5rem
   - Hover：背景变白，图标变黑

### 3.3 中央区（42%）

**art-window 磨砂玻璃卡片**：
- 尺寸：宽 92%，高 90%
- 背景：`rgba(20,30,30,0.15)`
- Backdrop-filter：`blur(12px) saturate(150%)`
- 边框：`1px solid rgba(255,255,255,0.08)`
- 圆角：8px

**悬浮人物 home2.jpeg**：
- 定位：absolute，底部对齐，水平居中
- 尺寸：高度 110%，宽度自动（保持比例）
- 超出 art-window 上下边界，形成"破框"效果
- **鼠标视差**：Lerp 插值，X轴范围 ±18px，Y轴范围 ±12px
- **浮动动画**：`translateY(0) -> translateY(-10px) -> translateY(0)`，6s 循环
- Drop-shadow：`0 15px 30px rgba(0,0,0,0.8)`

### 3.4 右侧面板（13%）

1. **Pill 标签**
   - 文字："BLOG"
   - 边框：1px solid rgba(255,255,255,0.2)
   - 圆角：20px
   - 背景：rgba(255,255,255,0.02)

2. **竖排文字**
   - `writing-mode: vertical-rl`
   - 主文字：站点名（如 "MmzMing"）
   - 副文字：站点描述或标语
   - 颜色：白色 + 半透明

3. **装饰元素**
   - 小菱形 `✦` 脉冲动画
   - 底部微文字

---

## 四、动画系统

### 4.1 花瓣飘落（Canvas）

- 画布：覆盖全屏，pointer-events: none
- 花瓣数量：桌面端 30，移动端 15
- 颜色：
  - `rgba(239, 68, 68, 0.25)`（红）
  - `rgba(249, 115, 22, 0.20)`（橙）
  - `rgba(254, 205, 211, 0.25)`（粉）
- 运动：自然下落 + 左右摇摆 + 旋转
- 鼠标影响：花瓣受鼠标移动风向轻微偏移

### 4.2 打字机时间线

使用 `animejs` 的 `createTimeline({ loop: true })`：

```
Timeline（每条 bio 一个周期）:
  1. scrambleText 解码显示（随机模式，约 800-1500ms）
  2. 停留 3000ms（读取时间）
  3. scrambleText 反向删除（约 600-1000ms）
  4. 切换到下一条 bio，循环
```

### 4.3 鼠标视差

- 监听 `mousemove`，计算归一化坐标 (-1 ~ 1)
- 人物层：Lerp 系数 0.08，移动范围 ±18px (X), ±12px (Y)
- 背景层：反向微动，范围 ±5px（增强深度感）
- 使用 `requestAnimationFrame` 更新

---

## 五、移动端适配

| 元素 | 桌面端 | 移动端 |
|---|---|---|
| 布局 | 三栏网格 (45/42/13) | 单栏，内容居中 |
| 右侧面板 | 显示 | **隐藏** |
| 中央 art-window | 显示 | **隐藏** |
| 悬浮人物 | 显示 | **隐藏** |
| 花瓣数量 | 30 | 15 |
| 左侧面板 | 左对齐 | 全宽居中 |
| 头像 | 6rem | 5rem |
| 打字机 | 1.125rem | 1rem |

**移动端保留**：全屏背景图 + 暗色遮罩 + 左侧内容（头像、名字、职业、打字机、社交链接）+ 简化花瓣

---

## 六、Swup 兼容性

- 所有动画实例（anime timeline、canvas、raf）在 `astro:page-load` 时重新初始化
- 离开首页时清理所有动画实例，防止内存泄漏
- 打字机容器使用固定高度，防止 Swup 替换时布局跳动

---

## 七、依赖

新增：`animejs` (v4.x)

```bash
pnpm add animejs
```

---

## 八、文件变更清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `src/components/layout/HomeHero.astro` | 重写 | 全新全屏布局 |
| `src/styles/components/home-hero.css` | 重写 | 全新样式 |
| `src/pages/index.astro` | 修改 | 第二层、第三层改为空修建中 |
| `package.json` | 修改 | 新增 animejs 依赖 |

---

## 九、检查清单

- [ ] 无内联 `<style>` 块（样式在 `home-hero.css`）
- [ ] 使用 CSS 自定义属性（颜色、间距）
- [ ] BEM 命名规范
- [ ] Swup 事件使用 `astro:page-load`
- [ ] 移动端完整适配
- [ ] 主题切换兼容（暗色/亮色）
- [ ] 动画实例正确清理
