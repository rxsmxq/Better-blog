---
title: Easyexcel
published: 2025-06-09
description: Easyexcel企业级实战：多线程分批导入导出、OSS+Redis导出中心架构、DOM内存检查与Maven依赖配置全指南。
tags:
  - Java
  - Easyexcel
  - 工具
  - SpringBoot
  - 多线程
  - OSS
category: java
draft: false
---

# 核心问题

Easyexcel 解决 Apache POI 在百万级数据读写时的 OOM 问题。POI 将整个 Excel 加载到内存构建 DOM 树，10 万行 × 20 列的数据约占用 2GB 堆内存。Easyexcel 基于流式读写，一行解析完立即回调，内存占用控制在 MB 级别。

以下内容覆盖四个层次：

| 层次 | 场景 | 核心手段 |
|------|------|----------|
| 基础 | 单表万级导出 | 流式写入 + 模板填充 |
| 进阶 | 百万级导入 | 多线程分批 + SAX 解析 |
| 企业级 | 千万级导出 | 分页查询 + 多线程分片写入 |
| 架构级 | 导出中心 | OSS 暂存 + Redis 状态机 + 异步通知 |

# Maven 依赖

```xml
<!-- Easyexcel 核心 -->
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>easyexcel</artifactId>
    <version>3.3.4</version>
</dependency>

<!-- 配套依赖（按需选装） -->
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.5</version>
</dependency>
```

> Easyexcel 3.x 最低要求 Java 8，已内置 `poi` 和 `poi-ooxml`，无需重复引入。若项目中已有 POI 依赖，通过 `<exclusions>` 排除后手动对齐版本，否则 `NoClassDefFoundError`。

# DOM 内存检查

## 为什么 POI 会 OOM

POI 的 XSSFWorkbook 在 `new XSSFWorkbook(inputStream)` 时，将整个 Excel 解析为 DOM 树驻留内存。一张 100MB 的 `.xlsx` 文件解压后 XML 约 500MB，构建为 DOM 后占用堆内存 2-3 倍。

验证方式：

```java
// 构造 10 万行 Excel 并用 POI 读取，观察堆内存
byte[] bytes = new byte[0];
try (XSSFWorkbook wb = new XSSFWorkbook(new FileInputStream("100k.xlsx"))) {
    // 此处堆内存已暴涨
}
```

通过 JProfiler 或 `jmap -histo <pid>` 可以确认 `XSSFCell`、`XSSFRow`、`CTCell` 等对象数量与 Excel 行数成正比。

## Easyexcel 如何避免

Easyexcel 使用 SAX（Simple API for XML）逐行解析 `.xlsx` 底层 XML，不构建完整 DOM。核心流程：

```
InputStream → XMLStreamReader → 逐行 SAX 事件 → ReadListener.invoke(rowData) → 回调 → GC
```

一行回调完毕后，该行对象失去引用，可被 GC 回收。10 万行数据读取过程中堆内存峰值通常不超过 50MB。

**验证建议**：在 ReadListener 中打印 `Runtime.getRuntime().freeMemory()`，观察内存波动幅度。

# 多线程分批导入

## 场景

上传一个 50 万行的 Excel，每行需做数据校验（字段格式、字典匹配、唯一性检查），校验通过后批量写入数据库。

## 方案设计

```
Controller 接收文件
    → Service 异步处理（立即返回 traceId）
        → Easyexcel 流式解析 + 分批累积
            → 每 2000 行提交到线程池
                → Callable 执行校验 + INSERT
```

关键设计点：

- **主线程只做解析分发**，不阻塞 HTTP 响应
- **批量大小 2000 行**：平衡事务大小与内存占用，单批事务耗时约 2-5s
- **线程池固定 4 核心**：避免数据库连接池耗尽（HikariCP 默认 10 连接，4 线程各占 1 连接 + 主线程 1 连接 = 5 连接）
- **CountDownLatch 等全部批次完成**后汇总结果

## 完整代码

