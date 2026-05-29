const overviewEl = document.querySelector("#overview");
const refreshOverviewButton = document.querySelector("#refreshOverview");
const adminTokenInput = document.querySelector("#adminToken");
const saveAdminTokenButton = document.querySelector("#saveAdminToken");
const adminStatusEl = document.querySelector("#adminStatus");
const loginStatusEl = document.querySelector("#loginStatus");
const lineLoginButton = document.querySelector("#lineLoginButton");
const lineLogoutButton = document.querySelector("#lineLogoutButton");
const productForm = document.querySelector("#productForm");
const productResult = document.querySelector("#productResult");
const externalProductForm = document.querySelector("#externalProductForm");
const externalProductResult = document.querySelector("#externalProductResult");
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
let loginConfig = null;

const metricLabels = {
  products: "商品",
  avatars: "Avatar",
  tryons: "試穿",
  outfits: "投稿",
  pending_reviews: "待審核"
};

refreshOverviewButton.addEventListener("click", loadOverview);
saveAdminTokenButton.addEventListener("click", saveAdminToken);
lineLoginButton.addEventListener("click", lineLogin);
lineLogoutButton.addEventListener("click", lineLogout);
productForm.addEventListener("submit", submitProduct);
externalProductForm.addEventListener("submit", submitExternalProduct);
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
initLogin();
loadProducts();
loadOutfits();
loadOverview();

async function initLogin() {
  try {
    loginConfig = await api("/api/config");
    const liffId = loginConfig?.line?.liff_id;
    if (!liffId) {
      setLoginStatus("請先設定 LINE_LIFF_ID，暫用手動會員 ID", "pending");
      return;
    }
    if (!window.liff) {
      setLoginStatus("LIFF SDK 載入失敗，暫用手動會員 ID", "error");
      return;
    }
    await window.liff.init({ liffId });
    if (!window.liff.isLoggedIn()) {
      setLoginStatus("尚未登入 LINE", "pending");
      lineLoginButton.hidden = false;
      lineLogoutButton.hidden = true;
      if (loginConfig.line.login_required) {
        window.liff.login({ redirectUri: window.location.href.split("#")[0] });
      }
      return;
    }
    const profile = await window.liff.getProfile();
    applyLineProfile(profile);
  } catch (error) {
    setLoginStatus(error.message, "error");
  }
}

function lineLogin() {
  if (!window.liff || !loginConfig?.line?.liff_id) {
    setLoginStatus("尚未設定 LINE_LIFF_ID", "error");
    return;
  }
  window.liff.login({ redirectUri: window.location.href.split("#")[0] });
}

function lineLogout() {
  if (window.liff?.isLoggedIn()) {
    window.liff.logout();
  }
  setLoginStatus("已登出，暫用手動會員 ID", "pending");
  lineLoginButton.hidden = false;
  lineLogoutButton.hidden = true;
}

function applyLineProfile(profile) {
  const memberId = `line:${profile.userId}`;
  setMemberId(memberId);
  setLoginStatus(`已登入：${profile.displayName || profile.userId}`, "ok");
  lineLoginButton.hidden = true;
  lineLogoutButton.hidden = false;
}

function setMemberId(memberId) {
  [
    avatarForm?.elements.user_id,
    tryonForm?.elements.user_id,
    stylistForm?.elements.user_id,
    storageForm?.elements.owner_id
  ].forEach((input) => {
    if (input) input.value = memberId;
  });
}

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
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") delete payload[key];
    });
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

async function submitExternalProduct(event) {
  event.preventDefault();
  try {
    externalProductResult.className = "import-result";
    externalProductResult.textContent = "匯入中...";
    const payload = Object.fromEntries(new FormData(externalProductForm).entries());
    payload.price = Number(payload.price || 0);
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") delete payload[key];
    });
    const data = await api("/api/products/import-url", {
      ...adminOptions(),
      method: "POST",
      body: JSON.stringify(payload)
    });
    externalProductResult.innerHTML = renderImportResult(data);
    externalProductResult.querySelector("[data-use-product]")?.addEventListener("click", (clickEvent) => {
      tryonForm.elements.product_id.value = clickEvent.currentTarget.dataset.useProduct;
      tryonResult.textContent = `已帶入商品 ${clickEvent.currentTarget.dataset.useProduct}`;
    });
    if (data.id) {
      tryonForm.elements.product_id.value = data.id;
    }
    await loadProducts();
    await loadOverview();
  } catch (error) {
    externalProductResult.className = "import-result import-result-error";
    externalProductResult.textContent = error.message;
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
  const submitButton = avatarForm.querySelector("button[type='submit']");
  try {
    setFormResult(avatarResult, "pending", "照片上傳中，請不要關閉頁面...");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "上傳中...";
    }
    const formData = new FormData(avatarForm);
    const payload = Object.fromEntries(formData.entries());
    const userId = payload.user_id;
    const photoMap = await uploadAvatarPhotos(userId, formData);
    Object.assign(payload, photoMap);
    delete payload.photo_front;
    delete payload.photo_left_45;
    delete payload.photo_right_45;
    delete payload.photo_full_body;
    setFormResult(avatarResult, "pending", "照片已上傳，Avatar 建檔中...");
    if (submitButton) submitButton.textContent = "建檔中...";
    const data = await api("/api/avatars", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    tryonForm.elements.user_id.value = payload.user_id;
    tryonForm.elements.avatar_id.value = data.id;
    avatarResult.innerHTML = renderAvatarResult(data, payload);
    avatarResult.className = "form-result form-result-ok";
    avatarResult.querySelector("[data-avatar-id]")?.addEventListener("click", (clickEvent) => {
      tryonForm.elements.user_id.value = payload.user_id;
      tryonForm.elements.avatar_id.value = clickEvent.currentTarget.dataset.avatarId;
      tryonResult.textContent = `已帶入 Avatar ${clickEvent.currentTarget.dataset.avatarId}`;
    });
    await loadOverview();
  } catch (error) {
    avatarResult.className = "form-result form-result-error";
    avatarResult.textContent = error.message;
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "儲存 Avatar";
    }
  }
}

