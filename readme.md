# 事件调度与管理看板 — 集成原型

> 为大型环卫集团设计的"事件调度与管理看板"交互原型，集成**片区总览**、**事件流转**与 **AI 辅助判断**三大功能模块。当前版本 **v1.2.0**。

---

## 项目概述

环卫调度的核心痛点在于多片区、多事件、多角色同时运转时，管理者很难快速形成统一判断。本原型围绕"宏观态势不清"和"微观流转不明"两个问题，构建了一个集**高管理层全局态势感知**与**调度/片区主管事件追踪**于一体的交互看板。

---

## 三大功能模块

| 模块 | 标签 | 核心能力 |
|---|---|---|
| 📊 **片区总览** | Dashboard Overview | KPI 摘要栏、4 个可交互片区卡片（异常/预警/处理中/正常）、点击筛选事件列表、返回总览 |
| 🔧 **事件流转** | Event Flow | 5 阶段流转节点可视化、事件详情面板、迷你流转条、操作反馈（确认推进/改派/升级）|
| 🤖 **AI 辅助** | AI Assist | 风险态势四象限、外部 API 生成建议、详细建议卡片（含置信度进度条）、采纳/调整/暂存操作、fallback 降级 |

### 交互闭环

```
片区总览 → 发现异常片区 → 查看事件列表 → 点击事件详情
     → 查看 AI 建议 → 确认或调整操作 → 回到总览观察变化
```

---

## 项目结构

```
├── index.html                     # 入口页面 — Tab 导航 + 模块容器
├── server.js                      # 静态文件服务器 + AI 生成接口（默认端口 4000）
├── assets/
│   ├── css/
│   │   └── styles.css             # 全套样式（CSS 变量、KPI栏、流转节点、AI卡片、响应式）
│   └── js/
│       ├── app.js                 # 主控制器（Tab 路由 + 模块调度）
│       ├── api.js                 # API 服务层（统一请求 /api/* + AI 生成）
│       └── modules/
│           ├── dashboard.js       # 片区总览模块
│           ├── eventflow.js       # 事件流转模块
│           └── aiassist.js        # AI 辅助模块
├── api/                            # 静态 JSON 接口数据（由 data/*.csv 生成）
├── docs/
│   ├── 需求理解说明.md
│   ├── 页面功能结构图.md
│   ├── 讲解提纲.md
│   ├── 版本迭代事项.md
│   ├── v1.1.0更新规划.md
│   ├── v1.2.0更新规划.md
│   └── API_KEY配置说明.md
├── data/                           # CSV 源数据
├── scripts/
│   ├── sync-api-from-csv.ps1       # CSV → API JSON 同步脚本
│   └── verify-prototype-base.ps1   # 原型完整性验证脚本
├── tests/
│   └── test_prototype_integrity.py # 原型完整性测试
├── requirement.md                   # 题目需求文档
├── .gitignore
└── README.md
```

---

## 快速启动

### 前置条件

- Node.js ≥ 18（当前测试环境 v26.1.0）

### 启动服务

```bash
# 默认端口 4000
node server.js

# 或自定义端口
$env:PORT="8081"; node server.js
```

浏览器访问 `http://localhost:4000` 即可查看原型。

### AI API Key 配置

v1.2.0 新增 `POST /api/ai/generate`，可调用外部 OpenAI 兼容接口实时生成调度建议。配置方式：

```powershell
# 临时配置（推荐，当前窗口有效）
$env:OPENAI_API_KEY="sk-your-api-key"
$env:AI_MODEL="gpt-4o-mini"           # 可选
$env:OPENAI_BASE_URL="https://api.openai.com/v1/chat/completions"  # 可选
node server.js

# 或永久配置
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-your-key", "User")
```

详细说明见 `docs/API_KEY配置说明.md`。未配置 Key 时，系统自动降级为本地 fallback 建议，保证演示可继续。

### 数据生成

```powershell
# 从 CSV 重新生成 API JSON 数据
powershell -ExecutionPolicy Bypass -File scripts/sync-api-from-csv.ps1

# 仅检查（不写入）
powershell -ExecutionPolicy Bypass -File scripts/sync-api-from-csv.ps1 -Check
```

### 运行测试

```powershell
# 验证脚本
powershell -ExecutionPolicy Bypass -File scripts/verify-prototype-base.ps1

# Python 测试
python -B -m unittest discover -s tests
```

---

## API 接口

| 端点 | 方法 | 说明 | 返回数据 |
|---|---|---|---|
| `/` | GET | 首页 HTML | `index.html` |
| `/api/districts` | GET | 片区列表 | 4 个片区（东/南/核心商圈/西）含状态、负载、资源 |
| `/api/events` | GET | 事件列表 | 8 个事件，含优先级、状态、责任人、下一步 |
| `/api/flowStages` | GET | 流转阶段定义 | 5 个阶段（待派单→已关闭）|
| `/api/aiSuggestions` | GET | 静态 AI 建议 | 4 条建议，含风险等级、置信度、资源提示 |
| `/api/kpi` | GET | KPI 汇总 | `{total, pending, urgent, overdue, abnormalDistricts}` |
| `/api/ai/generate` | POST | AI 实时生成 | 请求 `{"eventId":"..."}`，返回结构化建议 JSON |