```java
@RestController
@RequestMapping("/import")
public class ImportController {

    @Resource
    private ImportService importService;

    @PostMapping("/users")
    public Result<String> importUsers(@RequestParam("file") MultipartFile file) {
        String traceId = UUID.randomUUID().toString().replace("-", "");
        importService.asyncImport(file, traceId);
        return Result.ok(traceId);
    }
}
```

```java
@Service
public class ImportService {

    private static final int BATCH_SIZE = 2000;
    private static final int THREAD_COUNT = 4;

    @Resource
    private UserDao userDao;

    @Async("importExecutor")
    public void asyncImport(MultipartFile file, String traceId) {
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);
        List<String> errorMessages = Collections.synchronizedList(new ArrayList<>());

        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                THREAD_COUNT, THREAD_COUNT, 60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(THREAD_COUNT * 2),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );

        List<UserImportDTO> batch = new ArrayList<>(BATCH_SIZE);
        List<Future<BatchResult>> futures = new ArrayList<>();

        try (InputStream in = file.getInputStream()) {
            EasyExcel.read(in, UserImportDTO.class, new ReadListener<UserImportDTO>() {

                @Override
                public void invoke(UserImportDTO data, AnalysisContext context) {
                    batch.add(data);
                    if (batch.size() >= BATCH_SIZE) {
                        List<UserImportDTO> snapshot = new ArrayList<>(batch);
                        futures.add(executor.submit(() -> processBatch(snapshot)));
                        batch.clear();
                    }
                }

                @Override
                public void doAfterAllAnalysed(AnalysisContext context) {
                    if (!batch.isEmpty()) {
                        futures.add(executor.submit(() -> processBatch(batch)));
                    }
                }
            }).sheet().doRead();
        } catch (Exception e) {
            errorMessages.add("文件解析失败: " + e.getMessage());
        }

        for (Future<BatchResult> future : futures) {
            try {
                BatchResult result = future.get();
                successCount.addAndGet(result.success);
                failCount.addAndGet(result.fail);
                errorMessages.addAll(result.errors);
            } catch (Exception e) {
                errorMessages.add("批次处理异常: " + e.getMessage());
            }
        }

        executor.shutdown();

        log.info("[{}] 导入完成, 成功: {}, 失败: {}",
                traceId, successCount.get(), failCount.get());
    }

    private BatchResult processBatch(List<UserImportDTO> batch) {
        BatchResult result = new BatchResult();
        List<User> validUsers = new ArrayList<>();

        for (UserImportDTO dto : batch) {
            try {
                validate(dto);
                validUsers.add(convert(dto));
                result.success++;
            } catch (Exception e) {
                result.fail++;
                result.errors.add("行 " + (dto.getRowIndex() + 1) + ": " + e.getMessage());
            }
        }

        if (!validUsers.isEmpty()) {
            userDao.batchInsert(validUsers);
        }
        return result;
    }

    private void validate(UserImportDTO dto) {
        if (StringUtils.isBlank(dto.getName())) {
            throw new IllegalArgumentException("姓名不能为空");
        }
        if (dto.getName().length() > 50) {
            throw new IllegalArgumentException("姓名长度不能超过50");
        }
    }

    private User convert(UserImportDTO dto) {
        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        return user;
    }
}
```

```java
@Data
public class UserImportDTO {
    @ExcelProperty(index = 0)
    private String name;

    @ExcelProperty(index = 1)
    private String email;

    private Integer rowIndex;
}
```

## 线程池与事务配置

```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean("importExecutor")
    public Executor importExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(8);
        executor.setThreadNamePrefix("import-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
```

```java
@Dao
public class UserDao {

    @Resource
    private JdbcTemplate jdbcTemplate;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void batchInsert(List<User> users) {
        String sql = "INSERT INTO t_user (name, email) VALUES (?, ?)";
        jdbcTemplate.batchUpdate(sql, users, users.size(), (ps, user) -> {
            ps.setString(1, user.getName());
            ps.setString(2, user.getEmail());
        });
    }
}
```

> **事务隔离**：`REQUIRES_NEW` 确保每个批次的 INSERT 独立提交。一批失败不影响其他批次。

