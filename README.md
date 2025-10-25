# README

说明：本项目为数据库课程的一个作业，旨在实现一个简易的课程项目提交与答辩管理系统，涵盖学生提交项目、教师评分以及管理员管理等核心流程。

项目名称：课程项目提交与答辩管理系统  
技术栈：Bun + Elysia.js + SQLite + Pure HTML/JS + REST API

## 总体架构

- **后端**：使用 Elysia.js（Bun 原生 Web 框架）构建 REST API。  
- **数据库**：SQLite，本地文件形式，无需额外服务端依赖。  
- **前端**：纯 HTML + 原生 JS，配合 TailwindCSS CDN 进行快速美化。  
- **运行方式**：Bun 启动单一 Elysia 服务器，统一提供 REST API 与静态页面。  
- **登录校验系统**：基于 Session 的角色校验（学生 / 教师 / 管理员），登录成功后写入 HTTP-only Cookie，并在访问受保护页面时验证；若无效则重定向到 `index.html`；前端页面均提供 “退出” 按钮调用 `/api/logout` 清理会话。

## 项目结构

```
project-manager/
├── src/
│   ├── db/
│   │   ├── initDB.ts
│   │   └── schema.sql
│   ├── api/
│   │   ├── student.ts
│   │   ├── teacher.ts
│   │   ├── admin.ts
│   │   └── auth.ts
│   ├── server.ts
│   └── utils/
│       └── dbClient.ts
├── public/
│   ├── index.html
│   ├── student.html
│   ├── teacher.html
│   ├── admin.html
│   └── js/
│       └── main.js
├── package.json
└── README.md
```

## RoadMap

- [x] 建立数据库 `initDB.ts`。  
- [x] 编写后端交互功能。  
- [x] 开发服务器并提供 REST API 接口。  
- [x] 编写前端页面（登录 / 学生 / 教师 / 管理员）。  
- [x] 统一由服务器启动前端页面及 API。  
- [x] 编写 Session 登录校验系统。  
- [x] 使用 TailwindCSS 美化前端页面。

## 接口约定

| 角色 | 功能 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- | --- |
| 所有 | 登录 | POST | /api/login | 返回角色与 ID 并写入 Session Cookie |
| 所有 | 退出登录 | POST | /api/logout | 清除会话并移除 Cookie |
| 学生 | 提交项目 | POST | /api/student/submit | 更新项目信息 |
| 学生 | 查看答辩时间 | GET | /api/defense/slots | 列出时间段 |
| 学生 | 查看已提交项目 | GET | /api/student/project/:id | 根据学生 ID 获取项目详情 |
| 教师 | 查看答辩安排 | GET | /api/teacher/slots/:id | 根据教师 ID 筛选 |
| 教师 | 提交评分 | POST | /api/teacher/score | 提交通过 / 未通过结果 |
| 管理员 | 审批预约 | POST | /api/admin/approve | 修改项目状态 |
| 管理员 | 保存答辩时间 | POST | /api/admin/slot/save | 保存答辩时间并维护教师分配（ID 不存在则新建） |
| 管理员 | 删除答辩时间 | POST | /api/admin/slot/delete | 根据 ID 删除答辩时间（同步清理关联项） |
| 管理员 | 查看答辩安排 | GET | /api/admin/slots | 列出全部答辩安排（含教师 ID 列表） |
| 管理员 | 查看学生提交 | GET | /api/admin/projects | 查看所有项目记录（含学生姓名） |
| 管理员 | 查看用户 | GET | /api/admin/users | 列出全部用户 |
| 管理员 | 保存用户 | POST | /api/admin/users/save | 根据 ID 保存用户（存在则更新） |
| 管理员 | 删除用户 | POST | /api/admin/users/delete | 根据 ID 删除用户 |
| 管理员 | 删除项目 | POST | /api/admin/projects/delete | 根据 ID 删除项目（同时清理打分） |

## 快速开始

1. 安装依赖：`bun install`。  
2. 初始化数据库（可重复执行以升级 schema）：`bun run src/db/initDB.ts`。  
3. 启动开发服务器（同时提供 REST API 与静态页面）：`bun run dev`。

> 默认账号：`student1/stupass`、`teacher1/teapass`、`admin1/admpass`。若修改默认数据，请重新执行 `bun run src/db/initDB.ts`。
