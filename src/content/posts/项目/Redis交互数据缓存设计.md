---
title: Redis 交互数据缓存设计：高性能双Key方案
published: 2026-05-13
description: 基于 Redis Bitmap + Hash 的双 Key 方案设计文档，解析毫秒级交互操作的实现原理、数据同步策略及 Bitmap 在分布式场景下的局限性。
tags: [Redis, 缓存设计, 高性能, Bitmap, 交互数据]
category: 项目
draft: false
---

# Redis 交互数据缓存设计：高性能双Key方案

> 本方案基于 Redis Bitmap + Hash 的双 Key 设计模式，用 12MB 内存支撑 1 亿用户的交互状态存储，实现毫秒级操作与万级 QPS 的计数查询。评审重点：Bitmap 在分布式场景下的扩展性、雪花 ID 带来的内存风险、数据同步的最终一致性保障。

---

## 一、问题陈述

当前系统面临交互数据热点问题：单篇内容 1 分钟内涌入 10 万点赞时，数据库连接池被打满、行锁冲突、主从延迟达 800ms 以上。现有纯数据库方案的点赞操作平均响应时间为 480ms，P99 达 2.1s，无法支撑日均千万级交互操作。

**目标**：将交互操作响应时间降至 10ms 以内，QPS 提升至万级，支持 1 亿用户规模。

---

## 二、数据结构选型

| 数据结构 | 存储方式 | 内存占用（1亿用户） | 典型操作 | 适用场景 |
|---------|---------|-------------------|---------|---------|
| **String** | 简单键值对 | 高（每个 key 独立） | SET/GET/INCR | 单个计数、缓存 |
| **Hash** | 字段-值映射 | 中（共享 key） | HSET/HGET/HINCRBY | 对象属性、聚合计数 |
| **Set** | 无序唯一集合 | ~2GB | SADD/SREM/SISMEMBER | 关系存储、去重 |
| **Bitmap** | 位数组 | **~12MB** | SETBIT/GETBIT/BITPOS | 状态标记（是/否） |

**选型结论**：
- **Bitmap**：用于存储用户级状态（1 bit/用户，极致内存压缩）
- **Hash**：用于存储内容级计数（一个 key 聚合多维度）

---

## 三、双 Key 设计模式

### 3.1 核心设计

采用统一的双 Key 设计模式：

```
                        用户交互请求
                              │
           ┌──────────────────┼──────────────────┐
           ▼                                      ▼
    ┌───────────────┐                    ┌───────────────┐
    │  Bitmap Key   │                    │   Hash Key    │
    │ 「谁做了」     │                    │ 「做了多少」   │
    └───────┬───────┘                    └───────┬───────┘
            │                                    │
            ▼                                    ▼
    ┌───────────────┐                    ┌───────────────┐
    │like:bit:1:10086│                    │ stat:1:10086  │
    │ userId位=1表示 │                    │ like:1 = 128  │
    │   已操作       │                    │ collect:1=64  │
    └───────┬───────┘                    └───────┬───────┘
            │                                    │
     ┌──────┴──────┐                     ┌──────┴──────┐
     ▼             ▼                     ▼             ▼
  SETBIT      BITPOS                HINCRBY       HGETALL
  O(1)        遍历                   O(1)          批量查询
```

**设计原则**：
- **Bitmap Key**：记录「谁做了」——用户级别的状态标记
- **Hash Key**：记录「做了多少」——内容级别的聚合计数

### 3.2 Key 命名规范

```
Bitmap Key: {interactionType}:bit:{targetType}:{targetId}
           示例: like:bit:1:10086
           含义: 笔记(type=1) ID=10086 的点赞用户集合
           存储: 第 userId 位为 1 表示该用户已点赞

Hash Key:   stat:{targetType}:{targetId}
           示例: stat:1:10086
           字段: like:1 = 128  (表示该笔记有 128 个点赞)
```

### 3.3 四种交互场景的实现差异

| 交互类型 | 用户状态存储 | 计数存储 | 特殊机制 |
|---------|------------|---------|---------|
| **点赞** | Bitmap (`like:bit`) | Hash (`like:{code}`) | SETBIT 原子 toggle |
| **收藏** | Bitmap (`collect:bit`) | Hash (`collect:{code}`) | SETBIT 原子 toggle |
| **关注** | Bitmap (`follow:bit:{userId}`) | Hash (`follow:{code}`) | Key 维度为用户 |
| **浏览** | 无（SETNX 锁） | Hash (`view:{code}`) | 5 分钟防重复锁 |

