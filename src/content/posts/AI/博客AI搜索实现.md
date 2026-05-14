---
title: 博客 AI 搜索：基于Cloudflare Vectorize的向量检索实现
published: 2026-05-14
description: 记录博客 AI 搜索功能的完整实现——Markdown 文档分块、向量化、Cloudflare Vectorize 存储、Worker 流式问答。架构选型、数据流、关键代码、踩坑点。
tags: [AI, RAG, Cloudflare, Vectorize, Svelte]
category: AI
draft: false
---

## 背景

博客已有 Pagefind 全文搜索，但它是关键词匹配——用户搜「缓存穿透怎么解决」，如果文章标题和正文中没有这几个字，就搜不到。

需要的是语义搜索：用户提问，AI 基于博客内容生成回答，并附上参考文章链接。

## 架构

```
┌─────────────────────────────────────────────┐
│  前端 Svelte 聊天组件                        │
│  POST /api/ai-chat → SSE 流式接收            │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  Cloudflare Worker                          │
│  1. 问题 → embedding 向量                    │
│  2. Vectorize 检索 topK 相似段落             │
│  3. 拼接 prompt（系统指令 + 检索结果 + 问题）│
│  4. 调用 LLM 流式生成回答                    │
│  5. SSE 返回 chunk + 参考文章                │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  Cloudflare Vectorize                       │
│  存储所有文章段落的向量 + metadata            │
└─────────────────────────────────────────────┘
```

核心是 RAG（Retrieval-Augmented Generation）：先检索再生成。

## 文档分块策略

直接把整篇文章向量化效果差——一篇 3000 字的文章，embedding 模型只能捕捉到主题，丢失细节。

做法是按 Markdown heading 切段：

```
## 缓存穿透
缓存穿透是指查询一个一定不存在的数据...

### 解决方案
1. 布隆过滤器...
2. 缓存空值...
```

每个段落保留上下文：文章标题 + 分类 + 标签 + 章节标题路径 + 正文。打包成一个 chunk：

```
文章：Redis 缓存设计
分类：笔记
标签：Redis, 缓存
章节：缓存问题 > 缓存穿透

缓存穿透是指查询一个一定不存在的数据...
```

过滤条件：正文少于 50 字的段落丢弃（太短没有检索价值）。

## 向量化与存储

### 构建脚本

`scripts/build-vectorize-index.js` 负责：

1. 读取 `src/content/posts/` 下所有非 draft 文章
2. 按 heading 切段，生成 chunk 列表
3. 调用 embedding API 生成向量
4. 批量写入 Cloudflare Vectorize

支持增量更新——通过 `.vectorize-manifest.json` 记录每篇文章的内容 hash，只处理新增/修改/删除的文章。

```bash
# 增量更新
node scripts/build-vectorize-index.js

# 全量重建
node scripts/build-vectorize-index.js --force
```

### Embedding 来源

两种模式，三者齐备时走第三方 API，否则用 Cloudflare Workers AI 免费模型：

| 模式 | 模型 | 维度 | 特点 |
|---|---|---|---|
| 第三方 API | Qwen3-Embedding-8B | 1024 | 中文效果好，需要 API Key |
| Workers AI | bge-base-en-v1.5 | 768 | 免费，英文为主 |

配置在 `.env` 中：

```env
# 第三方 embedding API（可选）
# 格式：OpenAI 兼容的 embeddings 接口，目前我选择的是魔搭社区的 Qwen3-Embedding-8B
# 原因很简单免费
AI_API_URL=https://api-inference.modelscope.cn/v1
AI_API_KEY=sk-xxx
AI_EMBEDDING_MODEL=Qwen/Qwen3-Embedding-8B

# 向量维度（需与索引一致）
VECTORIZE_DIM=1024
```

### Vectorize 操作

通过 Cloudflare REST API 操作（不是 Wrangler CLI）：

```javascript
// 插入
await fetch(`${API_BASE}/vectorize/v2/indexes/${INDEX_NAME}/insert`, {
  method: "POST",
  headers: { Authorization: `Bearer ${API_TOKEN}` },
  body: JSON.stringify({ vectors }),
});

// 查询
const results = await env.VECTORIZE.query(queryVector, {
  topK: 10,
  returnMetadata: true,
});
```

## Worker 端问答流程

`src/worker.js` 中的 `handleAIChat` 处理 `/api/ai-chat`：

### 1. Embedding

```javascript
async function getEmbedding(env, text) {
  if (useThirdParty(env)) {
    // 调用第三方 API
    const res = await fetch(`${baseUrl}/v1/embeddings`, { ... });
    return data.data[0].embedding;
  }
  // Workers AI
  const result = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text });
  return result.data[0];
}
```

