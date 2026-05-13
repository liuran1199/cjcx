# 学生成绩自助查询系统

## 功能

- 学生通过企业微信或 PC 浏览器登录，查询考试成绩
- 支持 CAS 统一身份认证 + 可选身份证号二次验证
- 管理员可管理多场考试，上传 Excel 导入成绩
- 查询日志、管理员账号管理

## 技术栈

Vue 3 + Element Plus + Vite / Node.js + Express + SQLite

## 快速部署

### 1. 环境要求

- Node.js 18+
- npm

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，设置随机密钥
```

### 3. 安装依赖 & 构建

```bash
cd server && npm install
cd ../client && npm install && npm run build
cd ..
```

### 4. 启动服务

```bash
cd server
ENCRYPTION_KEY=<随机密钥> JWT_SECRET=<随机密钥> PORT=3004 node index.js
```

或使用系统服务（推荐）：

```bash
# 使用 pm2
pm2 start server/index.js --name score-query -- --port 3004
```

### 5. 访问

- 学生查询页：`http://localhost:3004/query`
- 管理后台：`http://localhost:3004/admin`
- 默认管理员：`admin` / `admin123`（首次登录后请修改）

## CAS 配置

在管理后台「CAS 配置」中填写：
- CAS 服务地址：学校统一认证服务器 URL
- 应用访问地址：本系统的访问地址（如 `http://score.school.edu.cn`）
- 启用开关

若未启用 CAS，可配置后重启。

## Excel 导入

1. 管理后台 → 考试管理 → 新建考试 → 导入成绩
2. 上传 Excel（第一行为表头），系统自动识别列名
3. 确认学号列、姓名列、身份证号列（可选）、成绩列
4. 确认导入

Excel 格式要求：第一行为表头，需包含学号、姓名列。

## 安全

- 身份证号 AES-256-CBC 加密存储
- 前端展示脱敏（如 `3401****1234`）
- JWT 认证 + CAS ticket 验证
- 环境变量管理密钥（禁止硬编码）

## 目录结构

```
├── server/          # 后端 API
│   ├── index.js     # 入口
│   ├── database.js  # SQLite 初始化
│   ├── middleware/   # JWT 认证中间件
│   ├── routers/     # API 路由
│   └── utils/       # 加密工具
├── client/          # 前端
│   └── src/
│       ├── views/       # 页面
│       │   ├── Login.vue    # CAS 登录
│       │   ├── Query.vue    # 学生查询
│       │   └── admin/       # 管理后台
│       ├── components/  # 组件
│       ├── router.js    # 路由
│       └── api.js       # API 封装
└── docs/            # 文档
    └── superpowers/
        ├── specs/   # 设计规格
        └── plans/   # 实施计划
```