---

## 四、交互流程

### 4.1 点赞操作流程

```
┌─────────────────────┐
│   用户点击点赞       │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│   1. 参数校验       │
│   type/targetId/   │
│   userId            │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│   2. SETBIT         │
│   like:bit:1:10086  │
│   userId 1          │
└──────────┬──────────┘
           │
           ▼
     ┌─────┴─────┐
     │ 旧值 = ?  │
     └─────┬─────┘
    ┌──────┴──────┐
    ▼             ▼
旧值=1         旧值=0
    │             │
    ▼             ▼
┌─────────┐  ┌─────────────────────┐
│ 返回    │  │ 3. HINCRBY          │
│ false   │  │ stat:1:10086       │
│ 已点赞  │  │ like:1 1            │
└─────────┘  └──────────┬──────────┘
                        ▼
                 ┌─────────────┐
                 │ 返回 true   │
                 │ 点赞成功    │
                 └─────────────┘
```

**执行步骤**：

1. **参数校验**：校验 `type/targetId/userId`，非法参数直接返回 false
2. **SETBIT 原子操作**：
   ```bash
   SETBIT like:bit:1:10086 42 1
   ```
   - 返回旧值=0：未点赞过，继续下一步
   - 返回旧值=1：已点赞，直接返回 false
3. **HINCRBY 计数+1**：
   ```bash
   HINCRBY stat:1:10086 like:1 1
   ```
4. **返回 true**：点赞成功

**核心优势**：`SETBIT` 返回旧值的设计，让"判断是否已点赞"和"设置已点赞"合并为**一次原子操作**，无需分布式锁，彻底避免并发重复计数。

### 4.2 取消点赞流程

```bash
SETBIT like:bit:1:10086 42 0
# 返回旧值=1: 已点赞，继续下一步
# 返回旧值=0: 未点赞，直接返回 false

HINCRBY stat:1:10086 like:1 -1
```

---

## 五、数据同步与缓存预热

### 5.1 数据库表设计

```sql
CREATE TABLE document_user_interaction (
    id              BIGINT PRIMARY KEY,
    user_id         BIGINT COMMENT '用户ID（0表示统计记录）',
    target_type     INT COMMENT '目标类型: 1=笔记, 2=视频, 3=评论, 4=用户',
    target_id       BIGINT COMMENT '目标ID',
    interaction_type INT COMMENT '交互类型: 1=点赞, 2=收藏, 3=关注, 4=浏览',
    status          INT COMMENT '状态: 0=取消, 1=有效, 统计记录存储计数',
    create_time     DATETIME,
    update_time     DATETIME
);
```

### 5.2 同步流程

```
┌──────────────────────────────┐
│     定时任务触发             │
└──────────┬───────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌───────────┐ ┌───────────┐
│Bitmap同步 │ │ Hash同步  │
│  路径     │ │  路径     │
└─────┬─────┘ └─────┬─────┘
      │             │
      ▼             ▼
┌───────────┐ ┌───────────┐
│KEYS       │ │KEYS       │
│like:bit:* │ │stat:*     │
└─────┬─────┘ └─────┬─────┘
      │             │
      ▼             ▼
┌───────────┐ ┌───────────┐
│BITPOS     │ │HGETALL    │
│遍历用户ID │ │获取所有   │
│           │ │计数字段   │
└─────┬─────┘ └─────┬─────┘
      │             │
      ▼             ▼
┌───────────┐ ┌───────────┐
│写入DB     │ │写入DB     │
│用户记录   │ │统计记录   │
│           │ │user_id=0  │
└─────┬─────┘ └─────┬─────┘
      │             │
      ▼             ▼
┌───────────┐ ┌───────────┐
│DEL        │ │保留Hash   │
│Bitmap Key │ │继续累加   │
└───────────┘ └───────────┘
```

**同步步骤**：

1. **扫描 Bitmap Key**：`KEYS like:bit:*`
2. **遍历已操作用户**：`BITPOS` 获取所有值为 1 的位（用户ID集合）
3. **写入数据库**：每个 userId 写入/更新 DB 记录
4. **删除已同步的 Bitmap Key**
5. **扫描 Hash Key**：`KEYS stat:*`
6. **同步计数**：`HGETALL` 获取所有字段，写入 user_id=0 的统计记录

### 5.3 缓存预热

服务重启后从数据库预热缓存：

