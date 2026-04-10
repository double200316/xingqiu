# 想法星球 · 创意星球

> 中国版 Product Hunt — AI 时代的好想法发现社区

[![Website](https://img.shields.io/badge/website-创启星球.com-0ea5e9)](https://创启星球.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 简介

<!-- html:translate=no -->
想法星球是一个面向创业者和产品爱好者的想法分享平台，类似中国版的 Product Hunt。用户可以发布、发现、投票和讨论各种创新想法。

## 功能特色

<!-- html:translate=no -->
- **想法发布** - 支持图标、标题、tagline、分类、状态（💡想法 / 🔨开发中 / ✅已上线）
- **投票系统** - 每日投票、防重复、排行榜（今日榜 / 本周榜 / 最新）
- **用户系统** - 注册、登录、JWT 鉴权、头像
- **评论系统** - 对想法进行评论和讨论
- **讨论区** - 开放话题讨论
- **图片上传** - 支持想法图标上传
- **深色星际主题** - Canvas 星空粒子动效、毛玻璃卡片

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生 HTML/CSS/JS（单文件 SPA） |
| 后端 | Node.js + Fastify |
| 数据库 | SQLite3 |
| 部署 | Nginx + HTTPS + PM2 |

## 项目结构

```
xingqiu-open/
├── client/                 # 前端
│   └── index.html          # 单页应用（含所有 HTML/CSS/JS）
├── server/                 # 后端
│   ├── server.js           # API 服务
│   ├── package.json        # 依赖配置
│   └── ecosystem.config.js # PM2 部署配置
├── LICENSE
└── README.md
```

## API 接口

<!-- html:translate=no -->
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | 用户注册 |
| POST | `/api/login` | 用户登录 |
| GET | `/api/ideas` | 获取想法列表 |
| POST | `/api/ideas` | 发布想法 |
| POST | `/api/ideas/:id/vote` | 投票 |
| GET | `/api/ideas/:id/comments` | 获取评论 |
| POST | `/api/ideas/:id/comments` | 发表评论 |
| POST | `/api/upload` | 上传图片 |

## 快速开始

### 后端

```bash
cd server
npm install
cp .env.example .env  # 配置 JWT_SECRET
node server.js        # 默认端口 3000
```

### 前端

直接用 Nginx 托管 `client/index.html` 即可。API 地址在 HTML 中配置。

### 生产部署

```bash
cd server
npm install --production
pm2 start ecosystem.config.js
```

## 在线体验

**http://159.75.11.160/**

## 截图

<!-- html:translate=no -->
> 深色星际主题设计，星空粒子背景，毛玻璃卡片效果

## 贡献

<!-- html:translate=no -->
欢迎提交 Issue 和 Pull Request！

## License

<!-- html:translate=no -->
[MIT](LICENSE)
