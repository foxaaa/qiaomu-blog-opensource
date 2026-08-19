# Cloudflare 部署指南

项目使用 `Next.js + OpenNext + Cloudflare Workers + D1 + R2`。推荐把仓库上传到 GitHub，由 GitHub Actions 在 Linux 环境自动构建并发布；Windows 本机只负责开发、资源初始化和查看日志。

## 一、创建 Cloudflare 资源

安装依赖并登录：

```powershell
npm ci
npx wrangler login
```

创建 D1 数据库和 R2 Bucket：

```powershell
npx wrangler d1 create qiaomu-blog-db
npx wrangler r2 bucket create qiaomu-blog-images
```

保存 D1 命令返回的 `database_id`。查看账户 ID：

```powershell
npx wrangler whoami
```

## 二、配置 GitHub

打开 GitHub 仓库的 `Settings > Secrets and variables > Actions`。

### Repository Secrets

| 名称 | 说明 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | 具备 Workers、D1、R2 编辑权限的 API Token |
| `ADMIN_PASSWORD` | 博客后台登录密码 |
| `ADMIN_TOKEN_SALT` | 管理员 Token 签名盐，使用随机长字符串 |
| `AI_CONFIG_ENCRYPTION_SECRET` | AI 配置加密密钥，使用随机长字符串 |
| `AI_API_KEY` | 可选，默认外部 AI 服务的 API Key |

### Repository Variables

| 名称 | 示例 |
| --- | --- |
| `CF_D1_DATABASE_ID` | 创建 D1 后返回的 UUID |
| `CF_D1_DATABASE_NAME` | `qiaomu-blog-db` |
| `CF_R2_BUCKET_NAME` | `qiaomu-blog-images` |
| `CF_WORKER_NAME` | `qiaomu-blog-opensource` |
| `NEXT_PUBLIC_SITE_URL` | `https://blog.example.com` |

`CF_D1_DATABASE_ID`、`CF_R2_BUCKET_NAME` 和 `NEXT_PUBLIC_SITE_URL` 未配置时，自动部署任务会跳过，避免开源仓库被 Fork 后立刻报错。

## 三、推送并自动部署

提交代码并推送到 `main`：

```powershell
git add .
git commit -m "fix: restore Cloudflare deployment"
git push origin main
```

GitHub Actions 会自动：

1. 在 Ubuntu 上安装锁定依赖。
2. 生成仅存在于 CI Runner 的 Wrangler 配置。
3. 初始化本地 D1 并构建 OpenNext Worker。
4. 运行测试。
5. 幂等更新远程 D1 schema 和模板默认数据。
6. 部署 Worker，并同步应用 Secrets。

在 GitHub 仓库的 `Actions > Deploy to Cloudflare` 查看进度，也可以使用 `Run workflow` 手动重新部署。

## 四、自定义域名

首次部署完成后，在 Cloudflare Dashboard 中打开：

`Workers & Pages > 你的 Worker > Settings > Domains & Routes`

绑定 `NEXT_PUBLIC_SITE_URL` 对应的域名。DNS 必须由同一个 Cloudflare 账户管理。

## 本地开发

初始化本地 D1 模拟数据库：

```powershell
npm run cf:db:local
npm run dev
```

本地开发默认使用 Wrangler 的 D1/R2 模拟环境，不会修改远程生产数据。

## 手动部署

先使用 `npm run cf:init` 生成不入库的 `wrangler.local.toml`，然后部署：

```bash
npm run cf:init -- --site-url=https://blog.example.com
npm run deploy
```

`cf:init` 是 Bash 脚本。Windows 请在 Git Bash 或 WSL 中执行。OpenNext 会警告 Windows 原生生产构建可能不完整，因此正式发布应优先使用 GitHub Actions。

## 排错

### Worker 超过免费包体限制

```powershell
npm run cf:dry-run
```

Windows 生成的 OpenNext 包体不能作为最终判断依据，请以 GitHub Actions 的 Linux 日志为准。

### `no such table`

本地执行：

```powershell
npm run cf:db:local
```

远程手动执行：

```powershell
$env:WRANGLER_CONFIG = "wrangler.local.toml"
npm run cf:db:remote
```

### GitHub Actions 被跳过

确认 Repository Variables 中已经配置：

- `CF_D1_DATABASE_ID`
- `CF_R2_BUCKET_NAME`
- `NEXT_PUBLIC_SITE_URL`