async function uploadAvatarPhotos(userId, formData) {
  const slots = [
    ["photo_front", "photo_front_url"],
    ["photo_left_45", "photo_left_45_url"],
    ["photo_right_45", "photo_right_45_url"],
    ["photo_full_body", "photo_full_body_url"]
  ];
  const result = {};
  for (const [fieldName, payloadField] of slots) {
    const file = formData.get(fieldName);
    if (!(file instanceof File) || file.size === 0) {
      throw new Error(`請上傳 ${fieldName}`);
    }
    validateImageFile(file);
    const presign = await api("/api/storage/presign", {
      method: "POST",
      body: JSON.stringify({
        owner_id: userId,
        category: "members",
        filename: `${fieldName}-${Date.now()}-${file.name}`,
        method: "PUT"
      })
    });
    const upload = await fetch(presign.url, {
      method: "PUT",
      body: file
    });
    if (!upload.ok) {
      throw new Error(`照片上傳失敗: ${fieldName}`);
    }
    result[payloadField] = presign.key;
    result[payloadField.replace("_url", "_key")] = presign.key;
  }
  return result;
}

function validateImageFile(file) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("照片格式只支援 jpg、png、webp");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("單張照片不可超過 5MB");
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
        ${product.source_url ? `<span>${escapeHtml(product.source || "external")} · ${escapeHtml(product.import_status || "imported")}</span>` : ""}
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

function renderImportResult(data) {
  const product = data.product || {};
  const imageHtml = product.image_url
    ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name || "imported product")}" loading="lazy">`
    : `<div class="missing-image">未抓到商品圖片<br>請補「圖片網址」再匯入一次</div>`;
  const sourceUrl = product.source_url
    ? `<a href="${escapeHtml(product.source_url)}" target="_blank" rel="noopener">查看原商品</a>`
    : "";
  const note = product.import_note
    ? `<p class="import-warning">${escapeHtml(product.import_note)}</p>`
    : "";
  return `
    <div class="import-summary">
      <div class="import-image">${imageHtml}</div>
      <div>
        <strong>已匯入：${escapeHtml(product.name || data.id || "商品")}</strong>
        <span>商品 ID：${escapeHtml(data.id || product.id || "")}</span>
        <span>來源：${escapeHtml(product.source || "external")} / ${escapeHtml(product.import_status || data.status || "imported")}</span>
        <span>分類：${escapeHtml(product.category || "")}　價格：NT$${Number(product.price || 0).toLocaleString("zh-TW")}</span>
        ${sourceUrl}
        ${note}
        <button type="button" data-use-product="${escapeHtml(data.id || product.id || "")}">帶入試穿</button>
      </div>
    </div>
  `;
}

function renderAvatarResult(data, payload) {
  const avatar = data.avatar || {};
  const photos = [
    avatar.photo_front_key || payload.photo_front_key,
    avatar.photo_left_45_key || payload.photo_left_45_key,
    avatar.photo_right_45_key || payload.photo_right_45_key,
    avatar.photo_full_body_key || payload.photo_full_body_key
  ].filter(Boolean);
  return `
    <div class="result-summary">
      <strong>Avatar 建立成功</strong>
      <span>Avatar ID：${escapeHtml(data.id || avatar.id || "")}</span>
      <span>使用者 ID：${escapeHtml(payload.user_id || avatar.user_id || "")}</span>
      <span>照片已上傳：${photos.length} / 4</span>
      <span>狀態：${escapeHtml(avatar.status || payload.status || "ready")}</span>
      <button type="button" data-avatar-id="${escapeHtml(data.id || avatar.id || "")}">帶入試穿</button>
    </div>
  `;
}

function setFormResult(element, state, message) {
  element.className = `form-result form-result-${state}`;
  element.textContent = message;
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

function setLoginStatus(message, state) {
  loginStatusEl.textContent = message;
  loginStatusEl.dataset.state = state;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
