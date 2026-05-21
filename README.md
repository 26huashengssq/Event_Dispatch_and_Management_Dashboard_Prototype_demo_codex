# Event_Dispatch_and_Management_Dashboard_Prototype_demo_codex
# 事件调度与管理看板 — 集成原型 v1.1.0

> 为大型环卫集团设计的"事件调度与管理看板"MVP 交互原型，集成片区总览、事件流转与 AI 辅助三大功能模块。

---

## 项目概述

环卫调度的核心痛点在于多片区、多事件、多角色同时运转时，管理者很难快速形成统一判断。本原型围绕"宏观态势不清"和"微观流转不明"两个问题，构建了一个集**高管层全局态势感知**与**调度/片区主管事件追踪**于一体的交互看板。

---

## 三大功能模块

| 模块 | 标签 | 核心能力 |
|---|---|---|
| 📊 片区总览 | Dashboard Overview | KPI 摘要栏、4 个可交互片区卡片、点击筛选事件列表、返回总览 |
| 🔄 事件流转 | Event Flow | 5 阶段流转节点可视化、事件详情面板、迷你流转条、操作反馈（确认推进/改派/升级） |
| 🤖 AI 辅助 | AI Assist | 风险态势四象限、详细建议卡片（含置信度进度条）、采纳/调整/暂存操作 |

### 交互闭环

```
片区总览 → 发现异常片区 → 查看事件列表 → 点击事件详情
    → 查看 AI 建议 → 确认或调整操作 → 回到总览观察变化
```

---

## 项目结构

```
├── index.html                     # 入口页面 — Tab 导航 + 模块容器
├── server.js                      # 静态文件服务器（默认端口 4000）
├── assets/
│   ├── css/
│   │   └── styles.css             # 全套样式（KPI栏、流转节点、AI卡片等）
│   └── js/
│       ├── app.js                 # 主控制器（Tab 路由 + 模块调度）
│       ├── api.js                 # API 服务层（统一请求 /api/*）
│       └── modules/
│           ├── dashboard.js       # 📊 片区总览模块
│           ├── eventflow.js       # 🔄 事件流转模块
│           └── aiassist.js        # 🤖 AI 辅助模块
├── api/                            # 由 data/*.csv 生成的静态 JSON 接口数据
├── data/                           # CSV 源数据
├── docs/
│   ├── 需求理解说明.md             # 一页纸需求分析与设计理念
│   ├── 页面功能结构图.md           # 页面链路与角色视角对应关系
│   ├── 讲解提纲.md                 # 5-10 分钟讲解说明
│   └── v1.1.0更新规划.md           # v1.1.0 基础修复与补齐规划
└── scripts/
    ├── sync-api-from-csv.ps1       # CSV → API JSON 同步脚本
    └── verify-prototype-base.ps1   # 原型完整性验证脚本
```

---

## 快速启动

### 前置条件

- Node.js ≥ 18

### 启动服务

```bash
# 默认端口 4000（避开 3000 端口冲突）
node server.js

# 或自定义端口
set PORT=8081 && node server.js
```

浏览器访问 `http://localhost:4000` 即可查看原型。

---

## 模拟数据

原型使用模拟数据表达片区、事件、人员和 AI 建议，不接入真实生产接口。`data/*.csv` 是源数据，`api/*.json` 由脚本生成并供前端读取：

- **4 个片区**：东区（异常）、南区（预警）、核心商圈（处理中）、西区（正常）
- **8 个事件**：覆盖 P0/P1/P2 优先级，贯穿待派单→协调中→处理中→待复核→已关闭 全生命周期
- **4 条 AI 建议**：包含风险等级、置信度、判断原因、推荐动作和资源匹配

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-api-from-csv.ps1
powershell -ExecutionPolicy Bypass -File scripts/sync-api-from-csv.ps1 -Check
```

---

## 技术栈

| 层面 | 技术 |
|---|---|
| 页面结构 | HTML5 语义标签 |
| 样式 | CSS3（CSS 变量 + Grid 布局 + 响应式） |
| 交互逻辑 | Vanilla JavaScript（ES Module） |
| 服务 | Node.js `http` 模块 |
| 版本管理 | Git + GitHub |

---

## 版本历史

| 版本 | 日期 | 内容 |
|---|---|---|
| v1.0.0 | 2026-05-20 | 首发版本：Tab 导航 + 三大功能模块集成 + 静态服务器 |
| v1.0.1 | 2026-05-21 | 静态数据改为 `/api/*.json` 外部数据接口，并补充 CSV 备用数据 |
| v1.1.0 | 2026-05-21 | 基础修复与补齐：CSV 生成 API JSON、KPI 双指标、事件状态标注、事件详情 AI 入口、验证脚本、测试、讲解文档、JSON 无 BOM |

---

## 设计边界

- 聚焦 MVP 原型，不追求完整业务系统
- 使用模拟数据，不接入真实生产接口
- AI 仅展示辅助判断方式，不设计真实模型训练
- 覆盖"总览 → 下钻 → 决策 → 反馈"主路径
