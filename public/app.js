const overviewEl = document.querySelector("#overview");
const refreshOverviewButton = document.querySelector("#refreshOverview");
const adminTokenInput = document.querySelector("#adminToken");
const saveAdminTokenButton = document.querySelector("#saveAdminToken");
const adminStatusEl = document.querySelector("#adminStatus");
const productForm = document.querySelector("#productForm");
const productResult = document.querySelector("#productResult");
const productListEl = document.querySelector("#productList");
const refreshProductsButton = document.querySelector("#refreshProducts");
const tryonForm = document.querySelector("#tryonForm");
const tryonResult = document.querySelector("#tryonResult");
const outfitForm = document.querySelector("#outfitForm");
const outfitResult = document.querySelector("#outfitResult");
const avatarForm = document.querySelector("#avatarForm");
const avatarResult = document.querySelector("#avatarResult");
const refreshPointsButton = document.querySelector("#refreshPoints");
const refreshEligibilityButton = document.querySelector("#refreshEligibility");
const memberResult = document.querySelector("#memberResult");
const stylistForm = document.querySelector("#stylistForm");
const stylistResult = document.querySelector("#stylistResult");
const storageForm = document.querySelector("#storageForm");
const storageResult = document.querySelector("#storageResult");
const outfitListEl = document.querySelector("#outfitList");
const outfitFilter = document.querySelector("#outfitFilter");
const refreshOutfitsButton = document.querySelector("#refreshOutfits");
const ADMIN_TOKEN_KEY = "mycloset_admin_token";
let lastTryon = null;

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
refreshProductsButton.addEventListener("click", loadProducts);
tryonForm.addEventListener("submit", submitTryon);
outfitForm.addEventListener("submit", submitOutfit);
avatarForm.addEventListener("submit", submitAvatar);
refreshPointsButton.addEventListener("click", loadPoints);
refreshEligibilityButton.addEventListener("click", loadEligibility);
stylistForm.addEventListener("submit", submitStylist);
storageForm.addEventListener("submit", submitStoragePresign);
refreshOutfitsButton.addEventListener("click", loadOutfits);
outfitFilter.addEventListener("change", loadOutfits);

adminTokenInput.value = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
loadProducts();
loadOutfits();
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
    await loadProducts();
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
    lastTryon = {
      id: data.id,
      user_id: payload.user_id,
      result_image: data.result_image
    };
    tryonResult.textContent = JSON.stringify(data, null, 2);
    await loadOverview();
  } catch (error) {
    tryonResult.textContent = error.message;
  }
}

