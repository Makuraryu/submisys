# README

项目名称： 课程项目提交与答辩管理系统  
技术栈： Bun + Elysia.js + SQLite + Pure HTML/JS + REST API

## 总体架构

该系统采用前后端分离的轻量架构：
	•	后端： 使用 Elysia.js（Bun 原生 Web 框架）构建 REST API
	•	数据库： SQLite，本地文件形式，无需服务端依赖
	•	前端： 纯 HTML + 原生 JS，无任何框架或样式库
	•	运行方式： Bun 启动单一 Elysia 服务器，负责同时：
		1.	提供 REST API（如 /api/student/submit）
		2.	提供静态页面（如 /student.html）
	•	登录校验系统： 基于角色的简单登录验证（学生/教师/管理员）
		1.	用户登录成功后，服务器生成一个 Session ID（或 JWT）；
		2.	服务器将其写入一个 HTTP-only Cookie；
		3.	每次访问 /student.html、/teacher.html、/admin.html 时，服务器端判断该 Cookie 是否有效；
		4.	无效则重定向到 /index.html。

## 项目结构设计

project-manager/
├── src/
│   ├── db/
│   │   ├── initDB.ts          # 建立数据库与表结构
│   │   └── schema.sql         # SQL 初始化脚本（可选）
│   ├── api/
│   │   ├── student.ts         # 学生相关API
│   │   ├── teacher.ts         # 教师相关API
│   │   ├── admin.ts           # 管理员API
│   │   └── auth.ts            # 登录验证API
│   ├── server.ts              # 启动Elysia服务器
│   └── utils/
│       └── dbClient.ts        # SQLite数据库连接封装
├── public/
│   ├── index.html             # 登录页
│   ├── student.html           # 学生端界面
│   ├── teacher.html           # 教师端界面
│   ├── admin.html             # 管理端界面
│   └── js/
│       └── main.js            # 各角色前端逻辑
├── package.json
└── README.md

## RoadMap
[x] 建立数据库initDB.ts
[x] 编写后端交互功能
[x] 开发服务器和提供的API接口
[x] 编写前端页面，包括登录页面、学生页面、教师页面、管理员页面，纯HTML+JS，无样式（暂时）
[x] 用服务器启动前端页面，提供路由
[ ] 编写登录校验系统

## 接口约定

角色	功能	方法	路径	说明
所有	登录	POST	/api/login	返回角色与ID
学生	提交项目	POST	/api/student/submit	更新项目信息
学生	查看答辩时间	GET	/api/defense/slots	列出时间段
学生	查看已提交项目	GET	/api/student/project/:id	根据学生ID获取项目详情
教师	查看自己负责答辩	GET	/api/teacher/slots/:id	教师ID筛选
教师	提交评分	POST	/api/teacher/score	通过/不通过
管理员	审批预约	POST	/api/admin/approve	修改状态
管理员	新建答辩时间	POST	/api/admin/slot/new	新增时间段
管理员	查看答辩时间	GET	/api/admin/slots	列出全部答辩安排
管理员	查看学生提交	GET	/api/admin/projects	查看所有项目记录


## 快速开始
1. 安装依赖  
   `bun install`
2. 初始化数据库（可重复执行以升级 schema）  
   `bun run src/db/initDB.ts`
3. 启动开发服务器（同时提供 REST API 与静态页面）  
   `bun run dev`

> 默认账号：`stu/stupass`、`tea/teapass`、`adm/admpass`（修改后请重新运行 `bun run src/db/initDB.ts` 以刷新种子数据）
