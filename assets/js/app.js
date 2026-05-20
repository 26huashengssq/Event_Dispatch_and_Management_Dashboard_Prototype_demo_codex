// ============================================================
// 主应用控制器 — Tab 导航 + 模块调度
// ============================================================
import { initDashboard } from "./modules/dashboard.js";
import { initEventFlow } from "./modules/eventflow.js";
import { initAiAssist } from "./modules/aiassist.js";

const tabs = [
  { id: "dashboard", label: "📊 片区总览", module: initDashboard },
  { id: "eventflow", label: "🔄 事件流转", module: initEventFlow },
  { id: "aiassist", label: "🤖 AI 辅助", module: initAiAssist },
];

let currentTab = "dashboard";

function renderTabs() {
  const nav = document.querySelector(".tab-nav");
  nav.innerHTML = tabs
    .map(
      (t) =>
        `<button class="tab-btn ${t.id === currentTab ? "tab-btn--active" : ""}" data-tab="${t.id}">${t.label}</button>`,
    )
    .join("");

  nav.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentTab = btn.dataset.tab;
      renderTabs();
      renderContent();
    });
  });
}

function renderContent() {
  const container = document.getElementById("module-container");
  const tab = tabs.find((t) => t.id === currentTab);
  if (tab) {
    tab.module(container);
  }
}

function init() {
  renderTabs();
  renderContent();
}

init();
