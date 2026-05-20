import { aiSuggestions, districts, events } from "./data.js";

const toneClass = {
  normal: "state-normal",
  warning: "state-warning",
  danger: "state-danger",
  processing: "state-processing",
};

function renderDistricts() {
  const container = document.querySelector('[data-render="districts"]');
  container.innerHTML = districts
    .map(
      (district) => `
        <article class="district-card">
          <div class="card-topline">
            <h3>${district.name}</h3>
            <span class="tag ${toneClass[district.statusTone]}">${district.status}</span>
          </div>
          <div class="metric-row">
            <div class="metric">
              <strong>${district.todayEvents}</strong>
              <span>今日事件</span>
            </div>
            <div class="metric">
              <strong>${district.pendingEvents}</strong>
              <span>待处理</span>
            </div>
            <div class="metric">
              <strong>${district.overdueEvents}</strong>
              <span>超时</span>
            </div>
          </div>
          <p class="meta">可用资源：${district.resources}</p>
        </article>
      `,
    )
    .join("");
}

function renderEvents() {
  const container = document.querySelector('[data-render="events"]');
  container.innerHTML = events
    .map(
      (event) => `
        <article class="event-card">
          <div class="card-topline">
            <h3>${event.type}</h3>
            <span class="tag">${event.priority}</span>
          </div>
          <div class="event-meta">
            <span class="tag">${event.status}</span>
            <span class="tag">${event.owner}</span>
          </div>
          <p class="meta">${event.eventId} · ${event.location}</p>
        </article>
      `,
    )
    .join("");
}

function renderEventDetail() {
  const container = document.querySelector('[data-render="event-detail"]');
  const event = events[0];
  const district = districts.find((item) => item.districtId === event.districtId);

  container.innerHTML = `
    <h3>${event.eventId} · ${event.type}</h3>
    <dl class="detail-list">
      <dt>所属片区</dt>
      <dd>${district.name}</dd>
      <dt>事件位置</dt>
      <dd>${event.location}</dd>
      <dt>负责人</dt>
      <dd>${event.owner}</dd>
      <dt>当前状态</dt>
      <dd>${event.status}</dd>
      <dt>下一步</dt>
      <dd>${event.nextAction}</dd>
      <dt>处理时限</dt>
      <dd>${event.deadline}</dd>
    </dl>
  `;
}

function renderAiSuggestions() {
  const container = document.querySelector('[data-render="ai-suggestions"]');
  container.innerHTML = aiSuggestions
    .map(
      (suggestion) => `
        <article class="suggestion-card">
          <div class="card-topline">
            <h3>${suggestion.riskLevel}</h3>
            <span class="tag">${suggestion.eventId}</span>
          </div>
          <p>${suggestion.recommendation}</p>
          <p>判断原因：${suggestion.reason}</p>
          <p>推荐资源：${suggestion.resourceHint}</p>
        </article>
      `,
    )
    .join("");
}

function renderPrototypeBase() {
  renderDistricts();
  renderEvents();
  renderEventDetail();
  renderAiSuggestions();
}

renderPrototypeBase();
