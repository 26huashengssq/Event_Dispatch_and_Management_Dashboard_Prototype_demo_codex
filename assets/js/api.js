// ============================================================
// API 服务层 — 统一数据接口
// ============================================================
// 所有模块通过此层获取数据，隔离数据来源变更

const BASE = "";

async function request(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} 返回 ${res.status}`);
  return res.json();
}

// ---- 原始数据查询 ----

export function fetchDistricts() {
  return request("/api/districts");
}

export function fetchEvents() {
  return request("/api/events");
}

export function fetchFlowStages() {
  return request("/api/flowStages");
}

export function fetchAiSuggestions() {
  return request("/api/aiSuggestions");
}

export function fetchKPI() {
  return request("/api/kpi");
}

// ---- 组合查询（一次性拉取模块所需的全部数据） ----

export async function fetchDashboardData() {
  const [districts, events, kpi] = await Promise.all([
    fetchDistricts(),
    fetchEvents(),
    fetchKPI(),
  ]);
  return { districts, events, kpi };
}

export async function fetchEventFlowData() {
  const [districts, events, flowStages] = await Promise.all([
    fetchDistricts(),
    fetchEvents(),
    fetchFlowStages(),
  ]);
  return { districts, events, flowStages };
}

export async function fetchAiAssistData() {
  const [aiSuggestions, events, districts] = await Promise.all([
    fetchAiSuggestions(),
    fetchEvents(),
    fetchDistricts(),
  ]);
  return { aiSuggestions, events, districts };
}