---

## 模拟数据概况

| 数据集 | 记录数 | 明细 |
|---|---|---|
| 片区 | 4 | 东区(异常) / 南区(预警) / 核心商圈(处理中) / 西区(正常) |
| 事件 | 8 | 待派单 2 / 协调中 2 / 处理中 2 / 待复核 1 / 已关闭 1 |
| 优先级分布 | — | P0: 2 / P1: 3 / P2: 3 |
| AI 建议 | 4 | 高风险 2 条(87%, 92%) / 中风险 2 条(72%, 78%) |
| 流转阶段 | 5 | 待派单 → 协调中 → 处理中 → 待复核 → 已关闭 |

---

## 版本历史

### v1.2.0 (2026-05-21) — AI 外部 API 接入

**需求对照**：补齐需求第四条——"需要接入外部 API，针对片区-事件，需要有提示词"。

| 编号 | 事项 | 类型 |
|---|---|---|
| 5.2.1 | 设计 AI 提示词模板（片区状态 + 事件详情 + 可用资源 → 风险/动作/原因/资源）| 新增 |
| 5.2.2 | 复用 feature-ai-assist 的 API 接入骨架（API_CONFIG、fetchAiSuggestion、buildPrompt）| 集成 |
| 5.2.3 | 新增 `POST /api/ai/generate` 后端接口（调用外部 AI API，返回结构化建议 JSON）| 新增 |
| 5.2.4 | 前端 aiassist.js 增加"生成建议"按钮，调用新接口，静态数据作 fallback | 改造 |
| 5.2.5 | 环境变量配置（OPENAI_API_KEY / AI_MODEL / OPENAI_BASE_URL）| 新增 |
| — | 新增 `docs/API_KEY配置说明.md` 文档 | 补齐 |
| — | 无 Key 时自动降级为本地 fallback 建议，返回 `source: "fallback"` | 新增 |
| — | 缺少 eventId 时返回 400，外部接口失败时自动降级不白屏 | 新增 |

**核心接口**：
```
POST /api/ai/generate
请求体: { "eventId": "EVT-20260520-001" }
成功响应: { ..., source: "api" }
降级响应: { ..., source: "fallback", fallbackReason: "..." }
```

### v1.1.0 (2026-05-21) — 基础修复与补齐

以 CSV 为数据源、KPI 语义修正为核心的基础版本。

| 编号 | 事项 | 类型 |
|---|---|---|
| 5.1.1 | 修正 KPI 语义，拆分为 `urgent`（P0 未关闭）与 `overdue`（实际超时）| 修复 |
| 5.1.2 | CSV 接入转换：`data/*.csv` 生成 `api/*.json`，删除未使用 `data.js` | 重构 |
| 5.1.3 | 合入讲解说明文档：`docs/讲解提纲.md` | 补齐 |
| 5.1.4 | 重写验证脚本：适配 Tab + JS 模块架构与 API 数据 | 修复 |
| 5.1.5 | 迁移 worktree 测试意图到 `tests/` 目录 | 补齐 |
| 5.1.6 | 修复 BOM 编码：`api/*.json` 输出为 UTF-8 without BOM | 修复 |
| 5.1.7 | 事件详情流程栏标注当前事件状态 | 修复 |
| 5.1.8 | 事件详情增加对应事件 AI 辅助跳转入口 | 补齐 |
| — | 重写 README，覆盖项目概述、模块说明、快速启动和版本历史 | 补齐 |

### v1.0.1 (2026-05-21) — 数据接口化

| 事项 | 类型 |
|---|---|
| 静态数据改为 `/api/*.json` 外部数据接口 | 重构 |
| 补充 CSV 备用数据文件 | 补齐 |

### v1.0.0 (2026-05-20) — 首发版本

| 事项 | 类型 |
|---|---|
| Tab 导航 + 三大功能模块集成（片区总览 / 事件流转 / AI 辅助）| 新增 |
| 静态 Node.js 文件服务器 | 新增 |
| 模拟数据（4 片区 / 8 事件 / 4 AI 建议）| 新增 |
| HTML5 + CSS3 + Vanilla JS (ES Module) 架构 | 新增 |

---

## 技术栈与设计边界

| 层面 | 技术 |
|---|---|
| 页面结构 | HTML5 语义标签 |
| 样式 | CSS3（CSS 变量 + Grid 布局 + 响应式）|
| 交互逻辑 | Vanilla JavaScript（ES Module）|
| 服务 | Node.js `http` 模块（零依赖）|
| 测试 | Python unittest + PowerShell 验证脚本 |
| 版本管理 | Git + GitHub |

**设计边界**：
- 聚焦 MVP 原型，不追求完整业务系统
- AI 仅展示辅助判断方式，不设计真实模型训练
- 无 Key 或接口失败时自动 fallback，不白屏
- 覆盖"总览 → 下钻 → 决策 → 反馈"主路径
- 采纳/调整/暂存操作仅为前端模拟反馈，不持久化
