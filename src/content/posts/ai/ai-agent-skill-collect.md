---
title: Skill 收集
published: 2026-04-12
description: 收集一些比较强势，但是还没使用的SKILL
tags: [ai, Skill]
category: ai
draft: false
---

## superpowers — 工程化开发工作流

[obra/superpowers](https://github.com/obra/superpowers) ⭐ 39,700+

AI Agent 开发工作流的决定版，由 Jesse Vincent（obra）打造。核心理念：**Process over Prompt（流程大于提示词）**——给 AI 套上软件工程的"纪律与护栏"，让它像资深工程师一样先思考、再规划、后编码、必验证。

### TDD 与 BDD：两种测试驱动开发哲学

superpowers 的核心基石是测试驱动理念，它完美融合了 TDD 和 BDD 两种方法论：

#### TDD（Test-Driven Development，测试驱动开发）

TDD 的经典循环：**Red → Green → Refactor**

1. **Red（红）**：先写一个会失败的测试用例。此时还没有实现代码，测试必然失败——这是"红"的含义。
2. **Green（绿）**：用最少的代码让测试通过。不要考虑优化，先让灯变绿。
3. **Refactor（重构）**：在测试保护下重构代码，消除重复、改善设计，同时保持测试绿色。

**为什么对 AI 编程至关重要？**

- **消除歧义**：当你对 AI 说"实现一个登录功能"，AI 可以有一万种理解方式。但当你先写好测试用例——"输入正确用户名密码返回 token，输入错误三次锁定账户"——AI 就再也没有模糊空间。
- **防止回归**：AI 改 A 功能时可能不小心破坏 B 功能。有测试套件意味着每次改动后都能立即验证。
- **约束幻觉**：AI 有时会"幻觉"出不必要的功能。TDD 强制 AI 只写刚好让测试通过的代码，不多写一行。

**superpowers 中的 TDD 铁则**："没有测试就没有生产代码"——这是不可协商的底线。superpowers 的 `test-driven-development` 子技能会强制执行这个流程：先写失败测试，再派发子代理写实现，最后用测试验证。

#### BDD（Behavior-Driven Development，行为驱动开发）

BDD 是 TDD 的进化版，核心公式：**Given → When → Then**

```
Given 用户在登录页（前置条件）
When  输入正确的用户名和密码（操作/事件）
Then  跳转到首页并显示欢迎信息（预期结果）
```

**BDD 与 TDD 的关键区别**：

| 维度 | TDD | BDD |
|------|-----|-----|
| 关注点 | 代码正确性 | 业务行为 |
| 语言 | 程序员语言（assertEqual, mock） | 自然语言（Given/When/Then） |
| 受众 | 开发者 | 开发者 + PM + QA + 业务方 |
| 粒度 | 单元级别 | 功能/场景级别 |
| 起点 | 单元测试 | 用户故事/场景描述 |

**BDD 在 superpowers 中的体现**：`brainstorming` 子技能要求先定义用户故事和验收条件，本质上就是 BDD 的 Given-When-Then 思维。在进入编码之前，先用自然语言把行为说清楚，这恰好解决了 AI 编程中最大的问题——需求不明确。

**superpowers 的 TDD+BDD 互补策略**：

1. **brainstorming（BDD 层）**：用 Given-When-Then 定义用户故事，让 PM 和开发者在同一页面上
2. **test-driven-development（TDD 层）**：将 BDD 场景转化为具体的单元测试，严格遵循 Red-Green-Refactor
3. **verification-before-completion（验证层）**：没有测试通过的证据，就没有完成声明

### 14 个子技能完整覆盖 SDLC

| 类别     | 技能                             | 用途                       |
| ------ | ------------------------------ | ------------------------ |
| 核心开发   | test-driven-development        | 强制 TDD：先写失败测试，再写实现       |
| 核心开发   | systematic-debugging           | 4 阶段调试：复现→定位→修复→验证       |
| 核心开发   | verification-before-completion | 没有验证证据就没有完成声明            |
| 计划设计   | brainstorming                  | 创建功能前必须先头脑风暴，探索需求和设计     |
| 计划设计   | writing-plans                  | 将工作拆分为 2-5 分钟的细粒度任务      |
| 计划设计   | executing-plans                | 批量执行（3 个任务一批）+ 人工检查点     |
| 代理统制   | subagent-driven-development    | 每个任务派发新子代理 + 两阶段审查       |
| 代理统制   | dispatching-parallel-agents    | 独立任务并行派发多个代理             |
| 代理统制   | using-superpowers              | 元技能：始终检查是否有适用的技能         |
| 协作 Git | requesting-code-review         | 派发 code-reviewer 子代理审查代码 |
| 协作 Git | receiving-code-review          | 技术性评估反馈，不是表演性同意          |
| 协作 Git | finishing-a-development-branch | 验证测试→4 选项→执行→清理          |
| 协作 Git | using-git-worktrees            | 创建隔离工作区 + 基线验证           |
| 协作 Git | writing-skills                 | 用 TDD 方法写新技能             |

### 铁则（Iron Law）

- **TDD 铁则**："没有测试就没有生产代码"
- **调试铁则**："没有根因分析就没有修复"
- **验证铁则**："没有验证证据就没有完成声明"

**合理化防止表**：专门对付 AI 偷懒的借口——"手动测试就够了""这个改动很小不需要测试""先写代码后面补测试"——每个借口都有明确的反驳。

**安装**：

```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

**典型场景**：新功能开发 → brainstorming → writing-plans → using-git-worktrees → subagent-driven-development → requesting-code-review → finishing-a-development-branch

---

## brainstorming — 头脑风暴 Skill

brainstorming 是 superpowers 体系中的**门禁技能**（gatekeeper skill）。任何新功能开发在编写一行代码之前，都必须先经过头脑风暴阶段。

**核心理念**：AI 最大的优势是"写代码快"，但最大的问题是"想得不够深"。brainstorming 强制 AI 在动手之前先思考——探索需求边界、质疑假设、发现隐藏的设计约束。

**工作流程**：

1. **需求探索**：AI 会主动提问——"这个功能的使用者是谁？""核心场景有哪些？""边界情况怎么处理？"
2. **方案对比**：至少提供 2-3 个技术方案，分析各自利弊（性能、复杂度、可维护性）
3. **风险识别**：提前标记高风险区域——"这里如果并发量上去会怎样？""数据一致性怎么保证？"
4. **输出规格**：将讨论结果固化为清晰的验收条件（Acceptance Criteria），成为后续 TDD 的输入

**为什么必须用？**

- 防止 AI 一上来就写代码，结果方向全错
- 把模糊的"大概想要"转化为可执行的验收条件
- 让 TDD 有据可依——测试用例直接来自 brainstorming 的输出

**适用场景**：新功能开发、重大重构、架构决策、API 设计等任何需要"先想清楚再动手"的场景。

---

## skill-creator — 技能创建器

[anthropics/skills/skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator)

Anthropic 官方出品的**元技能**——用来创建新 Skill 的 Skill。不是直接解决业务问题，而是提供标准化的技能创建框架，确保新技能符合 Claude Code 规范。

**核心能力**：

- **从零创建技能**：交互式引导——Claude 会提问你的工作流需求，自动生成文件夹结构、格式化 SKILL.md、打包所需资源
- **优化现有技能**：编辑和改进已有 Skill，提升触发准确性和输出质量
- **评估与基准测试**：运行 evals 测试技能效果，用方差分析基准性能
- **描述优化**：自动优化 Skill 的 description 字段，提高触发命中率

**创建流程**：

1. **捕获意图**——Claude 提问：技能做什么？何时触发？输出格式？是否需要测试用例？
2. **编写草稿**——生成 SKILL.md + 目录结构（scripts/、references/、assets/）
3. **创建测试**——生成测试提示词，运行 Claude-with-skill 验证
4. **评估结果**——定性评估 + 定量基准（eval-viewer 脚本可视化）
5. **迭代优化**——根据反馈重写技能，循环直到满意
6. **扩展测试集**——更大规模验证

**核心设计原则**：

- **渐进式披露**：元数据（~25 tokens）→ SKILL.md（~1,250 tokens）→ 资源文件（按需加载）
- **资源复用优先**：脚本、模板、参考文档分层组织
- **最小化冗余**：Claude 已经很聪明，只包含它不知道的新信息
- **可验证性**：有客观输出的技能（文件转换、数据提取）必须配测试用例

**实用场景**：当你发现反复向 Claude 粘贴相同的指令/清单/多步骤流程时，就该用 skill-creator 把它封装成技能了。

---

## 画图 Skill：fireworks-tech-graph — 技术图表生成

[yizhiyanhua-ai/fireworks-tech-graph](https://github.com/yizhiyanhua-ai/fireworks-tech-graph)

从自然语言生成生产级 SVG+PNG 技术图表。不需要学习 Mermaid 语法、不需要手绘、不需要 Visio——直接用自然语言描述，就能产出可直接用于正式文档的图表。

### 为什么需要它？

在技术文档和方案评审中，图表是不可或缺的表达工具。但传统的画图方式存在几个痛点：

- **Mermaid / PlantUML**：需要学习特定 DSL 语法，语法错误排查痛苦
- **Draw.io / Visio**：手动拖拽费时费力，调整布局极其繁琐
- **AI 直接生成 SVG**：产出的 SVG 质量参差不齐，风格不统一

fireworks-tech-graph 解决了这个问题——**你描述，它画图**。比如：

> "画一个微服务架构图，包含 API Gateway、3 个后端服务（用户服务、订单服务、支付服务）、一个 Redis 缓存层和一个 PostgreSQL 数据库"

几秒钟内就能得到一张专业的架构图，而且输出是标准的 SVG+PNG 格式，可以直接插入文档。

### 7 种图表风格

1. **架构图**——系统组件和连接关系，支持微服务、分层架构等
2. **流程图**——业务流程和决策路径，比如注册流程、退款流程
3. **时序图**——系统间交互时序，API 调用链、消息传递
4. **UML 类图**——面向对象设计，类关系、继承结构
5. **AI/Agent 工作流模式图**——AI 系统架构，多 Agent 协作流程
6. **网络拓扑图**——基础设施布局，VPC、子网、负载均衡
7. **状态机图**——状态转换逻辑，订单状态、工作流状态

### 输出格式

- **SVG**：矢量格式，无限缩放不失真，可用 Illustrator / Figma 二次编辑
- **PNG**：位图格式，可直接粘贴到文档、PPT、Notion、Confluence

### 适用场景

- **架构文档**：给团队展示系统设计，替代手绘架构图
- **技术方案评审**：可视化方案对比，让评审者一眼看懂
- **API 文档**：请求/响应流程图，比纯文字更直观
- **CI/CD 流水线**：部署流程可视化，新人 onboarding 必备
- **AI Agent 设计**：多 Agent 工作流编排图，展示决策逻辑

### 与 Mermaid 的对比

| 维度 | Mermaid | fireworks-tech-graph |
|------|---------|---------------------|
| 输入方式 | 手写 DSL 语法 | 自然语言描述 |
| 学习成本 | 需学习语法规则 | 零学习成本 |
| 输出格式 | SVG（代码生成） | SVG + PNG（生产级） |
| 风格控制 | 有限的主题 | 7 种图表风格 |
| 适用场景 | 嵌入 Markdown | 正式文档、PPT、网页 |

如果你经常需要画架构图、流程图但又不想花时间学画图工具，这个 Skill 是必装的。

---

## 蒸馏 Skill：mattpocock/skills — 工程师的实战技能集

[mattpocock/skills](https://github.com/mattpocock/skills)

由 TypeScript 领域顶级专家 Matt Pocock（Total TypeScript 作者）维护的个人技能集。这组 Skills 最大的价值在于：**它们是从真实工程实践中"蒸馏"出来的**，不是理论上的最佳实践，而是每天写代码时反复使用的工作流。

### 什么是"蒸馏"？

在 AI 编程语境中，"蒸馏"（Distillation）指的是：

> 将人类专家的隐性知识——那些"只可意会不可言传"的工作习惯、判断标准、决策模式——提炼为 AI 可以遵循的显式指令。

举个例子：一个资深工程师审查 PR 时，他会下意识地关注"这个函数有没有副作用""这里有没有潜在的 N+1 查询""这段代码的圈复杂度是不是太高了"。这些"肌肉记忆"对新手来说是隐性的，但通过 Skill 机制可以被"蒸馏"为 AI 的行为准则。

### Matt Pocock 的蒸馏哲学

Matt 的 Skills 有三个鲜明特点：

1. **极简主义**：每个 Skill 只做一件事，描述简洁到极致。不像一些商业化的 Skill 系统动辄上百个技能，他的集合小而精。
2. **实战导向**：所有技能都来自他日常写 TypeScript、做开源维护、审查 PR 的真实场景，不是凭空设计。
3. **持续演进**：随着工具的更新和工作流的变化，Skills 也在不断迭代——这就是"蒸馏"的动态特性：知识在不断提纯。

### 为什么关注它？

- **学习"高手怎么用 AI"**：看 Matt 用哪些 Skill、怎么用，相当于跟大佬结对编程
- **找到自己的蒸馏方法论**：如果你也是资深工程师，可以参考他的方式来"蒸馏"自己的经验，建立个人技能库
- **理解 Skill 的天花板**：看看顶级工程师的 Skills 能做什么、不能做什么，明确 AI 辅助编程的边界

**核心理念**：Skill 不是越多越好，而是越"精准"越好。一个好的 Skill 应该像一把手术刀——只切你需要切的地方，而不是一把瑞士军刀什么都能做但什么都不精。