# 多线程分批导出

## 场景

从数据库导出 200 万行用户数据为 Excel 文件。单线程逐行查询 + 逐行写入，耗时约 15min，且容易超时。

## 方案设计

```
Controller 接收导出请求
    → Service 异步处理
        → 先 COUNT 获取总数
        → 按 OFFSET/LIMIT 并行分页查询
            → 每个线程查询一页数据
            → 写入同一个 Easyexcel ExcelWriter
```

关键设计点：

- **分页查询**：每页 5000 行，200 万数据 = 400 次查询，用 4 线程并行处理
- **Easyexcel ExcelWriter 线程安全**：`ExcelWriter` 内部使用 `synchronized` 保护 `write()` 方法，多线程写入同一个 writer 是安全的
- **查询走索引**：分页字段必须有索引，否则 `OFFSET` 越大越慢

## 完整代码

```java
@RestController
@RequestMapping("/export")
public class ExportController {

    @Resource
    private ExportService exportService;

    @GetMapping("/users")
    public Result<String> exportUsers() {
        String traceId = UUID.randomUUID().toString().replace("-", "");
        exportService.asyncExport(traceId);
        return Result.ok(traceId);
    }
}
```

```java
@Service
public class ExportService {

    private static final int PAGE_SIZE = 5000;
    private static final int THREAD_COUNT = 4;

    @Resource
    private UserDao userDao;

    @Async("exportExecutor")
    public void asyncExport(String traceId) {
        long total = userDao.count();
        int totalPages = (int) Math.ceil((double) total / PAGE_SIZE);

        String filePath = "/tmp/export_" + traceId + ".xlsx";

        try (ExcelWriter excelWriter = EasyExcel.write(filePath, UserExportVO.class).build()) {
            WriteSheet writeSheet = EasyExcel.writerSheet("用户数据").build();

            ExecutorService executor = Executors.newFixedThreadPool(THREAD_COUNT);
            List<Future<?>> futures = new ArrayList<>();

            for (int page = 0; page < totalPages; page++) {
                final int currentPage = page;
                futures.add(executor.submit(() -> {
                    List<User> users = userDao.findByPage(currentPage * PAGE_SIZE, PAGE_SIZE);
                    List<UserExportVO> vos = users.stream()
                            .map(this::convert)
                            .collect(Collectors.toList());
                    excelWriter.write(vos, writeSheet);
                }));
            }

            for (Future<?> future : futures) {
                future.get();
            }
            executor.shutdown();
        } catch (Exception e) {
            log.error("[{}] 导出失败", traceId, e);
        }

        log.info("[{}] 导出完成, total: {}, file: {}", traceId, total, filePath);
    }

    private UserExportVO convert(User user) {
        UserExportVO vo = new UserExportVO();
        vo.setName(user.getName());
        vo.setEmail(user.getEmail());
        return vo;
    }
}
```

```java
@Data
@HeadRowHeight(25)
@ContentRowHeight(20)
public class UserExportVO {
    @ExcelProperty(value = "姓名", index = 0)
    @ColumnWidth(15)
    private String name;

    @ExcelProperty(value = "邮箱", index = 1)
    @ColumnWidth(30)
    private String email;
}
```

## COUNT 陷阱

```sql
-- 不好：全表扫描
SELECT COUNT(*) FROM t_user;

-- 好：走主键索引（仅 MyISAM 可 O(1)，InnoDB 仍需扫描）
SELECT COUNT(*) FROM t_user;

-- 更好：估算值（适用非精确场景）
SELECT TABLE_ROWS FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 't_user';
```

> InnoDB 下 `COUNT(*)` 必然全索引扫描。200 万行约 300ms。可接受就不优化，不可接受用估算值。

# OSS + Redis + Easyexcel 导出中心

## 问题

上述方案生成的文件在应用服务器本地磁盘。以下问题在企业环境中不可接受：

1. **文件丢失**：应用重启/缩容后 `/tmp` 下的文件被清理
2. **不可扩展**：多实例部署时，文件在实例 A 上生成，实例 B 无法提供下载
3. **耦合查询**：导出期间占住数据库连接，长任务影响在线业务
4. **无状态追踪**：用户不知道导出进度，重复点击产生多次导出