```java
public void warmCacheFromDb(Integer type, Long targetId) {
    redisTemplate.delete(bitmapKey);
    List<DocUserInteraction> interactions = mapper.selectByTarget(
        targetType, targetId, INTERACTION_TYPE_LIKE);
    for (DocUserInteraction interaction : interactions) {
        redisTemplate.opsForValue().setBit(bitmapKey, interaction.getUserId(), true);
    }
    Long dbCount = mapper.countByTarget(targetType, targetId, INTERACTION_TYPE_LIKE);
    redisTemplate.opsForHash().put(statKey, countField, dbCount.toString());
}
```

**预热时机**：服务启动时批量预热热点内容；用户首次查询时懒加载预热。

---

## 六、方案对比

### 6.1 与纯数据库方案对比

| 维度 | 纯数据库方案 | Bitmap + Hash 方案 |
|------|-----------|-------------------|
| 操作延迟 | 480ms（P99: 2.1s） | **< 10ms** |
| 高并发能力 | 受限于 DB 连接池 | **万级 QPS** |
| 重复操作判断 | SELECT + INSERT/UPDATE | **单次 SETBIT** |
| 计数查询 | SELECT COUNT(*) | **O(1) HGET** |
| 数据一致性 | 强一致 | 最终一致（可接受） |

### 6.2 与 Redis Set 方案对比

| 维度 | Set 方案 | Bitmap 方案 |
|------|---------|------------|
| 内存占用（1亿用户） | ~2GB | **~12MB** |
| 判断成员存在 | SISMEMBER O(1) | GETBIT O(1) |
| 添加成员 | SADD O(1) | SETBIT O(1) |
| 获取所有成员 | SMEMBERS O(N) | BITPOS 遍历 |
| 用户 ID 限制 | 无限制 | **ID 需为整数** |

---

## 七、Bitmap 局限性与风险

### 7.1 位偏移上限问题

**风险**：Redis Bitmap 的位偏移最大为 `2^32 - 1`（约 42 亿）。
**影响**：如果用户 ID 超过此值，Bitmap 无法存储，导致状态记录失败。
**应对**：使用分段 Bitmap 策略，按用户 ID 范围分片存储。

### 7.2 雪花 ID 的内存风险

**风险**：雪花 ID 通常为 64 位，直接作为 Bitmap 偏移会导致内存占用激增。
**影响**：假设最大用户 ID 为 `2^40`（约 1 万亿），Bitmap 占用约 125GB，完全不可行。
**应对**：
1. 建立用户 ID 到连续整数的映射表
2. 或改用 Redis Set 存储大 ID 用户的状态

### 7.3 分布式场景下的一致性问题

**风险**：Redis Cluster 模式下，同一内容的 Bitmap 和 Hash 可能分布在不同节点。
**影响**：跨节点操作无法保证原子性，可能出现状态与计数不一致。
**应对**：
1. 使用 Redis Pipeline 减少网络往返
2. 设置合适的 slot 规则，确保相关 key 落在同一节点
3. 定时任务校验并修复不一致

### 7.4 同步任务的幂等性

**风险**：定时任务可能重复执行，导致数据重复写入。
**影响**：统计记录可能被重复累加，用户状态记录重复插入。
**应对**：
- 用户记录：使用 `INSERT ... ON DUPLICATE KEY UPDATE`
- 统计记录：使用 `user_id=0` 标识 + 幂等更新逻辑

### 7.5 数据丢失风险

**风险**：Redis 故障或重启导致缓存数据丢失。
**影响**：未同步的数据丢失，计数可能不准确。
**应对**：
1. 开启 Redis RDB/AOF 持久化
2. 缩短同步周期（如 5 分钟一次）
3. 服务重启后从数据库预热缓存

---

## 八、总结

本方案基于 **Redis Bitmap + Hash 双 Key 设计模式**，核心要点：

1. **Bitmap 存状态**：用最小内存记录"谁做了"，利用 SETBIT 返回旧值实现原子去重
2. **Hash 存计数**：用一个 key 聚合多维度计数，HINCRBY 保证并发安全
3. **异步同步**：先写 Redis 保证性能，定时任务批量回写数据库保证持久化
4. **懒加载预热**：服务重启后按需从数据库恢复缓存

**关键权衡**：
- 选择最终一致性换取高性能
- Bitmap 的内存优势需与 ID 范围限制权衡
- 分布式环境下需关注 key 分布策略

---

## 九、参考资料

- [Redis Bitmap 官方文档](https://redis.io/docs/data-types/bitmaps/)
- [Redis Hash 官方文档](https://redis.io/docs/data-types/hashes/)
- 《Redis 设计与实现》黄健宏

---