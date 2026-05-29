const overviewEl = document.querySelector("#overview");
const refreshOverviewButton = document.querySelector("#refreshOverview");
const adminTokenInput = document.querySelector("#adminToken");
const saveAdminTokenButton = document.querySelector("#saveAdminToken");
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
    const data = await api("/api/admin/overview", adminOptions());
    const overview = data.overview || {};
    overviewEl.innerHTML = Object.entries(metricLabels)
      .map(([key, label]) => {
        const value = overview[key] ?? 0;
        return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
      })
      .join("");
  } catch (error) {
    overviewEl.innerHTML = `<div class="notice">${escapeHtml(error.message)}</div>`;
  }
}

async function submitProduct(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(productForm).entries());
  payload.price = Number(payload.price || 0);
  const data = await api("/api/products", {
    ...adminOptions(),
    method: "POST",
    body: JSON.stringify(payload)
  });
  productResult.textContent = JSON.stringify(data, null, 2);
  await loadOverview();
}

async function submitTryon(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(tryonForm).entries());
  const data = await api("/api/tryons", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  tryonResult.textContent = JSON.stringify(data, null, 2);
  await loadOverview();
}

function saveAdminToken() {
  localStorage.setItem(ADMIN_TOKEN_KEY, adminTokenInput.value.trim());
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
