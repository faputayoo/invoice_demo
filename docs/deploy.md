# 上线方式

## 1. Vercel + Supabase

适合：

- 你想最快把站点发出去
- 当前主要是拿来演示和收反馈
- 每批文件不大，OCR 压力不高

建议配置：

- `INVOICE_STORAGE_DRIVER=supabase`
- 配好 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
- 建议开启 `INVOICE_UPLOAD_ACCESS_KEY`

优点：

- 部署速度最快
- 域名、HTTPS、回滚都省心
- 前端体验最好

限制：

- 更适合小批量演示
- 服务器运行时和上传体积限制比较明显
- OCR 算力成本不适合长时间裸奔

## 2. Railway / Render / Fly.io + Docker + 持久卷

适合：

- 你想保留现有后端结构，不想先拆成直传架构
- 你希望上传和 OCR 都在一台长期运行的 Node 服务里完成

建议配置：

- 用仓库自带 `Dockerfile`
- 如果不接 Supabase，至少挂一个持久卷
- `INVOICE_STORAGE_DRIVER=local`
- `INVOICE_LOCAL_DATA_ROOT=/data`

优点：

- 对当前这版最友好
- 文件上传、OCR、导出链路都更稳定
- 不需要先重写成 serverless 直传

限制：

- 费用通常比纯静态托管更高
- 冷启动、磁盘和 CPU 配额要看套餐

## 3. VPS + Docker + Nginx

适合：

- 你想把长期成本压低
- 你能接受自己维护服务器
- 你之后可能要加登录、队列、异步任务

建议配置：

- 用 Docker 部署这个 Next.js 服务
- 用 Nginx 反代
- 本地磁盘模式先跑起来，后面再切 Supabase 或对象存储

优点：

- 最可控
- 成本通常最低
- 后续扩展空间最大

限制：

- 需要自己处理日志、备份、更新和安全

## 我更建议你怎么上

如果你的目标是先拿真实用户反馈：

1. 优先上 `Railway/Render/Fly.io + Docker + 持久卷`
2. 同时开启 `INVOICE_UPLOAD_ACCESS_KEY`
3. 等有真实使用量后，再决定要不要切 `Supabase + 对象存储 + 异步队列`

如果你的目标只是先公开给别人看：

1. 用 `Vercel + Supabase`
2. 控制批量大小和文件大小
3. 把真实上传先用口令挡住