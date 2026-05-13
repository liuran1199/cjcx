# 学生成绩自助查询系统 — 设计规格

## 1. 项目概述

- **项目名称**: 学生成绩自助查询系统
- **首个考试**: 特勤招录选拔
- **核心功能**: 学生通过企业微信或 PC 浏览器打开页面，经过 CAS 统一认证后查询考试成绩；支持可选身份证号二次验证
- **目标用户**: 在校学生（查询者）、学工处老师（管理员）

## 2. 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | Vue 3 (Composition API) + Element Plus + Vite | 学生查询页 + 管理员后台，同一应用路由区分 |
| 后端 | Node.js + Express | REST API，JWT 认证 |
| 数据库 | SQLite (better-sqlite3) | 免安装，单文件备份 |
| 认证 | CAS 协议 + JWT | 对接学校统一身份认证 |
| Excel 解析 | exceljs 或 xlsx | 读取 .xlsx 文件 |

## 3. 系统架构

```
┌─────────────────────────────────────────────────┐
│                    访问入口                       │
│  企业微信(H5) ──→ 自动 CAS 认证                  │
│  PC 浏览器   ──→ 跳转 CAS 登录                   │
├─────────────────────────────────────────────────┤
│              Vue 3 SPA (单一应用)                 │
│  /query (学生查询页)    /admin/* (管理后台)        │
├─────────────────────────────────────────────────┤
│           Node.js + Express API                  │
│  CAS 验证 · 成绩查询 · Excel 导入 · 管理接口       │
├─────────────────────────────────────────────────┤
│                SQLite                            │
│  exams · scores · admins · query_logs            │
└─────────────────────────────────────────────────┘
```

## 4. 数据库设计

### 4.1 exams 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增 |
| name | TEXT | 考试名称（如"特勤招录选拔"） |
| id_verify | INTEGER | 0=仅CAS查询, 1=需身份证验证 |
| score_columns | TEXT | 成绩列定义 JSON（如 `["行测成绩","面试成绩","总成绩"]`） |
| created_at | TEXT | 创建时间 |

### 4.2 scores 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增 |
| exam_id | INTEGER FK | 关联考试 |
| student_id | TEXT | 学号（与 CAS 返回的工号匹配） |
| name | TEXT | 姓名 |
| id_card | TEXT | 身份证号（可选，用于二次验证） |
| score_data | TEXT | 成绩 JSON（如 `{"行测成绩":61.4,"面试成绩":78,...}`） |
| created_at | TEXT | 导入时间 |

索引：`(exam_id, student_id)` 联合唯一

### 4.3 admins 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增 |
| employee_id | TEXT | 管理员工号 |
| password | TEXT | bcrypt 哈希（CAS 用户可为空） |
| name | TEXT | 姓名 |
| role | TEXT | "admin" 或 "superadmin" |
| auth_type | TEXT | "local" 或 "cas" |
| created_at | TEXT | 创建时间 |

### 4.4 query_logs 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增 |
| exam_id | INTEGER | 考试 ID |
| student_id | TEXT | 学号 |
| ip | TEXT | 请求 IP |
| result | TEXT | "success" / "not_found" / "id_mismatch" |
| created_at | TEXT | 查询时间 |

## 5. API 设计

### 5.1 CAS 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/auth/cas/config | 获取 CAS 配置（公开） |
| PUT | /api/auth/cas/config | 更新 CAS 配置（admin） |
| GET | /api/auth/cas/login | 生成 CAS 登录跳转 URL |
| GET | /api/auth/cas/callback | CAS ticket 回调，签发 JWT |
| GET | /api/auth/cas/logout | CAS 登出 |
| GET | /api/auth/me | 获取当前用户信息 |

### 5.2 成绩查询（学生端 — 需登录）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/query/exams | 获取可查询的考试列表 |
| GET | /api/query/exams/:id/score | 查询成绩（若开启身份证验证，需传 id_card 参数） |

