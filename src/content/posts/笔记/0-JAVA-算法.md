---
title: 算法
published: 2026-03-12
description: Java算法基础学习笔记，涵盖递归思想与经典排序算法（冒泡排序等）的原理分析与代码实现，适合算法入门与面试复习使用。
tags: [JAVA, 算法]
category: JAVA
draft: false
---

## 递归

### 基本介绍

自己调用自己，每次调用时传入不同的变量

### 重要规则

1.执行一个方法时，就创建一个新的受保护的独立空间（栈空间）

2.方法的局部变量是独立的，不会项目影响，比如变量n

3.如果方法中使用的应用类型变量，就会共享该引用类型的数据

4.递归必须向退出递归的条件逼近，否则就会StackOverflowError报错

5.当方法执行完毕，或者遇到return，就会返回

### 案例

```java
public void test(int n){
	if(n>2){
		test(n-1); 
	}
}
```

# 排序

## 冒泡排序

### 案例

```java
public class BubbleSort {

    /*
     * 冒泡排序
     *
     * 参数说明: 
     *     a -- 待排序的数组
     *     n -- 数组的长度
     */
    public static void bubbleSort1(int[] a, int n) {
        int i,j;

        for (i=n-1; i>0; i--) {
            // 将a[0...i]中最大的数据放在末尾
            for (j=0; j<i; j++) {

                if (a[j] > a[j+1]) {
                    // 交换a[j]和a[j+1]
                    int tmp = a[j];
                    a[j] = a[j+1];
                    a[j+1] = tmp;
                }
            }
        }
    }

    /*
     * 冒泡排序(改进版)
     *
     * 参数说明: 
     *     a -- 待排序的数组
     *     n -- 数组的长度
     */
    public static void bubbleSort2(int[] a, int n) {
        int i,j;
        int flag;                 // 标记

        for (i=n-1; i>0; i--) {

            flag = 0;            // 初始化标记为0
            // 将a[0...i]中最大的数据放在末尾
            for (j=0; j<i; j++) {
                if (a[j] > a[j+1]) {
                    // 交换a[j]和a[j+1]
                    int tmp = a[j];
                    a[j] = a[j+1];
                    a[j+1] = tmp;

                    flag = 1;    // 若发生交换，则设标记为1
                }
            }

            if (flag==0)
                break;            // 若没发生交换，则说明数列已有序。
        }
    }

    public static void main(String[] args) {
        int i;
        int[] a = {20,40,30,10,60,50};

        System.out.printf("before sort:");
        for (i=0; i<a.length; i++)
            System.out.printf("%d ", a[i]);
        System.out.printf("\n");

        bubbleSort1(a, a.length);
        //bubbleSort2(a, a.length);

        System.out.printf("after  sort:");
        for (i=0; i<a.length; i++)
            System.out.printf("%d ", a[i]);
        System.out.printf("\n");
    }
}
```



# 项目
## 判断是否连续
利用**等差数列求和公式**做数学判定，无需遍历区间：
1. 去重后，若版本号是「连续无断层」的整数序列，则满足：
    总和最小值最大值元素个数
2. 若实际总和 ≠ 公式计算的总和 → 存在断层；
3. 重复版本号可通过「原始列表大小 - 去重后大小 > 0」快速判定（无需具体找重复值）。
```java
import java.util.*;

/**
 * 等差数列求和校验法：极致简洁，快速判定是否连续/重复
 * 时间复杂度：O(n)，空间复杂度：O(n)（仅去重）
 */
public class MathSumVersionValidator {

    public static SimpleCheckResult quickValidate(List<Integer> versionList) {
        if (versionList == null || versionList.isEmpty()) {
            return new SimpleCheckResult(false, false, false);
        }

        // 1. 去重，获取核心参数
        Set<Integer> unique = new HashSet<>(versionList);
        boolean hasDuplicate = versionList.size() > unique.size(); // 快速判定是否有重复
        if (unique.size() == 1) { // 只有1个版本号，必然连续
            return new SimpleCheckResult(true, hasDuplicate, true);
        }

        // 2. 找极值 + 计算总和
        int min = Collections.min(unique);
        int max = Collections.max(unique);
        long expectedSum = (long) (min + max) * unique.size() / 2; // 等差数列求和（防溢出用long）
        long actualSum = unique.stream().mapToLong(Integer::longValue).sum();

        // 3. 判定是否连续
        boolean isContinuous = expectedSum == actualSum;

        return new SimpleCheckResult(true, hasDuplicate, isContinuous);
    }

    // 极简结果封装：仅返回核心判定结果
    public static class SimpleCheckResult {
        private final boolean isValid; // 数据有效
        private final boolean hasDuplicate; // 是否有重复
        private final boolean isContinuous; // 是否连续

        public SimpleCheckResult(boolean isValid, boolean hasDuplicate, boolean isContinuous) {
            this.isValid = isValid;
            this.hasDuplicate = hasDuplicate;
            this.isContinuous = isContinuous;
        }

        @Override
        public String toString() {
            return "数学求和校验法（极简）结果：\n" +
                    "1. 是否有重复版本号：" + (hasDuplicate ? "是" : "否") + "\n" +
                    "2. 是否连续无断层：" + (isContinuous ? "是" : "否");
        }
    }

    // 测试
    public static void main(String[] args) {
        List<Integer> list1 = Arrays.asList(1,2,2,4,5); // 重复+断层
        List<Integer> list2 = Arrays.asList(1,2,3,4); // 无重复+连续
        System.out.println(quickValidate(list1));
        System.out.println("---");
        System.out.println(quickValidate(list2));
    }
}
```

# 限流算法

## 令牌桶算法

### 基本介绍