### 2. 向量检索

```javascript
const queryVector = await getEmbedding(env, question);
const results = await env.VECTORIZE.query(queryVector, {
  topK: 10,
  returnMetadata: true,
});
```

过滤 `score < 0.2` 的低相似度结果，去重后拼接上下文。

### 3. Prompt 拼接

```javascript
const systemPrompt = `你是一个博客 AI 助手。根据以下博客内容回答用户问题。

规则：
- 如果内容中有相关信息，基于内容回答，并在最后附上参考文章
- 如果内容中没有相关信息，直接回答你知道的，并说明"以下回答不是来自博客内容"
- 回答使用 Markdown 格式
- 保持回答简洁明了
- 使用中文回答

博客内容：
${context}`;
```

### 4. 流式返回

SSE 格式，三种事件类型：

```
data: {"type":"refs","articles":[...]}   ← 参考文章（先发）
data: {"type":"chunk","text":"..."}       ← 回答文本片段
data: {"type":"done"}                     ← 结束
```

支持两种 LLM 后端：

- **第三方 API**（DeepSeek-V4-Flash）：OpenAI 兼容格式，解析 `data: [DONE]` 流
- **Workers AI**（Llama-3-8B-Instruct）：Cloudflare 原生流

## 前端组件

`src/components/controls/AISearch.svelte`，Svelte 5 + runes。

核心交互：

- **入口**：导航栏「工具」菜单触发 `toggle-ai-search` 事件，或 `Ctrl+K` 快捷键
- **聊天面板**：全屏遮罩 + 居中卡片，移动端底部弹起
- **流式渲染**：逐字显示（打字机效果），光标闪烁动画
- **参考文章**：AI 回答下方显示可点击的原文链接
- **多轮对话**：保留最近 6 条历史消息作为上下文
- **Markdown 渲染**：使用 `marked` 库，支持代码块、列表、引用

关键状态管理：

```svelte
let messages = $state<Message[]>([]);
let isLoading = $state(false);
let abortCtrl: AbortController | null = null;
```

流式读取使用 `ReadableStream` + `TextDecoder`，逐行解析 SSE data。

## 敏感配置处理

`wrangler.toml` 被 git 跟踪，不能硬编码 API Key。解决方案：

```toml
AI_API_KEY = "$AI_API_KEY"  # 部署时从环境变量注入
```

本地开发用 `.env`（已在 `.gitignore`），CI/CD 用 GitHub Actions Secrets：

```yaml
- name: Deploy
  run: pnpm wrangler deploy
  env:
    AI_API_KEY: ${{ secrets.AI_API_KEY }}
```

## 资源消耗

| 资源 | 免费额度 | 单次问答消耗 | 日均可用 |
|---|---|---|---|
| Workers AI | 10k tokens/天 | ~500-1000 tokens | 10-20 次 |
| Vectorize | 30M 查询/月 | 1 次查询 | ~1M 次/天 |
| Worker 请求 | 100k/天 | 1 次请求 | 100k 次/天 |

个人博客完全够用。

## 文件清单

| 文件 | 作用 |
|---|---|
| `scripts/build-vectorize-index.js` | 向量索引构建脚本 |
| `src/worker.js` → `handleAIChat` | Worker 端 RAG 问答 API |
| `src/components/controls/AISearch.svelte` | 前端聊天 UI |
| `.env.example` | 环境变量模板 |
| `wrangler.toml` | Vectorize + AI 绑定配置 |
| `.vectorize-manifest.json` | 增量更新 manifest（gitignored） |

## 踩坑记录

**1. 向量维度不一致**

构建脚本用第三方 API 生成 1024 维向量，但 Vectorize 索引创建时指定了 768 维（Workers AI 的默认值）——写入直接报错。必须保证 `VECTORIZE_DIM` 和索引创建时的 `--dimensions` 一致。

**2. Embedding URL 拼接**

第三方 API 的 base URL 可能带 `/v1` 或 `/chat/completions` 后缀，需要统一清理再拼 `/v1/embeddings`：

```javascript
function buildApiUrl(base, suffix) {
  return base
    .replace(/\/+$/, "")
    .replace(/\/v1\/?$/, "")
    .replace(/\/chat\/completions\/?$/, "") + suffix;
}
```

**3. Workers AI 流式响应格式**

Workers AI 的流式响应和 OpenAI SSE 格式不同，不能用同一套解析逻辑。需要分别处理，且 Workers AI 可能回退到非流式模式（需要额外处理 `response` 字段）。

**4. 相似度阈值**

Vectorize 返回的 cosine score 分布因 embedding 模型而异。实测 Qwen3-Embedding 的 score 整体偏低，0.2 以下基本是无关内容。阈值需要根据实际效果调整。
