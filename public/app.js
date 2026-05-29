const overviewEl = document.querySelector("#overview");
const refreshOverviewButton = document.querySelector("#refreshOverview");
const adminTokenInput = document.querySelector("#adminToken");
const saveAdminTokenButton = document.querySelector("#saveAdminToken");
const adminStatusEl = document.querySelector("#adminStatus");
const productForm = document.querySelector("#productForm");
const productResult = document.querySelector("#productResult");
const tryonForm = document.querySelector("#tryonForm");
const tryonResult = document.querySelector("#tryonResult");
const ADMIN_TOKEN_KEY = "mycloset_admin_token";

const metricLabels = {
  products: "商品",
  avatars: "Avatar",
  tryons: "試穿",
  outfits: "投稿",
  pending_reviews: "待審核"
};

refreshOverviewButton.addEventListener("click", loadOverview);
saveAdminTokenButton.addEventListener("click", saveAdminToken);
productForm.addEventListener("submit", submitProduct);
tryonForm.addEventListener("submit", submitTryon);

adminTokenInput.value = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
loadOverview();

async function loadOverview() {
  try {
    setAdminStatus("驗證中...", "pending");
    const data = await api("/api/admin/overview", adminOptions());
    const overview = data.overview || {};
    overviewEl.innerHTML = Object.entries(metricLabels)
      .map(([key, label]) => {
        const value = overview[key] ?? 0;
        return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
      })
      .join("");
    setAdminStatus("Token 正確", "ok");
  } catch (error) {
    overviewEl.innerHTML = `<div class="notice">${escapeHtml(error.message)}</div>`;
    setAdminStatus(error.message, "error");
  }
}

async function submitProduct(event) {
  event.preventDefault();
  try {
    productResult.textContent = "新增中...";
    const payload = Object.fromEntries(new FormData(productForm).entries());
    payload.price = Number(payload.price || 0);
    const data = await api("/api/products", {
      ...adminOptions(),
      method: "POST",
      body: JSON.stringify(payload)
    });
    productResult.textContent = JSON.stringify(data, null, 2);
    await loadOverview();
  } catch (error) {
    productResult.textContent = error.message;
  }
}

async function submitTryon(event) {
  event.preventDefault();
  try {
    tryonResult.textContent = "試穿任務建立中...";
    const payload = Object.fromEntries(new FormData(tryonForm).entries());
    const data = await api("/api/tryons", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    tryonResult.textContent = JSON.stringify(data, null, 2);
    await loadOverview();
  } catch (error) {
    tryonResult.textContent = error.message;
  }
}

function saveAdminToken() {
  localStorage.setItem(ADMIN_TOKEN_KEY, adminTokenInput.value.trim());
  setAdminStatus("已儲存，驗證中...", "pending");
  loadOverview();
}

function adminOptions() {
  const token = adminTokenInput.value.trim();
  return token
    ? {
        headers: {
          "x-admin-token": token
        }
      }
    : {};
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function setAdminStatus(message, state) {
  adminStatusEl.textContent = message;
  adminStatusEl.dataset.state = state;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
