// ============================================================
// AI Assist 模块 — 对接 /api/* 接口
// ============================================================
import { fetchAiAssistData } from "../api.js";

let acceptedSet = new Set();

export async function initAiAssist(container, context = {}) {
  acceptedSet = new Set();
  container.innerHTML = '<div class="loading-msg">⏳ 加载 AI 建议数据…</div>';

  try {
    const { aiSuggestions, events, districts } = await fetchAiAssistData();
    render(container, aiSuggestions, events, districts, context.eventId || null);
  } catch (err) {
    container.innerHTML = `<div class="error-msg">❌ 数据加载失败：${err.message}</div>`;
  }
}

function render(container, aiSuggestions, events, districts, focusedEventId = null) {
  const suggestions = aiSuggestions.map((s) => ({
    ...s,
    _accepted: acceptedSet.has(s.suggestionId),
  }));
  const orderedSuggestions = focusedEventId
    ? [
        ...suggestions.filter((s) => s.eventId === focusedEventId),
        ...suggestions.filter((s) => s.eventId !== focusedEventId),
      ]
    : suggestions;
  const focusedSuggestion = suggestions.find((s) => s.eventId === focusedEventId);

  container.innerHTML = `
    <section class="panel panel-wide" id="ai-risk">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">AI Risk Analysis</p>
          <h2>风险态势分析</h2>
        </div>
        <span class="status-pill">${suggestions.length} 条建议</span>
      </div>
      <div class="risk-summary">
        ${renderRiskSummary(suggestions)}
      </div>
    </section>

    <section class="panel panel-wide" id="ai-suggestions">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">AI Recommendations</p>
          <h2>调度建议与资源匹配</h2>
        </div>
        <span class="status-pill">${focusedEventId ? `定位事件 ${focusedEventId}` : `${suggestions.filter((s) => s._accepted).length} 条已采纳`}</span>
      </div>
      ${focusedEventId && !focusedSuggestion ? `<p class="meta ai-focus-empty">当前事件 ${focusedEventId} 暂无 AI 建议，仍可查看其他风险建议。</p>` : ""}
      <div class="suggestion-grid-detailed">${renderSuggestionCards(orderedSuggestions, events, districts, focusedEventId)}</div>
    </section>
  `;

  if (focusedEventId && focusedSuggestion) {
    requestAnimationFrame(() => {
      const card = container.querySelector(`[data-focus-event="${focusedEventId}"]`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  bindEvents(container, suggestions, events, districts, focusedEventId);
}

function renderRiskSummary(suggestions) {
  const highRisk = suggestions.filter((s) => s.riskTone === "danger" && !s._accepted).length;
  const midRisk = suggestions.filter((s) => s.riskTone === "warning" && !s._accepted).length;
  const lowRisk = suggestions.filter((s) => s.riskTone === "normal" && !s._accepted).length;
  const accepted = suggestions.filter((s) => s._accepted).length;

  return `
    <div class="risk-cards">
      <div class="risk-card risk-high">
        <strong>${highRisk}</strong>
        <span>高风险未处理</span>
      </div>
      <div class="risk-card risk-mid">
        <strong>${midRisk}</strong>
        <span>中风险待确认</span>
      </div>
      <div class="risk-card risk-low">
        <strong>${lowRisk}</strong>
        <span>低风险</span>
      </div>
      <div class="risk-card risk-done">
        <strong>${accepted}</strong>
        <span>已采纳</span>
      </div>
    </div>
  `;
}

function renderSuggestionCards(suggestions, events, districts, focusedEventId) {
  return suggestions
    .map((s) => {
      const event = events.find((e) => e.eventId === s.eventId);
      const district = event ? districts.find((d) => d.districtId === event.districtId) : null;
      const toneMap = { danger: "state-danger", warning: "state-warning", normal: "state-normal" };
      const cls = toneMap[s.riskTone] || "state-normal";
      const focusClass = s.eventId === focusedEventId ? "suggestion-card--focused" : "";

      return `
    <article class="suggestion-card-full ${focusClass} ${s._accepted ? "suggestion-accepted" : ""}" data-focus-event="${s.eventId}">
      <div class="suggestion-header">
        <div>
          <h3>${s.eventId}</h3>
          <p class="meta">${event ? event.type + " · " + (district ? district.name : "") : ""}</p>
        </div>
        <span class="tag ${cls}">${s.riskLevel}</span>
      </div>
      <div class="suggestion-body">
        <div class="suggestion-field">
          <span class="field-label">🧠 推荐动作</span>
          <p>${s.recommendation}</p>
        </div>
        <div class="suggestion-field">
          <span class="field-label">📊 判断原因</span>
          <p>${s.reason}</p>
        </div>
        <div class="suggestion-field">
          <span class="field-label">🚛 推荐资源</span>
          <p>${s.resourceHint}</p>
        </div>
        <div class="suggestion-confidence">
          <span class="field-label">置信度</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width:${s.confidence}%"></div>
          </div>
          <strong>${s.confidence}%</strong>
        </div>
      </div>
      ${s._accepted
        ? '<div class="suggestion-accepted-badge">✅ 已采纳 — 调度指令已下发</div>'
        : `<div class="suggestion-actions">
            <button class="btn btn-primary" data-action="accept" data-id="${s.suggestionId}">✅ 采纳建议</button>
            <button class="btn btn-secondary" data-action="adjust" data-id="${s.suggestionId}">🔧 调整方案</button>
            <button class="btn btn-secondary" data-action="dismiss" data-id="${s.suggestionId}">⏭️ 暂不处理</button>
          </div>`
      }
    </article>`;
    })
    .join("");
}

function bindEvents(container, suggestions, events, districts, focusedEventId) {
  container.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === "accept") {
        acceptedSet.add(id);
        render(container, suggestions, events, districts, focusedEventId);
      } else if (action === "adjust") {
        const card = btn.closest(".suggestion-card-full");
        const feedback = document.createElement("div");
        feedback.className = "feedback-msg feedback-show";
        feedback.textContent = "🔧 已进入调整模式 — 请根据实际情况修改调度参数。";
        card.appendChild(feedback);
        setTimeout(() => feedback.remove(), 3000);
      } else if (action === "dismiss") {
        const card = btn.closest(".suggestion-card-full");
        card.style.opacity = "0.4";
        card.style.transition = "opacity 0.3s";
        const btns = card.querySelector(".suggestion-actions");
        if (btns) btns.innerHTML = '<span class="tag">已暂存</span>';
      }
    });
  });
}
