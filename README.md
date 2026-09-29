# Better's Blog

> 我的个人博客 · 线上地址：**[blog.472100.xyz](https://blog.472100.xyz)**

![Astro](https://img.shields.io/badge/Astro-7.x-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Svelte](https://img.shields.io/badge/Svelte-5.x-%23FF3E00)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-%2306B6D4)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![Waline](https://img.shields.io/badge/%E8%AF%84%E8%AE%BA-Waline-%2300BFFF)

基于 [Firefly](https://github.com/CuteLeaf/Firefly) 与 [MmzMing/my-blog](https://github.com/MmzMing/my-blog) 深度魔改的个人博客，按自己的喜好重构了 UI 与交互，持续演进中。

## 主要特性

- **黑白简约 UI**：重构整体视觉与交互，组件以可交互为主，删除背景图与冗余装饰
- **首页个人门户**：能力 / 爱好 / 作品展示为主，不堆文章列表
- **LLM Wiki（构建期）**：`pnpm build` 生成 `llms.txt` 与 JSON / Markdown 机器入口，方便 AI、搜索引擎与阅读器收录
- **QQ 群聊风格留言板**：直接复用 Waline 登录、审核与评论数据，不依赖额外 Worker
- **文章日历热力图**：标注法定节假日（红字）、调休补班与传统节日
- **D3 标签图谱**：分类页用力导向布局 + Canvas 绘制标签关系，支持缩放、拖拽与键盘跳转
- **封面图优化**：构建期多格式 `srcset` + LQIP 占位渐变，消除图片加载闪白

## 本地开发

需要 Node.js ≥ 22、pnpm ≥ 9。

| 用途 | 命令 |
|------|------|
| 安装依赖 | `pnpm install` |
| 开发服务器 | `pnpm dev` |
| 构建 | `pnpm build` |
| 预览构建产物 | `pnpm preview` |
| Astro 类型检查 | `pnpm check` |
| 格式化 / Lint | `pnpm format` / `pnpm lint` |

完整命令、配置系统、挂件系统、CI/CD 与部署清单等维护文档见 **[docs/MAINTENANCE.md](./docs/MAINTENANCE.md)**。

## 部署

- **博客**：Cloudflare Workers，Git 推送自动构建
- **评论 / 留言**：Waline（Vercel + Neon Postgres）

## 致谢

按演进顺序感谢上游项目：

- [saicaca/fuwari](https://github.com/saicaca/fuwari)
- [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)
- [MmzMing/my-blog](https://github.com/MmzMing/my-blog)

## 许可协议

MIT 开源协议，可自由使用、修改、分发代码，需保留上游版权声明（详见 [docs/MAINTENANCE.md](./docs/MAINTENANCE.md) 末尾）。