## 架构设计

```
┌──────────┐   POST /export     ┌──────────────┐
│  前端     │ ─────────────────> │  API 服务     │
│          │ <───────────────── │              │
│ 轮询状态  │   GET /export/{id} │              │
└──────────┘                    └──────┬───────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │ 生成 traceId     │ 返回 traceId      │
                    │ 写入 Redis       │                  │
                    ▼                  ▼                  │
           ┌──────────────┐   ┌──────────────┐           │
           │   Redis       │   │  导出任务队列  │           │
           │  Key: export: │   │  (线程池异步)  │           │
           │  {traceId}   │   └──────┬───────┘           │
           │  status/url   │          │                   │
           └──────────────┘          │ 分页查询 + 生成     │
                                     ▼                   │
                              ┌──────────────┐           │
                              │   OSS (S3)    │           │
                              │  /export/     │           │
                              │  {traceId}.   │           │
                              │  xlsx         │           │
                              └──────────────┘           │
                                     │                   │
                                     │ 更新 Redis         │
                                     │ status: DONE      │
                                     │ url: OSS预签名URL  │
                                     ▼                   │
                              前端拿到 URL 直接下载       │
```

## Redis 状态机

| 状态 | 含义 |
|------|------|
| `PENDING` | 任务已受理，等待执行 |
| `PROCESSING` | 正在生成文件 |
| `DONE` | 文件已上传 OSS，可下载 |
| `FAILED` | 生成失败，含错误信息 |

```java
@Component
public class ExportStateManager {

    private static final String KEY_PREFIX = "export:";
    private static final long TTL_HOURS = 24;

    @Resource
    private StringRedisTemplate redisTemplate;

    public void init(String traceId, String fileName) {
        Map<String, String> state = new HashMap<>();
        state.put("status", "PENDING");
        state.put("fileName", fileName);
        state.put("createTime", String.valueOf(System.currentTimeMillis()));
        redisTemplate.opsForHash().putAll(KEY_PREFIX + traceId, state);
        redisTemplate.expire(KEY_PREFIX + traceId, TTL_HOURS, TimeUnit.HOURS);
    }

    public void updateStatus(String traceId, String status) {
        redisTemplate.opsForHash().put(KEY_PREFIX + traceId, "status", status);
    }

    public void markDone(String traceId, String ossUrl) {
        Map<String, String> update = new HashMap<>();
        update.put("status", "DONE");
        update.put("url", ossUrl);
        update.put("finishTime", String.valueOf(System.currentTimeMillis()));
        redisTemplate.opsForHash().putAll(KEY_PREFIX + traceId, update);
    }

    public void markFailed(String traceId, String error) {
        Map<String, String> update = new HashMap<>();
        update.put("status", "FAILED");
        update.put("error", error);
        redisTemplate.opsForHash().putAll(KEY_PREFIX + traceId, update);
    }

    public Map<Object, Object> getState(String traceId) {
        return redisTemplate.opsForHash().entries(KEY_PREFIX + traceId);
    }
}
```

## 导出中心完整实现

