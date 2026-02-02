# 部署指南

## 部署到 Vercel

### 1. 环境变量配置

在 Vercel 项目设置中配置以下环境变量：

| 变量名 | 说明 | 必需 | 示例值 |
|--------|------|------|--------|
| `ZHIPU_API_KEY` | 智谱 AI API Key | 是 | `your_api_key_here` |
| `OPENAI_API_KEY` | OpenAI API Key（备用） | 否 | `sk-xxx` |
| `NEXT_PUBLIC_APP_URL` | 应用 URL | 是 | `https://your-app.vercel.app` |
| `ALLOWED_ORIGINS` | 允许的跨域来源 | 否 | `https://your-app.vercel.app` |

### 2. 获取 Zhipu API Key

1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
2. 注册/登录账号
3. 进入「API Keys」页面
4. 创建新的 API Key
5. 复制 API Key 到 Vercel 环境变量

### 3. 部署步骤

#### 通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署
vercel --prod
```

#### 通过 GitHub

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 点击 Deploy

### 4. 验证部署

```bash
# 检查 API 配置
curl https://your-app.vercel.app/api/config

# 测试推荐 API
curl -X POST https://your-app.vercel.app/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"riskTolerance":"moderate","investmentHorizon":"medium","investmentGoal":"steady"}'
```

---

## 部署到自建服务器

### 1. 准备工作

```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2
```

### 2. 构建项目

```bash
# 克隆代码
git clone your-repo-url
cd real-time-fund

# 安装依赖
npm install

# 构建项目
npm run build

# 配置环境变量
cp .env.local.example .env
# 编辑 .env 文件
```

### 3. 使用 PM2 运行

```bash
# 启动应用
pm2 start npm --name "fund-app" -- start

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

### 4. Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL 证书

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

---

## Docker 部署

### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 构建项目
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 运行项目
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ZHIPU_API_KEY=${ZHIPU_API_KEY}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    restart: unless-stopped
```

### 启动

```bash
docker-compose up -d
```

---

## 监控和日志

### Vercel Analytics

```bash
npm install @vercel/analytics
```

### Sentry 错误追踪

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

---

## 成本估算

### Zhipu AI 成本

| 模型 | 输入 | 输出 | 月均 10 万次调用 |
|-----|------|------|-----------------|
| GLM-4.5-Air | ¥0.8/百万 | ¥2/百万 | ¥0.28 |
| GLM-4V-Flash | 免费 | 免费 | ¥0 |
| GLM-4-Plus | ¥5/百万 | ¥5/百万 | ¥1 |
| **总计** | | | **约 ¥1.28/月** |

### Vercel 部署成本

| 方案 | 费用 |
|-----|------|
| Hobby (免费) | $0/月 |
| Pro | $20/月 |

---

## 安全检查清单

- [ ] 配置 CSP (Content Security Policy)
- [ ] 启用速率限制
- [ ] 配置 CORS
- [ ] 设置安全响应头
- [ ] 验证所有用户输入
- [ ] 使用环境变量管理密钥
- [ ] 启用 HTTPS
- [ ] 配置错误监控
- [ ] 定期更新依赖
