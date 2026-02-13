
// ===============================
// DECIDE ENGINE - CORE ENTRY
// ===============================

console.log("Decide Engine JS Loaded");

// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  const app = document.getElementById("app");

  if (!app) {
    console.error("App container not found");
    return;
  }

  // Clear loading screen
  app.innerHTML = "";

  // Create main container
  const container = document.createElement("div");
  container.style.height = "100vh";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.background = "#050505";
  container.style.color = "white";

  const title = document.createElement("h1");
  title.innerText = "DECIDE ENGINE LIVE";
  title.style.fontSize = "2rem";

  const button = document.createElement("button");
  button.innerText = "Start";
  button.style.marginTop = "20px";
  button.style.padding = "12px 24px";
  button.style.background = "#ff671f";
  button.style.border = "none";
  button.style.cursor = "pointer";
  button.style.fontWeight = "bold";

  button.addEventListener("click", () => {
    showHome();
  });

  container.appendChild(title);
  container.appendChild(button);

  app.appendChild(container);
}

function showHome() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="
      height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      flex-direction:column;
      background:#050505;
      color:white;
      font-family:sans-serif;
    ">
      <h2>Choose Module</h2>
      <button style="margin:10px;padding:10px 20px;"
        onclick="alert('Phones Module Coming Soon')">
        📱 Phones
      </button>
      <button style="margin:10px;padding:10px 20px;"
        onclick="alert('Research Module Coming Soon')">
        🧠 Research
      </button>
    </div>
  `;
}