async function submitOutfit(event) {
  event.preventDefault();
  try {
    if (!lastTryon) {
      throw new Error("請先建立試穿結果");
    }
    outfitResult.textContent = "投稿中...";
    const payload = Object.fromEntries(new FormData(outfitForm).entries());
    payload.user_id = lastTryon.user_id;
    payload.tryon_job_id = lastTryon.id;
    payload.image_url = lastTryon.result_image;
    const data = await api("/api/outfits", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    outfitResult.textContent = JSON.stringify(data, null, 2);
    await loadOutfits();
    await loadPoints();
    await loadOverview();
  } catch (error) {
    outfitResult.textContent = error.message;
  }
}

async function submitAvatar(event) {
  event.preventDefault();
  try {
    avatarResult.textContent = "儲存中...";
    const payload = Object.fromEntries(new FormData(avatarForm).entries());
    const data = await api("/api/avatars", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    avatarResult.textContent = JSON.stringify(data, null, 2);
    tryonForm.elements.user_id.value = payload.user_id;
    tryonForm.elements.avatar_id.value = data.id;
    await loadOverview();
  } catch (error) {
    avatarResult.textContent = error.message;
  }
}

async function submitStylist(event) {
  event.preventDefault();
  try {
    stylistResult.textContent = "AI 顧問產生中...";
    const payload = Object.fromEntries(new FormData(stylistForm).entries());
    const data = await api("/api/stylist", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    stylistResult.textContent = data.advice || JSON.stringify(data, null, 2);
  } catch (error) {
    stylistResult.textContent = error.message;
  }
}

async function submitStoragePresign(event) {
  event.preventDefault();
  try {
    storageResult.textContent = "產生中...";
    const payload = Object.fromEntries(new FormData(storageForm).entries());
    const data = await api("/api/storage/presign", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    storageResult.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    storageResult.textContent = error.message;
  }
}

async function loadProducts() {
  productListEl.innerHTML = `<div class="notice">商品讀取中...</div>`;
  try {
    const data = await api("/api/products");
    const products = data.products || [];
    if (products.length === 0) {
      productListEl.innerHTML = `<div class="notice">目前沒有商品。</div>`;
      return;
    }
    productListEl.innerHTML = products.map(renderProduct).join("");
    productListEl.querySelectorAll("[data-use-product]").forEach((button) => {
      button.addEventListener("click", () => {
        tryonForm.elements.product_id.value = button.dataset.useProduct;
        tryonResult.textContent = `已選擇商品 ${button.dataset.useProduct}`;
      });
    });
  } catch (error) {
    productListEl.innerHTML = `<div class="notice">${escapeHtml(error.message)}</div>`;
  }
}

async function loadOutfits() {
  outfitListEl.innerHTML = `<div class="notice">穿搭讀取中...</div>`;
  try {
    const status = outfitFilter.value;
    const data = await api(`/api/outfits${status ? `?review_status=${encodeURIComponent(status)}` : ""}`);
    const outfits = data.outfits || [];
    if (outfits.length === 0) {
      outfitListEl.innerHTML = `<div class="notice">目前沒有穿搭投稿。</div>`;
      return;
    }
    outfitListEl.innerHTML = outfits.map(renderOutfit).join("");
    outfitListEl.querySelectorAll("[data-social]").forEach((button) => {
      button.addEventListener("click", () => createSocial(button.dataset.social, button.dataset.target));
    });
    outfitListEl.querySelectorAll("[data-review]").forEach((button) => {
      button.addEventListener("click", () => reviewOutfit(button.dataset.target, button.dataset.review));
    });
  } catch (error) {
    outfitListEl.innerHTML = `<div class="notice">${escapeHtml(error.message)}</div>`;
  }
}

function renderOutfit(outfit) {
  return `
    <article class="outfit-item">
      <div class="outfit-preview">${escapeHtml(outfit.style || "style")}</div>
      <div>
        <strong>${escapeHtml(outfit.description || "未填描述")}</strong>
        <span>${escapeHtml(outfit.user_id)} · ${escapeHtml(outfit.review_status)}</span>
        <span>like ${Number(outfit.like_count || 0)} · collect ${Number(outfit.collection_count || 0)}</span>
      </div>
      <div class="button-row">
        <button type="button" data-social="like" data-target="${escapeHtml(outfit.id)}">按讚</button>
        <button type="button" data-social="collect" data-target="${escapeHtml(outfit.id)}">收藏</button>
        <button type="button" data-review="approved" data-target="${escapeHtml(outfit.id)}">通過</button>
        <button type="button" data-review="rejected" data-target="${escapeHtml(outfit.id)}">拒絕</button>
      </div>
    </article>
  `;
}

async function createSocial(action, targetId) {
  const userId = tryonForm.elements.user_id.value || "demo-user-001";
  await api("/api/social", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      target_type: "outfit",
      target_id: targetId,
      action
    })
  });
  await loadOutfits();
  await loadPoints();
}

async function reviewOutfit(id, reviewStatus) {
  await api(`/api/outfits/${encodeURIComponent(id)}/review`, {
    ...adminOptions(),
    method: "POST",
    body: JSON.stringify({ review_status: reviewStatus })
  });
  await loadOutfits();
  await loadPoints();
  await loadOverview();
}

async function loadPoints() {
  const userId = tryonForm.elements.user_id.value || "demo-user-001";
  const data = await api(`/api/points/${encodeURIComponent(userId)}`);
  memberResult.textContent = JSON.stringify(data, null, 2);
}

async function loadEligibility() {
  const userId = tryonForm.elements.user_id.value || "demo-user-001";
  const data = await api(`/api/ambassadors/${encodeURIComponent(userId)}/eligibility`);
  memberResult.textContent = JSON.stringify(data, null, 2);
}

function renderProduct(product) {
  const price = Number(product.price || 0).toLocaleString("zh-TW");
  return `
    <article class="product-item">
      <div>
        <strong>${escapeHtml(product.name || product.id)}</strong>
        <span>${escapeHtml(product.brand || "未填品牌")} · ${escapeHtml(product.category || "uncategorized")}</span>
      </div>
      <div class="product-meta">
        <span>NT$${price}</span>
        <span>${escapeHtml(product.color || "未填顏色")}</span>
      </div>
      <button type="button" data-use-product="${escapeHtml(product.id)}">帶入試穿</button>
    </article>
  `;
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
