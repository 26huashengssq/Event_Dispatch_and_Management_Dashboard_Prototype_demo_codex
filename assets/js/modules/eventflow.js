// ============================================================
// Event Flow 模块 — 流转节点可视化 + 事件详情 + 操作反馈
// ============================================================
import { districts, events, flowStages } from "../data.js";

const toneClass = {
  normal: "state-normal",
  warning: "state-warning",
  danger: "state-danger",
  processing: "state-processing",
};

let selectedEventId = null;
let activeFlowStage = null;

export function initEventFlow(container) {
  selectedEventId = null;
  activeFlowStage = null;
  render(container);
}

function render(container) {
  container.innerHTML = `
    <section class="panel panel-wide" id="flow-pipeline">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Flow</p>
          <h2>事件流转看板</h2>
        </div>
        <span class="status-pill">${events.length} 个事件</span>
      </div>
      <div class="flow-stages">${renderFlowStages()}</div>
    </section>

    <div class="flow-two-col">
      <section class="panel" id="flow-event-list">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Events</p>
            <h2>${activeFlowStage ? flowStages.find((s) => s.key === activeFlowStage).label + " · " : ""}事件列表</h2>
          </div>
          <span class="status-pill">${getFlowFilteredEvents().length} 个</span>
        </div>
        <div class="event-stack">${renderFlowEventCards()}</div>
      </section>

      <section class="panel" id="flow-detail">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Detail</p>
            <h2>事件详情</h2>
          </div>
          <span class="status-pill">${selectedEventId ? selectedEventId : "请选择事件"}</span>
        </div>
        <div class="detail-placeholder">${renderEventDetail()}</div>
        ${selectedEventId ? renderActionPanel() : ""}
      </section>
    </div>
  `;

  bindEvents(container);
}

function renderFlowStages() {
  const counts = flowStages.map((stage) => ({
    ...stage,
    count: events.filter((e) => e.flowStage === flowStages.indexOf(stage)).length,
  }));

  return counts
    .map(
      (stage, idx) => `
    <div class="flow-node ${activeFlowStage === stage.key ? "flow-node--active" : ""}" data-stage="${stage.key}">
      <span class="flow-icon">${stage.icon}</span>
      <span class="flow-label">${stage.label}</span>
      <span class="flow-badge ${idx === 4 ? "state-normal" : idx === 0 ? "state-danger" : "state-processing"}">${stage.count}</span>
    </div>`,
    )
    .join("");
}

function getFlowFilteredEvents() {
  if (!activeFlowStage) return events;
  const stageIdx = flowStages.findIndex((s) => s.key === activeFlowStage);
  return events.filter((e) => e.flowStage === stageIdx);
}

function renderFlowEventCards() {
  const filtered = getFlowFilteredEvents();
  if (filtered.length === 0) {
    return '<p class="meta empty-msg">该阶段暂无事件</p>';
  }
  return filtered
    .map(
      (e) => `
    <article class="event-card ${e.eventId === selectedEventId ? "event-card--selected" : ""}" data-event="${e.eventId}">
      <div class="card-topline">
        <h3>${e.type}</h3>
        <span class="tag tag-priority ${e.priority === "P0" ? "state-danger" : e.priority === "P1" ? "state-warning" : "state-normal"}">${e.priority}</span>
      </div>
      <div class="event-meta">
        <span class="tag">${e.status}</span>
        <span class="tag">${e.owner}</span>
      </div>
      <p class="meta">${e.eventId} · ${e.location}</p>
    </article>`,
    )
    .join("");
}

function renderEventDetail() {
  if (!selectedEventId) {
    return '<p class="meta empty-msg">请从左侧列表选择一个事件查看详情</p>';
  }
  const event = events.find((e) => e.eventId === selectedEventId);
  if (!event) return '<p class="meta empty-msg">事件未找到</p>';

  const district = districts.find((d) => d.districtId === event.districtId);
  const stageFlow = flowStages
    .map((s, idx) => {
      const cls =
        idx < event.flowStage
          ? "flow-step--done"
          : idx === event.flowStage
            ? "flow-step--current"
            : "flow-step--pending";
      return `<span class="flow-mini-step ${cls}">${s.icon} ${s.label}</span>`;
    })
    .join('<span class="flow-mini-arrow">→</span>');

  return `
    <h3>${event.eventId} · ${event.type}</h3>
    <div class="flow-mini-bar">${stageFlow}</div>
    <dl class="detail-list">
      <dt>所属片区</dt><dd>${district ? district.name : "未知"}</dd>
      <dt>事件位置</dt><dd>${event.location}</dd>
      <dt>负责人</dt><dd>${event.owner}</dd>
      <dt>当前状态</dt><dd><span class="tag ${toneClass[event.status === "已关闭" ? "normal" : event.flowStage >= 3 ? "processing" : "warning"]}">${event.status}</span></dd>
      <dt>下一步</dt><dd>${event.nextAction || "无"}</dd>
      <dt>处理时限</dt><dd>${event.deadline}</dd>
      <dt>上报时间</dt><dd>${event.createdAt}</dd>
      <dt>上报人</dt><dd>${event.reporter}</dd>
    </dl>
  `;
}

function renderActionPanel() {
  const event = events.find((e) => e.eventId === selectedEventId);
  if (!event || event.flowStage >= 4) return "";

  const nextStage = flowStages[Math.min(event.flowStage + 1, 4)];

  return `
    <div class="action-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Action</p>
          <h2>下一步操作</h2>
        </div>
        <span class="tag state-processing">${nextStage.label}</span>
      </div>
      <p class="action-hint">推荐动作：<strong>${event.nextAction}</strong></p>
      <div class="action-buttons">
        <button class="btn btn-primary" data-action="confirm" data-event="${event.eventId}">✅ 确认推进</button>
        <button class="btn btn-secondary" data-action="reassign" data-event="${event.eventId}">🔄 改派他人</button>
        <button class="btn btn-secondary" data-action="escalate" data-event="${event.eventId}">⚠️ 升级处理</button>
      </div>
      <div class="action-feedback" id="action-feedback"></div>
    </div>
  `;
}

function bindEvents(container) {
  // Flow stage click
  container.querySelectorAll(".flow-node").forEach((node) => {
    node.addEventListener("click", () => {
      activeFlowStage = activeFlowStage === node.dataset.stage ? null : node.dataset.stage;
      selectedEventId = null;
      render(container);
    });
  });

  // Event card click
  container.querySelectorAll(".event-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedEventId = selectedEventId === card.dataset.event ? null : card.dataset.event;
      render(container);
    });
  });

  // Action buttons
  container.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const eventId = btn.dataset.event;
      const feedback = container.querySelector("#action-feedback");
      const messages = {
        confirm: `✅ 事件 ${eventId} 已推进至下一节点。`,
        reassign: `🔄 事件 ${eventId} 已提交改派申请，等待主管审批。`,
        escalate: `⚠️ 事件 ${eventId} 已升级，调度中心已收到通知。`,
      };
      feedback.innerHTML = `<span class="feedback-msg feedback-show">${messages[action]}</span>`;
      setTimeout(() => {
        const msg = feedback.querySelector(".feedback-show");
        if (msg) msg.classList.remove("feedback-show");
      }, 3000);
    });
  });
}
