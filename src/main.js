import { initRouter } from "./router.js";
import { store } from "./store.js";
import { clear } from "./utils/dom.js";
import { LobbyView } from "./views/LobbyView.js";
import { DecideFlowView } from "./views/DecideFlowView.js";

function cleanupNode(node) {
  if (node && typeof node.__cleanup === "function") {
    try { node.__cleanup(); } catch {}
  }
}

function NotFoundView() {
  const div = document.createElement("div");
  div.style.padding = "90px 20px";
  div.style.opacity = "0.8";
  div.innerHTML = `Route not found. Go <a href="#/">home</a>.`;
  return div;
}

function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

function render(state) {
  const root = document.getElementById("app");
  if (!root) return;

  if (root.firstChild) cleanupNode(root.firstChild);
  clear(root);

  if (state.route === "/") {
    root.appendChild(LobbyView(state));
    return;
  }

  if (state.route === "/smartphones") {
    root.appendChild(DecideFlowView(state, "smartphones"));
    return;
  }
  if (state.route === "/earbuds") {
    root.appendChild(DecideFlowView(state, "earbuds"));
    return;
  }
  if (state.route === "/laptops") {
    root.appendChild(DecideFlowView(state, "laptops"));
    return;
  }

  root.appendChild(NotFoundView());
}

store.subscribe((s) => render(s));
initRouter();
registerSW();