```java
@Service
public class ExportCenterService {

    private static final int PAGE_SIZE = 5000;
    private static final int THREAD_COUNT = 4;

    @Resource
    private UserDao userDao;
    @Resource
    private OssService ossService;
    @Resource
    private ExportStateManager stateManager;
    @Resource("exportExecutor")
    private Executor exportExecutor;

    public String submitExport(ExportRequest request) {
        String traceId = UUID.randomUUID().toString().replace("-", "");
        String fileName = request.getFileName() + "_" + traceId + ".xlsx";
        stateManager.init(traceId, fileName);

        exportExecutor.execute(() -> executeExport(traceId, fileName, request));
        return traceId;
    }

    private void executeExport(String traceId, String fileName, ExportRequest request) {
        stateManager.updateStatus(traceId, "PROCESSING");
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        try {
            long total = userDao.countByCondition(request);
            int totalPages = (int) Math.ceil((double) total / PAGE_SIZE);

            try (ExcelWriter excelWriter = EasyExcel.write(outputStream, UserExportVO.class).build()) {
                WriteSheet writeSheet = EasyExcel.writerSheet("数据").build();

                ExecutorService pageExecutor = Executors.newFixedThreadPool(THREAD_COUNT);
                List<Future<?>> futures = new ArrayList<>();

                for (int page = 0; page < totalPages; page++) {
                    final int offset = page * PAGE_SIZE;
                    futures.add(pageExecutor.submit(() -> {
                        List<User> users = userDao.findByCondition(request, offset, PAGE_SIZE);
                        List<UserExportVO> vos = users.stream()
                                .map(this::convert)
                                .collect(Collectors.toList());
                        excelWriter.write(vos, writeSheet);
                    }));
                }

                for (Future<?> future : futures) {
                    future.get();
                }
                pageExecutor.shutdown();
            }

            String ossKey = "export/" + traceId + ".xlsx";
            ossService.upload(ossKey, outputStream.toByteArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

            String downloadUrl = ossService.generatePresignedUrl(ossKey, 24, TimeUnit.HOURS);
            stateManager.markDone(traceId, downloadUrl);

        } catch (Exception e) {
            log.error("[{}] 导出失败", traceId, e);
            stateManager.markFailed(traceId, e.getMessage());
        }
    }
}
```

```java
@RestController
@RequestMapping("/export-center")
public class ExportCenterController {

    @Resource
    private ExportCenterService exportService;
    @Resource
    private ExportStateManager stateManager;

    @PostMapping("/submit")
    public Result<String> submit(@RequestBody ExportRequest request) {
        String traceId = exportService.submitExport(request);
        return Result.ok(traceId);
    }

    @GetMapping("/status/{traceId}")
    public Result<Map<Object, Object>> status(@PathVariable String traceId) {
        Map<Object, Object> state = stateManager.getState(traceId);
        if (state.isEmpty()) {
            return Result.error("任务不存在或已过期");
        }
        return Result.ok(state);
    }
}
```

## OSS 集成（MinIO / 阿里云 OSS）

```java
@Component
public class OssService {

    @Resource
    private MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    public void upload(String objectName, byte[] data, String contentType) {
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .stream(new ByteArrayInputStream(data), data.length, -1)
                    .contentType(contentType)
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("OSS 上传失败", e);
        }
    }

    public String generatePresignedUrl(String objectName, long duration, TimeUnit unit) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .method(Method.GET)
                    .expiry((int) unit.toSeconds(duration))
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("预签名 URL 生成失败", e);
        }
    }
}
```

```yaml
minio:
  endpoint: http://minio.example.com:9000
  access-key: ${MINIO_ACCESS_KEY}
  secret-key: ${MINIO_SECRET_KEY}
  bucket: exports
```

# 防重复提交

用户连续点击导出按钮会创建多个相同任务。用 Redis 做幂等控制：

```java
@Component
public class ExportDeduplicator {

    private static final String DEDUP_KEY = "export:dedup:";
    private static final long WINDOW_SECONDS = 30;

    @Resource
    private StringRedisTemplate redisTemplate;

    public String acquireOrReject(String userId, String bizType, String bizId) {
        String key = DEDUP_KEY + userId + ":" + bizType + ":" + bizId;
        Boolean locked = redisTemplate.opsForValue()
                .setIfAbsent(key, "1", WINDOW_SECONDS, TimeUnit.SECONDS);
        if (Boolean.FALSE.equals(locked)) {
            return null;
        }
        String traceId = UUID.randomUUID().toString().replace("-", "");
        redisTemplate.opsForValue().set(key, traceId, WINDOW_SECONDS, TimeUnit.SECONDS);
        return traceId;
    }
}
```

> 30 秒窗口内同一用户同一业务同一 ID 只允许一次导出。第二次请求直接返回首次的 `traceId`。

# 踩坑点

## 1. Easyexcel 3.x `@ExcelProperty` 不生效

