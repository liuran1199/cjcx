# 学生成绩自助查询系统

基于 CAS 统一身份认证的成绩查询平台，学生一键登录查分，管理员多考试管理、Excel 批量导入。

## 应用场景

- **学生自助查分** — 从企业微信或 PC 浏览器打开页面，自动 CAS 认证，查看各科成绩
- **多考试管理** — 支持多场考试独立管理（期中、期末、模拟考、招录选拔等），可随时上架/下架
- **Excel 批量导入** — 管理员上传 Excel，系统自动识别列名，预览确认后一键导入
- **身份证二次验证** — 可选开启，学生查分时需输入身份证号校验，防止他人冒查
- **查询审计** — 完整记录每次查询日志（考试、学号、IP、结果），可追溯

## 主要功能

### 学生端
| 功能 | 说明 |
|------|------|
| CAS 自动登录 | 打开页面自动跳转统一认证，无需手动输入账号密码 |
| 考试列表 | 展示所有已上架的考试 |
| 成绩查询 | 选择考试后展示各科成绩，含姓名、学号、身份证号（脱敏） |
| 身份证验证 | 考试开启验证时需输入身份证号确认身份 |

### 管理后台
| 功能 | 说明 |
|------|------|
| 考试管理 | 新建/编辑/删除考试，自定义成绩列，开启/关闭开关 |
| Excel 导入 | 上传 Excel 预览数据，智能匹配列名，支持导出模版 |
| 成绩管理 | 按考试查询、编辑、删除单条成绩 |
| CAS 配置 | 配置统一认证服务器地址、回调地址、启用开关 |
| 账号管理 | 创建/删除本地管理员账号 |
| 查询日志 | 查看所有学生查询记录，包含时间、IP、结果 |

## 技术框架

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 + Element Plus + Vite | SPA 单页应用，响应式布局 |
| 后端 | Node.js + Express | RESTful API，中间件架构 |
| 数据库 | SQLite (better-sqlite3) | 零配置，单文件，WAL 模式 |
| 认证 | JWT + CAS 协议 | HttpOnly Cookie，ticket 校验 |
| 加密 | AES-256-GCM | 身份证号加密存储，前端脱敏展示 |
| 部署 | Nginx 反向代理 + systemd | 80/443 端口，开机自启 |

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，设置 JWT 密钥和加密密钥：

```ini
PORT=3004
JWT_SECRET=<随机生成 64 位 hex>
ENCRYPTION_KEY=<随机生成 64 位 hex>
```

### 2. 安装依赖 & 构建

```bash
cd server && npm install
cd ../client && npm install && npm run build
```

### 3. 启动

```bash
cd server
node index.js
```

首次启动自动创建数据库，生成管理员随机密码并打印到控制台。

### 4. 生产部署

推荐使用 Nginx + systemd，参考以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.edu.cn;

    root /path/to/client/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```ini
# /etc/systemd/system/cjcx-api.service
[Unit]
Description=CJCX Score Query API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/server
EnvironmentFile=/path/to/server/.env
ExecStart=/usr/bin/node /path/to/server/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now cjcx-api
```

### 5. 访问

- 学生查询：`http://your-domain.edu.cn`
- 管理后台：`http://your-domain.edu.cn/admin`

## CAS 配置

1. 用管理员账号登录后台
2. 进入「CAS 配置」页面
3. 填写：
   - **CAS 服务地址**：`https://sso.your-school.edu.cn/tpass`
   - **应用访问地址**：本系统 URL（如 `http://score.school.edu.cn`）
4. 启用 CAS 开关

未启用 CAS 时，学生端显示本地登录表单。

## Excel 导入流程

1. 管理后台 → 考试管理 → 新建考试（设置名称、成绩列、是否开启身份证验证）
2. 进入考试 → 导入成绩 → **下载导入模版**（自动生成正确表头）
3. 按模版填写成绩 → 上传 → 系统自动匹配列名
4. 确认映射关系 → 预览数据 → 确认导入

## 安全特性

- 身份证号 **AES-256-GCM** 加密存储，前端展示脱敏（`3401****1234`）
- JWT 存储在 **HttpOnly Cookie**，防止 XSS 窃取
- **CSP 策略** 限制资源加载来源
- 登录接口 **独立限流**（5次/分钟/IP）
- **CORS 白名单** 限定允许的域名
- 所有 SQL 使用**参数化查询**，杜绝注入
- 密钥由环境变量管理，无硬编码

## 目录结构

```
├── server/              # 后端
│   ├── index.js         # Express 入口
│   ├── database.js      # 数据库初始化与迁移
│   ├── middleware/
│   │   └── auth.js      # JWT 认证 + 角色校验中间件
│   ├── routers/
│   │   ├── auth.js      # CAS 登录 / 本地登录 / 用户信息
│   │   ├── query.js     # 学生查询接口
│   │   └── admin.js     # 管理后台全部接口
│   └── utils/
│       └── crypto.js    # AES 加密 / 解密 / 脱敏
├── client/              # 前端
│   └── src/
│       ├── views/
│       │   ├── Login.vue              # 登录页（CAS + 本地双模）
│       │   ├── Query.vue              # 学生查分页
│       │   └── admin/
│       │       ├── Layout.vue         # 后台布局（侧边栏导航）
│       │       ├── Exams.vue          # 考试管理（增删改 + 开关）
│       │       ├── Import.vue         # Excel 导入（预览 + 列映射）
│       │       ├── Scores.vue         # 成绩管理（搜索 + 编辑）
│       │       ├── CasConfig.vue      # CAS 配置
│       │       ├── Accounts.vue       # 管理员账号管理
│       │       └── Logs.vue           # 查询日志
│       ├── components/
│       │   └── ScoreCard.vue          # 成绩卡片组件
│       ├── router.js                  # 路由 + 权限守卫
│       └── api.js                     # Axios 封装 + 拦截器
├── .env.example          # 环境变量模版
└── docs/                 # 设计文档
```

## GitHub 仓库

https://github.com/liuran1199/cjcx

## License

MIT
