# 中文电子发票批量整理

把一批中文电子发票 PDF 自动整理成 Excel，这一版已经可以作为最小可上线版本继续往外发。

当前流程：

- 批量上传 PDF
- 服务端按规则提取核心字段
- 文本层不足时自动 OCR fallback
- 自动标记疑似重复票
- 结果页预览汇总与失败文件
- 导出标准 Excel 台账
- 保存历史记录，支持重新打开和下载

## 当前支持

- 数电票 PDF
- 普通电子发票 PDF
- 可复制文本的标准电子发票 PDF
- 图片版 PDF 的 OCR fallback
- 单批最多 50 张

## 当前不支持

- JPG / PNG 直接上传
- 任意手机拍照票据
- 任意手写票据
- 增值税专票的复杂抵扣流程
- 国外 invoice 或任意自定义模板

## 本地运行

先安装依赖：

```bash
npm install
```

再启动开发环境：

```bash
npm run dev
```

打开 http://localhost:3000 即可使用。

## 生产可用改造

这一版已经补上了几个真正影响上线的问题：

- 存储支持双模式：本地磁盘 或 Supabase
- OCR 缓存目录可自动适配线上环境
- 历史页和结果页改为动态读取，不会被静态缓存住
- 可选上传口令，便于先做公开演示、受控上传
- 提供 Dockerfile、环境变量样例、Supabase 初始化脚本和健康检查接口

健康检查接口：

- GET /api/health

## 存储模式

### 方式 1：本地磁盘

适合：

- 自己的 VPS
- Railway / Render / Fly.io 这类支持持久卷的 Node 容器
- 内网部署

关键环境变量：

- `INVOICE_STORAGE_DRIVER=local`
- `INVOICE_LOCAL_DATA_ROOT=/data/invoice-demo` 或其它持久目录

### 方式 2：Supabase

适合：

- Vercel 这类无持久磁盘的平台
- 前端托管和数据托管分离

关键环境变量：

- `INVOICE_STORAGE_DRIVER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JOBS_TABLE=invoice_jobs`
- `SUPABASE_FILES_BUCKET=invoice-source-files`

初始化 SQL 见 `supabase/schema.sql`。

## 环境变量

可参考 `.env.example`。

常用变量：

- `INVOICE_STORAGE_DRIVER`：`local` 或 `supabase`
- `INVOICE_LOCAL_DATA_ROOT`：本地磁盘模式的数据根目录
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`：Google Analytics 4 的站点 ID，填了就会自动统计访问量和上传事件
- `INVOICE_UPLOAD_ACCESS_KEY`：开启后，真实上传和失败重试都需要口令
- `INVOICE_OCR_LANGS`：自定义 OCR 语言，默认先尝试 `eng`，再尝试 `chi_sim+eng`
- `INVOICE_OCR_CACHE_PATH`：自定义 OCR 语言包缓存目录
- `SUPABASE_URL`：Supabase 项目地址
- `SUPABASE_SERVICE_ROLE_KEY`：服务端密钥，只能放在服务端环境变量
- `SUPABASE_JOBS_TABLE`：作业表名，默认 `invoice_jobs`
- `SUPABASE_FILES_BUCKET`：源文件 bucket，默认 `invoice-source-files`

## Docker 部署

这个仓库已经带了 `Dockerfile` 和 `.dockerignore`。

构建镜像：

```bash
docker build -t invoice-demo .
```

启动容器：

```bash
docker run --rm -p 3000:3000 \
  -e INVOICE_STORAGE_DRIVER=local \
  -e INVOICE_LOCAL_DATA_ROOT=/data \
  -v $(pwd)/data:/data \
  invoice-demo
```

## 部署方式建议

详细说明见 `docs/deploy.md`。

简版建议：

1. `Vercel + Supabase`：前端上线最快，但更适合小批量演示。
2. `Railway/Render/Fly + Docker + 持久卷`：最适合当前这版 OCR + 批量上传 MVP。
3. `VPS + Docker + Nginx`：长期成本最低，但需要自己处理运维。

## 访问分析

当前仓库已经内置了 Google Analytics 4 接入位，这是现在成本最低的方案之一：

- Google Analytics 4 本身免费
- 不增加 Railway 的额外服务费用
- 默认会统计页面访问
- 上传流程会额外记录 3 个事件：`invoice_upload_started`、`invoice_upload_succeeded`、`invoice_upload_failed`

启用方式：

1. 去 Google Analytics 创建一个 Web Data Stream
2. 拿到 Measurement ID，格式通常是 `G-XXXXXXXXXX`
3. 在 Railway 或本地环境变量中配置 `NEXT_PUBLIC_GA_MEASUREMENT_ID`
4. 重新部署

如果这个变量为空，分析脚本不会加载。