**现象**：`@ExcelProperty("姓名")` 注解后导出表头为空。

**原因**：Easyexcel 3.x 默认不再基于字段顺序映射，必须显式指定 `index` 或 `order`。

```java
// 错误：3.x 下不会自动映射
@ExcelProperty("姓名")
private String name;

// 正确
@ExcelProperty(value = "姓名", index = 0)
private String name;
```

## 2. 多线程写同一个 ExcelWriter 偶发 `NullPointerException`

**现象**：`excelWriter.write(data, sheet)` 偶发 NPE，堆栈指向 `WriteHandler` 内部。

**原因**：Easyexcel 3.3.x 的 `ExcelWriter.write()` 声明为线程安全，但内部 `WriteContext` 在并发场景下存在竞态（3.3.4 之前版本的已知问题）。

**方案**：

- **推荐**：升级到 3.3.4+
- **兜底**：不使用多线程写同一个 `ExcelWriter`，改为每个线程写独立 sheet，最后合并

```java
// 兜底方案：多 sheet 导出
for (int page = 0; page < totalPages; page++) {
    final int sheetNo = page;
    futures.add(executor.submit(() -> {
        WriteSheet sheet = EasyExcel.writerSheet("第" + (sheetNo + 1) + "页").build();
        excelWriter.write(data, sheet);
    }));
}
```

## 3. `OFFSET` 分页查询性能衰减

**现象**：前 10 页很快，到 200 页以后每页耗时从 200ms 涨到 3s。

**原因**：`LIMIT 100000, 5000` 需要扫描并丢弃前 100000 行。

**方案**：改用游标分页（基于自增 ID）：

```java
@Select("SELECT * FROM t_user WHERE id > #{lastId} ORDER BY id LIMIT #{pageSize}")
List<User> findByCursor(@Param("lastId") Long lastId, @Param("pageSize") int pageSize);
```

## 4. 导出大文件 OSS 上传超时

**现象**：200 万行生成的 `.xlsx` 约 80MB，上传耗时 5-10s，偶发超时。

**方案**：

```java
// 不使用 ByteArrayOutputStream 缓冲全量数据
// 改为先写本地临时文件，再分片上传
Path tempFile = Files.createTempFile("export_", ".xlsx");
try (ExcelWriter writer = EasyExcel.write(tempFile.toFile(), VO.class).build()) {
    // ... 写入数据
}
ossService.uploadLargeFile(objectName, tempFile.toFile()); // 分片上传
Files.deleteIfExists(tempFile);
```

# 方案对比

| 维度 | 基础导出 | 多线程分批 | 导出中心 |
|------|----------|-----------|----------|
| 数据量上限 | 5 万行 | 200 万行 | 千万级 |
| 导出耗时（100万行） | ~8min | ~2min | ~2min |
| 文件存储 | 本地磁盘 | 本地磁盘 | OSS |
| 进度追踪 | 无 | 无 | Redis 状态机 |
| 幂等控制 | 无 | 无 | Redis 防重 |
| 多实例兼容 | 否 | 否 | 是 |
| 适用的业务级别 | P2 后台管理 | P1 运营报表 | P0 客户对账单 |

# 总结

- **Easyexcel 核心优势**：SAX 流式解析，内存占用从 GB 级降至 MB 级
- **多线程分批导入**：`ReadListener` 累积到批次大小后提交线程池，`REQUIRES_NEW` 事务隔离
- **多线程分批导出**：分页并行查询 + 线程安全的 `ExcelWriter.write()`，注意 OFFSET 衰减
- **导出中心**：OSS 存储解耦应用实例，Redis 状态机追踪进度，预签名 URL 鉴权下载
- **DOM 检查**：Easyexcel 不构建 DOM，通过 JProfiler / `jmap` 可验证内存差异

# 参考资料

- [Easyexcel 官方文档](https://easyexcel.opensource.alibaba.com/)
- [Apache POI 内存模型](https://poi.apache.org/components/spreadsheet/how-to.html)
- [MinIO Java SDK](https://min.io/docs/minio/linux/developers/java/API.html)