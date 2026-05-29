const overviewEl = document.querySelector("#overview");
const refreshOverviewButton = document.querySelector("#refreshOverview");
const productForm = document.querySelector("#productForm");
const productResult = document.querySelector("#productResult");
const tryonForm = document.querySelector("#tryonForm");
const tryonResult = document.querySelector("#tryonResult");

const metricLabels = {
  products: "商品",
  avatars: "Avatar",
  tryons: "試穿",
  outfits: "投稿",
  pending_reviews: "待審核"
};

refreshOverviewButton.addEventListener("click", loadOverview);
productForm.addEventListener("submit", submitProduct);
tryonForm.addEventListener("submit", submitTryon);

loadOverview();

async function loadOverview() {
  const data = await api("/api/admin/overview");
  const overview = data.overview || {};
  overviewEl.innerHTML = Object.entries(metricLabels)
    .map(([key, label]) => {
      const value = overview[key] ?? 0;
      return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
    })
    .join("");
}

async function submitProduct(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(productForm).entries());
  payload.price = Number(payload.price || 0);
  const data = await api("/api/products", {
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
