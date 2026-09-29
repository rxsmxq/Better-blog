---
title: 超低成本搭建个人博客：Firefly + Cloudflare + Waline 全流程
published: 2026-09-29
description: 只花一个域名的钱，无需服务器，从 fork 主题到博客上线。
category: 建站
tags:
  - 博客
  - Astro
  - Cloudflare
  - Waline
pinned: true
---

不买服务器，本文记录这套博客从 fork 主题到评论上线的完整链路。每一步都是实际跑通过的，踩过的坑也一并给出。

# 一、方案总览

整套方案只有四个角色：

| 角色 | 承担职责 | 费用 |
| --- | --- | --- |
| GitHub | 存放博客源码（fork Firefly 主题） | 免费 |
| Cloudflare Workers | 构建并托管博客，push 即发布 | 免费额度足够 |
| Vercel + Neon | Waline 评论服务端 + Postgres 数据库 | 免费 |
| 域名 | 域名，DNS 托管在 Cloudflare | 一年只要6块且续费同价 |

工作原理：**源码推送到 GitHub → 平台自动拉取、构建、发布 → 以后每次发文推代码，网站几分钟后自动更新**。

# 二、主题：fork 与清理

主题选了 [MmzMing](https://github.com/MmzMing) 的 Firefly（基于 Astro），文章、相册、友链、评论、搜索全都自带，感谢作者开源。

fork 下来后的第一件事是清理原作者痕迹，建议先下载到本地，全部交给Agent就可以了。

如果想要其他功能，可以直接告诉你的Agent，Firefly的拓展性是很强的。

# 三、博客部署：Cloudflare Workers

构建条件仓库里都是现成的，配置只有三处：

1. Cloudflare 控制台 → Workers & Pages → 连接 Git 仓库
2. Build command：`pnpm run build`（项目强制 pnpm，npm 装依赖会直接报错）；Deploy command：`npx wrangler deploy`
3. 仓库放一个 `.nvmrc` 写 `22`，钉住构建机 Node 版本

`pnpm run build` 是一条完整链路：图标生成 → 图片占位图 → Astro 构建 → Pagefind 全文索引，不用拆开单独跑。

> 构建日志出现 `The collection "posts" does not exist` 不是错误，只是还没有文章的提示。

最后在 Settings → Domains & Routes 绑自定义域，域名在同账号下托管，DNS 记录和证书自动创建，几分钟生效。之后每次 `git push`，三分钟左右自动上线。

# 四、评论：Waline on Vercel + Neon

1. [waline.js.org](https://waline.js.org/guide/get-started/) 点 Vercel 一键部署，模板仓库自动进你的 GitHub
2. 项目 Storage → Create Database → 选 Neon，区域选新加坡（对大陆访客快）；前缀留空，注入的才是 Waline 读的 `DATABASE_URL`
3. 进 Neon 的 Queries，跑一遍官方 [waline.pgsql](https://github.com/walinejs/waline/blob/main/assets/waline.pgsql)，建出 `wl_comment` / `wl_counter` / `wl_users` 三张表
4. 回 Vercel Redeploy 一次，让数据库配置生效
5. 访问 `/ui/register`，第一个注册的账号自动成为管理员
6. 绑自定义域：Vercel 加 `comment.472100.xyz`，到 Cloudflare 加 CNAME `comment → cname.vercel-dns.com`（灰云 DNS only，橙云会证书冲突）

> 部署列表里带 `-git-` 的随机域名是单次部署的临时地址，每次都会变；配置里必须用项目固定域名。

# 五、总结：这套方案好在哪

- **零服务器成本**：全免费额度，唯一开销是域名年费，纯数字的xyz域名非常便宜。
- **push 即发布**：发文 = `git add` → `git commit` → `git push`，三分钟自动上线
- **数据自持**：源码在自己仓库，评论在自己数据库，随时可换平台不锁死
- **功能开箱即用**：暗色模式、全文搜索、评论、相册、友链、RSS 全部内置
- **国内访问稳**：博客走 Cloudflare、评论走自有子域，不依赖默认二级域名

把配置里的名字换成你的，就能开张。
