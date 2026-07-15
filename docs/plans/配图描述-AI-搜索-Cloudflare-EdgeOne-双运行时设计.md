# 配图描述 — AI 搜索 Cloudflare / EdgeOne 双运行时设计

## 配图 1
**文档位置**：目录与组件边界章节，目录树之后。
**内容描述**：展示同一个 AISearch 前端通过 `/api/ai-chat` 连接两个独立部署入口。Cloudflare 入口组合共享 AI 核心、Vectorize Retriever、Durable Object 限流和 Workers AI 回退；EdgeOne 入口组合共享 AI 核心、Pages Blob Retriever 和用户配置的 OpenAI 兼容服务。图中明确两个平台之间不存在调用关系，共享核心不依赖任一平台 SDK。
