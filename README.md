# Firefly-Mod

> 基于 [Firefly](https://github.com/CuteLeaf/Firefly) 的个人博客魔改版 `V1.1.0`

![Node.js >= 22](https://img.shields.io/badge/node.js-%3E%3D22-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)
![Astro](https://img.shields.io/badge/Astro-6.x-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

<img alt="博客预览" src="./docs/images/ZS.png" />

## 简介

纯个性化魔改版本，已脱离原分支。基于 Astro 6.x + Svelte 5 + Tailwind CSS 4 构建的静态博客。

## 主要配置

### 上下班时间

```typescript
// src/config/siteConfig.ts
workHours: {
  start: 9,    // 上班时间 9:00
  end: 18,     // 下班时间 18:00
  workDays: [1, 2, 3, 4, 5, 6], // 周一到周六
},
```

侧边栏头像下方会根据当前时间自动显示工作/休息状态。

### 站点信息

```typescript
// src/config/siteConfig.ts
const SITE_LANG = "zh_CN";

siteConfig: {
  title: "MmzMing的博客",
  subtitle: "MmzMing",
  site_url: "https://tblog.mmzhiku.xyz",
  siteStartDate: "2026-05-07", // 用于统计运行天数
}
```

### 功能开关

```typescript
// src/config/siteConfig.ts
pages: {
  friends: true,     // 友链
  sponsor: true,     // 赞助
  guestbook: true,   // 留言板
  bangumi: true,     // 番组计划
  gallery: true,     // 相册
  collections: true, // 收藏API
  stats: true,       // 统计
}
```

更多配置详见 `src/config/` 目录。

## 技术栈

- [Astro](https://astro.build)
- [Tailwind CSS](https://tailwindcss.com)
- [Iconify](https://iconify.design)

## 灵感项目

- [fuwari](https://github.com/saicaca/fuwari)
- [hexo-theme-shoka](https://github.com/amehime/hexo-theme-shoka)
- [astro-koharu](https://github.com/cosZone/astro-koharu)
- [Mizuki](https://github.com/matsuzaka-yuki/Mizuki)

## Live2D 注意事项

作者是B站木果阿木果大大佬，大家感兴趣可以关注一下 [木果阿木果的B站](https://space.bilibili.com/886695)

- 使用前必须征求B站木果阿木果的同意
- 必须标明作者信息和作者地址视频
- 本模型的设计版权归属于库洛
- 模型可以用于制作鸣潮相关的视频和鸣潮游戏直播（需要标注来源）
- 不可用于任何商用盈利行为，禁止二次上传转载引流

## 许可协议

最初 Fork 自 [saicaca/fuwari](https://github.com/saicaca/fuwari)，感谢原作者的贡献

**版权声明：**

- Copyright (c) 2024 [saicaca](https://github.com/saicaca) - [fuwari](https://github.com/saicaca/fuwari)
- Copyright (c) 2025 [CuteLeaf](https://github.com/CuteLeaf) - [Firefly](https://github.com/CuteLeaf/Firefly)

根据 MIT 开源协议，你可以自由使用、修改、分发代码，但需保留上述版权声明。