令牌桶算法是一种常用的流量控制算法。系统以恒定速率向桶中放入令牌，当桶满时不再放入。每次请求需要从桶中取走一个令牌，如果桶中没有令牌则请求被拒绝或等待。

### 核心特点

1. 以固定速率生成令牌，控制平均速率
2. 桶可以积累令牌，允许一定程度的突发流量
3. 桶有最大容量限制，防止突发过大
4. 适用于需要允许突发流量的场景

### 案例

```java
import java.util.concurrent.atomic.AtomicLong;

/**
 * 令牌桶限流器
 * 基于令牌桶算法实现，支持突发流量
 */
public class TokenBucketRateLimiter {

    private final long capacity;       // 桶容量（最大令牌数）
    private final double refillRate;   // 令牌填充速率（个/秒）
    private volatile double tokens;    // 当前令牌数
    private long lastRefillTime;       // 上次填充时间

    public TokenBucketRateLimiter(long capacity, double refillRate) {
        this.capacity = capacity;
        this.refillRate = refillRate;
        this.tokens = capacity; // 初始满桶
        this.lastRefillTime = System.nanoTime();
    }

    /**
     * 尝试获取令牌
     * @return true 获取成功，false 被限流
     */
    public synchronized boolean tryAcquire() {
        refill();
        if (tokens >= 1) {
            tokens -= 1;
            return true;
        }
        return false;
    }

    /**
     * 尝试获取指定数量的令牌
     */
    public synchronized boolean tryAcquire(int permits) {
        refill();
        if (tokens >= permits) {
            tokens -= permits;
            return true;
        }
        return false;
    }

    /**
     * 填充令牌
     */
    private void refill() {
        long now = System.nanoTime();
        double elapsed = (now - lastRefillTime) / 1_000_000_000.0; // 转为秒
        double newTokens = elapsed * refillRate;
        tokens = Math.min(capacity, tokens + newTokens);
        lastRefillTime = now;
    }

    public static void main(String[] args) throws InterruptedException {
        // 桶容量10，每秒填充2个令牌
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(10, 2);

        // 模拟突发请求
        for (int i = 0; i < 15; i++) {
            boolean allowed = limiter.tryAcquire();
            System.out.println("请求 " + (i + 1) + ": " + (allowed ? "通过" : "拒绝"));
        }

        Thread.sleep(1000); // 等待1秒，令牌恢复
        System.out.println("--- 等待1秒后 ---");
        for (int i = 0; i < 5; i++) {
            boolean allowed = limiter.tryAcquire();
            System.out.println("请求 " + (i + 1) + ": " + (allowed ? "通过" : "拒绝"));
        }
    }
}
```

## 漏桶算法

### 基本介绍

漏桶算法将请求想象为流入桶中的水，桶以固定速率漏水（处理请求）。当桶满时，新流入的水（请求）会被溢出丢弃。无论请求到达的速率如何，处理速率始终恒定。

### 核心特点

1. 以固定速率处理请求，输出速率恒定
2. 桶满时直接丢弃多余请求，平滑突发流量
3. 不允许突发流量，严格控制速率
4. 适用于需要严格限速的场景（如API调用、网络流量整形）

### 案例

```java
import java.util.concurrent.LinkedBlockingQueue;

/**
 * 漏桶限流器
 * 基于漏桶算法实现，严格控制处理速率
 */
public class LeakyBucketRateLimiter {

    private final long capacity;           // 桶容量
    private final double leakRate;         // 漏水速率（个/秒）
    private volatile double water;         // 当前水量
    private long lastLeakTime;             // 上次漏水时间

    public LeakyBucketRateLimiter(long capacity, double leakRate) {
        this.capacity = capacity;
        this.leakRate = leakRate;
        this.water = 0;
        this.lastLeakTime = System.nanoTime();
    }

    /**
     * 尝试放入请求
     * @return true 放入成功，false 桶已满被丢弃
     */
    public synchronized boolean tryAcquire() {
        leak();
        if (water < capacity) {
            water += 1;
            return true;
        }
        return false; // 桶满，丢弃请求
    }

    /**
     * 漏水（处理请求）
     */
    private void leak() {
        long now = System.nanoTime();
        double elapsed = (now - lastLeakTime) / 1_000_000_000.0;
        double leaked = elapsed * leakRate;
        water = Math.max(0, water - leaked);
        lastLeakTime = now;
    }

    /**
     * 获取当前等待时间（毫秒）
     */
    public synchronized long getWaitTimeMs() {
        leak();
        if (water < 1) return 0;
        return (long) ((water / leakRate) * 1000);
    }

    public static void main(String[] args) throws InterruptedException {
        // 桶容量5，每秒漏出1个请求
        LeakyBucketRateLimiter limiter = new LeakyBucketRateLimiter(5, 1);

        // 模拟突发请求
        System.out.println("--- 突发10个请求 ---");
        for (int i = 0; i < 10; i++) {
            boolean allowed = limiter.tryAcquire();
            System.out.println("请求 " + (i + 1) + ": " + (allowed ? "通过" : "丢弃"));
        }

        System.out.println("--- 等待3秒后 ---");
        Thread.sleep(3000);
        for (int i = 0; i < 5; i++) {
            boolean allowed = limiter.tryAcquire();
            System.out.println("请求 " + (i + 1) + ": " + (allowed ? "通过" : "丢弃"));
        }
    }
}
```

### 令牌桶 vs 漏桶对比

| 特性 | 令牌桶 | 漏桶 |
|---|---|---|
| 突发流量 | 允许（桶中有积累的令牌） | 不允许（严格匀速处理） |
| 输出速率 | 可变（有令牌时可快速处理） | 恒定 |
| 适用场景 | 允许短时突发，如用户请求 | 严格限速，如网络流量整形 |
| 实现复杂度 | 需要维护令牌生成和消耗 | 相对简单 |
```