### 5.3 考试管理（管理员）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/exams | 考试列表 |
| POST | /api/admin/exams | 创建考试 |
| PUT | /api/admin/exams/:id | 编辑考试 |
| DELETE | /api/admin/exams/:id | 删除考试及成绩 |

### 5.4 成绩导入与管理（管理员）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/exams/:id/import | 上传 Excel 导入成绩 |
| GET | /api/admin/exams/:id/preview | 预览 Excel（上传前确认列映射） |
| GET | /api/admin/exams/:id/scores | 成绩列表（搜索、分页） |
| PUT | /api/admin/scores/:id | 编辑单条成绩 |
| DELETE | /api/admin/scores/:id | 删除单条成绩 |

### 5.5 管理员账号管理（超级管理员）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/accounts | 管理员列表 |
| POST | /api/admin/accounts | 添加管理员 |
| DELETE | /api/admin/accounts/:id | 删除管理员 |

### 5.6 查询日志（管理员）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/logs | 查询日志列表（支持按考试筛选，分页） |

## 6. 页面设计

### 6.1 学生查询页
- CAS 回调后进入查询页
- 页面标题显示考试名称
- 若考试开启身份证验证：显示输入框 + 查询按钮；校验失败提示"身份证号不匹配"
- 若考试未开启：直接显示成绩卡片
- 成绩卡片：姓名、学号、身份证号（部分脱敏，如 `3401****1234`）、各科成绩
- 移动端优先布局，适配企业微信 H5
- 无成绩时提示"未找到您的成绩记录"

### 6.2 管理员后台
- 左侧导航栏 + 右侧内容区
- 考试管理页：考试列表表格，新建/编辑弹窗，每次考试显示"导入"和"查看成绩"入口
- 成绩导入页：选择 Excel 文件 → 预览前 5 行 → 系统自动识别列名并建议映射 → 管理员确认 → 执行导入
- 成绩数据页：按考试筛选，支持姓名/学号搜索，表格展示，点击编辑、删除
- CAS 配置页：表单（CAS 地址、启用开关）
- 管理员账号页：账号列表，新增/删除
- 查询日志页：只读表格，按考试筛选，分页

### 6.3 Excel 导入流程
1. 管理员在考试管理页点击"导入成绩"
2. 上传 .xlsx 文件
3. 后端解析表头，返回列名列表
4. 前端展示预览表格（前 5 行），标注每列的识别结果（学号列、姓名列、身份证号列、各成绩列）
5. 管理员确认或调整映射
6. 执行导入，清空旧数据后写入（全量替换）

## 7. 认证与安全

- CAS ticket 验证后签发 JWT，有效期 24 小时
- 身份证号在数据库中可逆加密存储（AES-256）
- 查询日志不记录完整身份证号
- 管理员接口使用 JWT + role 校验
- 后端添加 helmet、rate-limit 中间件
- 身份证号在前端展示时部分脱敏

## 8. 配置项

| 配置 | 说明 | 位置 |
|------|------|------|
| CAS 开关及地址 | CAS 认证服务 URL | 数据库 cas_config |
| 身份证验证 | 每个考试独立配置 | exams.id_verify |
| 管理员账号 | 超级管理员可增删 | admins 表 |
| 首次默认管理员 | 系统初始化时自动创建 | 工号 admin，密码在部署时设置 |

## 9. 验收标准

- [ ] CAS 认证正常（企业微信免登 + PC 跳转登录）
- [ ] 学生可查询已导入考试的成绩
- [ ] 身份证验证开关有效（开启时校验，关闭时跳过）
- [ ] 身份证号校验不匹配时拒绝显示成绩
- [ ] 管理员可创建/编辑/删除考试
- [ ] 管理员可上传 Excel 导入成绩（预览 → 确认 → 导入）
- [ ] 管理员可编辑/删除单条成绩
- [ ] 管理员可搜索成绩
- [ ] 管理员可配置 CAS 参数
- [ ] 管理员可增删管理员账号
- [ ] 查询日志可查
- [ ] 移动端 H5 页面适配
- [ ] PC 端页面正常使用
