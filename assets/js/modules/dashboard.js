// ============================================================
// Dashboard Overview 模块 — 对接 /api/* 接口
// ============================================================
import { fetchDashboardData } from "../api.js";

const toneClass = {
  normal: "state-normal",
  warning: "state-warning",
  danger: "state-danger",
  processing: "state-processing",
};

let selectedDistrictId = null;

export async function initDashboard(container) {
  selectedDistrictId = null;
  container.innerHTML = '<div class="loading-msg">⏳ 加载片区数据…</div>';

  try {
    const { districts, events, kpi } = await fetchDashboardData();
    render(container, districts, events, kpi);
  } catch (err) {
    container.innerHTML = `<div class="error-msg">❌ 数据加载失败：${err.message}</div>`;
  }
}

function render(container, districts, events, kpi) {
  container.innerHTML = `
    <div class="kpi-bar">
      <div class="kpi-item">
        <strong>${kpi.total}</strong>
        <span>事件总数</span>
      </div>
      <div class="kpi-item">
        <strong>${kpi.pending}</strong>
        <span>待处理</span>
      </div>
      <div class="kpi-item kpi-danger">
        <strong>${kpi.overdue}</strong>
        <span>P0 紧急</span>
      </div>
      <div class="kpi-item">
        <strong>${kpi.abnormalDistricts}</strong>
        <span>异常片区</span>
      </div>
    </div>

    <section class="panel panel-wide" id="district-overview">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Overview</p>
          <h2>片区总览</h2>
        </div>
        ${selectedDistrictId ? '<button class="btn-back" id="btn-back-overview">← 返回总览</button>' : '<span class="status-pill">点击片区查看详情</span>'}
      </div>
      <div class="district-grid">${renderDistrictCards(districts)}</div>
    </section>

    <section class="panel panel-wide" id="event-list">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Events</p>
          <h2>${selectedDistrictId ? "片区事件列表" : "全部事件列表"}</h2>
        </div>
        <span class="status-pill">${getFilteredEvents(events).length} 个事件</span>
      </div>
      <div class="event-stack">${renderEventCards(events)}</div>
    </section>
  `;

  bindEvents(container, districts, events, kpi);
}

function renderDistrictCards(districts) {
  return districts
    .map(
      (d) => `
    <article class="district-card ${d.districtId === selectedDistrictId ? "district-card--selected" : ""}" data-district="${d.districtId}">
      <div class="card-topline">
        <h3>${d.name}</h3>
        <span class="tag ${toneClass[d.statusTone]}">${d.status}</span>
      </div>
      <div class="metric-row">
        <div class="metric">
          <strong>${d.todayEvents}</strong>
          <span>今日事件</span>
        </div>
        <div class="metric">
          <strong>${d.pendingEvents}</strong>
          <span>待处理</span>
        </div>
        <div class="metric">
          <strong>${d.overdueEvents}</strong>
          <span>超时</span>
        </div>
      </div>
      <p class="meta">可用资源：${d.resources}</p>
    </article>`,
    )
    .join("");
}

function getFilteredEvents(events) {
  if (!selectedDistrictId) return events;
  return events.filter((e) => e.districtId === selectedDistrictId);
}

function renderEventCards(events) {
  const filtered = getFilteredEvents(events);
  if (filtered.length === 0) {
    return '<p class="meta empty-msg">暂无事件数据</p>';
  }
  return filtered
    .map(
      (e) => `
    <article class="event-card" data-event="${e.eventId}">
      <div class="card-topline">
        <h3>${e.type}</h3>
        <span class="tag tag-priority ${e.priority === "P0" ? "state-danger" : e.priority === "P1" ? "state-warning" : "state-normal"}">${e.priority}</span>
      </div>
      <div class="event-meta">
        <span class="tag ${toneClass[e.status === "已关闭" ? "normal" : e.flowStage >= 3 ? "processing" : "warning"]}">${e.status}</span>
        <span class="tag">${e.owner}</span>
      </div>
      <p class="meta">${e.eventId} · ${e.location} · ${e.deadline}</p>
    </article>`,
    )
    .join("");
}

function bindEvents(container, districts, events, kpi) {
  container.querySelectorAll(".district-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.district;
      selectedDistrictId = id === selectedDistrictId ? null : id;
      render(container, districts, events, kpi);
    });
  });

  const backBtn = container.querySelector("#btn-back-overview");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      selectedDistrictId = null;
      render(container, districts, events, kpi);
    });
  }
}
