const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,authorization"
};

const CATEGORY_LABELS = new Set([
  "top",
  "jacket",
  "pants",
  "shorts",
  "dress",
  "shoes",
  "bag",
  "accessory"
]);

const STORAGE_CATEGORIES = new Set([
  "products",
  "logos",
  "members",
  "tryons",
  "outfits",
  "orders",
  "reports",
  "line",
  "temp"
]);

const POINTS = {
  submit_outfit: 10,
  approved_review: 50,
  collected: 5,
  liked: 1,
  conversion: 100
};

const store = {
  products: new Map([
    [
      "cloth001",
      {
        id: "cloth001",
        merchant_id: "demo-merchant-001",
        name: "商務西裝外套",
        brand: "BrandA",
        category: "jacket",
        color: "navy",
        price: 3990,
        image_url: "/demo/cloth001.jpg",
        status: "active",
        tryon_count: 0,
        collection_count: 0,
        conversion_count: 0,
        storage_key: "tonyuse/mycloset/shops/demo-merchant-001/products/2026/05/cloth001.json",
        created_at: "2026-05-29T00:00:00.000Z"
      }
    ]
  ]),
  avatars: new Map(),
  tryons: new Map(),
  outfits: new Map(),
  socialActions: [],
  points: [],
  lineEvents: []
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: JSON_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === (env.LINE_WEBHOOK_PATH || "/line/webhook")) {
      try {
        return await handleLineWebhook(request, env);
      } catch (error) {
        return json({ error: error.message || "LINE webhook error" }, 500);
      }
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        return await routeApi(request, env, url);
      } catch (error) {
        return json({ error: error.message || "Internal error" }, error.status || 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};

async function routeApi(request, env, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;

  if (method === "GET" && path === "/api/health") {
    return json({
      ok: true,
      service: "my-closet-ai",
      provider: env.AI_PROVIDER || "stub",
      openai: {
        base_url: env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        text_model: env.OPENAI_TEXT_MODEL || "gpt-5-mini",
        image_model: env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
        api_key_configured: Boolean(env.OPENAI_API_KEY)
      },
      admin_api_token_configured: Boolean(env.ADMIN_API_TOKEN),
      line: {
        liff_id_configured: Boolean(env.LINE_LIFF_ID),
        login_required: env.LINE_LOGIN_REQUIRED === "true"
      },
      storage: {
        provider: env.STORAGE_PROVIDER || "wasabi",
        access_key_configured: Boolean(env.WASABI_ACCESS_KEY_ID),
        secret_key_configured: Boolean(env.WASABI_SECRET_ACCESS_KEY)
      },
      face_similarity_threshold: Number(env.FACE_SIMILARITY_THRESHOLD || 0.8)
    });
  }

  if (method === "GET" && path === "/api/storage/location") {
    return json(getStorageLocation(env));
  }

  if (method === "POST" && path === "/api/storage/presign") {
    return createStoragePresignedUrl(request, env);
  }

  if (method === "GET" && path === "/api/integrations/params") {
    return json(getIntegrationParams(env));
  }

  if (method === "GET" && path === "/api/config") {
    return json(getPublicConfig(env));
  }

  if (path === "/api/line/webhook") {
    return handleLineWebhook(request, env);
  }

  if (method === "GET" && path === "/api/products") {
    return listProducts(env, url);
  }

  if (method === "POST" && path === "/api/products") {
    requireAdmin(request, env);
    return createProduct(request, env);
  }

  if (method === "POST" && path === "/api/avatars") {
    return upsertAvatar(request, env);
  }

  const avatarMatch = path.match(/^\/api\/avatars\/([^/]+)$/);
  if (method === "GET" && avatarMatch) {
    return getAvatar(env, avatarMatch[1]);
  }

  if (method === "POST" && path === "/api/tryons") {
    return createTryon(request, env);
  }

  if (method === "POST" && path === "/api/stylist") {
    return createStylistAdvice(request, env);
  }

  const tryonMatch = path.match(/^\/api\/tryons\/([^/]+)$/);
  if (method === "GET" && tryonMatch) {
    return getTryon(env, tryonMatch[1]);
  }

  if (method === "POST" && path === "/api/outfits") {
    return createOutfit(request, env);
  }

  if (method === "GET" && path === "/api/outfits") {
    return listOutfits(env, url);
  }

  const reviewMatch = path.match(/^\/api\/outfits\/([^/]+)\/review$/);
  if (method === "POST" && reviewMatch) {
    requireAdmin(request, env);
    return reviewOutfit(request, env, reviewMatch[1]);
  }

  if (method === "POST" && path === "/api/social") {
    return createSocialAction(request, env);
  }

  const pointsMatch = path.match(/^\/api\/points\/([^/]+)$/);
  if (method === "GET" && pointsMatch) {
    return getUserPoints(env, pointsMatch[1]);
  }

  const eligibilityMatch = path.match(/^\/api\/ambassadors\/([^/]+)\/eligibility$/);
  if (method === "GET" && eligibilityMatch) {
    return getAmbassadorEligibility(env, eligibilityMatch[1]);
  }

  if (method === "GET" && path === "/api/admin/overview") {
    requireAdmin(request, env);
    return getAdminOverview(env);
  }

  return json({ error: "Route not found" }, 404);
}

async function listProducts(env, url) {
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status") || "active";
  const products = await listDocumentsByCategory(env, "products");
  const fallbackProducts = [...store.products.values()];
  const source = products.length > 0 ? products : fallbackProducts;
  const filtered = source
    .filter((product) => product.status === status)
    .filter((product) => !category || product.category === category)
    .slice(0, 100);
  return json({ products: filtered, storage_mode: "wasabi-document" });
}

async function createProduct(request, env) {
  const body = await readJson(request);
  requireFields(body, ["name", "category"]);
  if (!CATEGORY_LABELS.has(body.category)) {
    return json({ error: "Unsupported category" }, 400);
  }

  const id = body.id || crypto.randomUUID();
  const product = {
    id,
    merchant_id: body.merchant_id || "default-shop",
    name: body.name,
    brand: body.brand || null,
    category: body.category,
    color: body.color || null,
    price: Number(body.price || 0),
    image_url: body.image_url || null,
    status: body.status || "active",
    tryon_count: 0,
    collection_count: 0,
    conversion_count: 0,
    storage_key: buildDocumentKey(env, body.merchant_id || "default-shop", "products", `${id}.json`),
    created_at: new Date().toISOString()
  };
  store.products.set(id, product);
  await putJsonDocument(env, product.storage_key, product);

  return json({ id, status: "created", product, storage_mode: "wasabi-document" }, 201);
}

async function createStoragePresignedUrl(request, env) {
  const body = await readJson(request);
  requireFields(body, ["owner_id", "category", "filename", "method"]);
  const method = body.method.toUpperCase();
  if (!["PUT", "GET"].includes(method)) {
    return json({ error: "method must be PUT or GET" }, 400);
  }
  if (!STORAGE_CATEGORIES.has(body.category)) {
    return json({ error: "Unsupported storage category" }, 400);
  }
  const filename = sanitizeFilename(body.filename);
  const extension = filename.split(".").pop().toLowerCase();
  const allowedExtensions = splitCsv(env.WASABI_ALLOWED_EXTENSIONS || "jpg,jpeg,png,webp,pdf,csv,xlsx");
  if (!allowedExtensions.includes(extension)) {
    return json({ error: "Unsupported file extension" }, 400);
  }
  const key = body.key || buildStorageObjectKey(env, body.owner_id, body.category, filename);
  assertAllowedStorageKey(env, key);
  const keyExtension = key.split(".").pop().toLowerCase();
  if (!allowedExtensions.includes(keyExtension)) {
    return json({ error: "Unsupported object key extension" }, 400);
  }
  const expires = Math.min(Number(body.expires_seconds || env.WASABI_PRESIGNED_EXPIRES_SECONDS || 600), 900);
  const url = await createWasabiPresignedUrl(env, method, key, expires);
  return json({
    method,
    url,
    key,
    expires_in: expires,
    content_type: body.content_type || guessContentType(extension),
    storage_mode: "wasabi-presigned-url"
  });
}


async function upsertAvatar(request, env) {
  const body = await readJson(request);
  requireFields(body, ["user_id", "face_id", "skin_tone", "hair_style"]);
  const id = body.id || crypto.randomUUID();
  const avatar = {
    id,
    user_id: body.user_id,
    face_id: body.face_id,
    body_type: body.body_type || "normal",
    skin_tone: body.skin_tone,
    hair_style: body.hair_style,
    shoulder_width: numberOrNull(body.shoulder_width),
    waist_line: numberOrNull(body.waist_line),
    leg_length: numberOrNull(body.leg_length),
    photo_front_url: body.photo_front_url || null,
    photo_left_45_url: body.photo_left_45_url || null,
    photo_right_45_url: body.photo_right_45_url || null,
    photo_full_body_url: body.photo_full_body_url || null,
    status: body.status || "draft",
    storage_key: buildDocumentKey(env, body.user_id, "members", `${id}.json`),
    created_at: new Date().toISOString()
  };
  store.avatars.set(id, avatar);
  await putJsonDocument(env, avatar.storage_key, avatar);

  return json({ id, status: "saved", avatar, storage_mode: "wasabi-document" });
}

async function getAvatar(env, userId) {
  const avatarDocuments = await listDocumentsForOwnerCategory(env, userId, "members");
  const avatar = avatarDocuments[0] || [...store.avatars.values()].find((item) => item.user_id === userId) || null;
  return json({ avatar, storage_mode: "wasabi-document" });
}

async function createTryon(request, env) {
  const body = await readJson(request);
  requireFields(body, ["user_id", "avatar_id", "product_id"]);

  const id = crypto.randomUUID();
  const providerResult = await runTryonProvider(env, {
    jobId: id,
    userId: body.user_id,
    avatarId: body.avatar_id,
    productId: body.product_id
  });
  const threshold = Number(env.FACE_SIMILARITY_THRESHOLD || 0.8);
  const status = providerResult.face_similarity_score >= threshold ? "completed" : "rejected";

  const tryon = {
    id,
    user_id: body.user_id,
    avatar_id: body.avatar_id,
    product_id: body.product_id,
    provider: providerResult.provider,
    provider_job_id: providerResult.provider_job_id,
    status,
    result_image_url: providerResult.result_image_url,
    face_similarity_score: providerResult.face_similarity_score,
    retry_count: providerResult.retry_count,
    error_message: status === "rejected" ? "Face similarity below threshold" : null,
    storage_key: buildDocumentKey(env, body.user_id, "tryons", `${id}.json`),
    created_at: new Date().toISOString()
  };
  store.tryons.set(id, tryon);
  await putJsonDocument(env, tryon.storage_key, tryon);

  const product = store.products.get(body.product_id) || await findDocumentById(env, "products", body.product_id);
  if (product) {
    product.tryon_count += 1;
    store.products.set(product.id, product);
    await putJsonDocument(env, product.storage_key, product);
  }

  return json({
    id,
    status,
    result_image: providerResult.result_image_url,
    face_similarity_score: providerResult.face_similarity_score,
    storage_mode: "wasabi-document"
  }, 201);
}

async function createStylistAdvice(request, env) {
  const body = await readJson(request);
  requireFields(body, ["user_id", "occasion"]);
  if (!env.OPENAI_API_KEY) {
    return json({ error: "OPENAI_API_KEY is not configured" }, 500);
  }

  const [avatarResult, productResult] = await Promise.all([
    getAvatarRecord(env, body.user_id),
    body.product_id ? findDocumentById(env, "products", body.product_id) : Promise.resolve(null)
  ]);
  const advice = await callOpenAIStylist(env, {
    userId: body.user_id,
    occasion: body.occasion,
    preference: body.preference || "",
    avatar: avatarResult,
    product: productResult
  });
  const id = crypto.randomUUID();
  const record = {
    id,
    user_id: body.user_id,
    product_id: body.product_id || null,
    occasion: body.occasion,
    preference: body.preference || null,
    advice,
    model: env.OPENAI_TEXT_MODEL || "gpt-5-mini",
    storage_key: buildDocumentKey(env, body.user_id, "stylist", `${id}.json`),
    created_at: new Date().toISOString()
  };
  await putJsonDocument(env, record.storage_key, record);
  return json({ id, advice, record, storage_mode: "wasabi-document" }, 201);
}

async function getAvatarRecord(env, userId) {
  const avatarDocuments = await listDocumentsForOwnerCategory(env, userId, "members");
  return avatarDocuments[0] || [...store.avatars.values()].find((item) => item.user_id === userId) || null;
}

async function callOpenAIStylist(env, context) {
  const prompt = [
    "你是 My Closet AI 的穿搭顧問。請用繁體中文回答。",
    "請根據使用者 Avatar、商品與場合，提供可執行的短版穿搭建議。",
    "回答必須完整，不超過 450 個中文字。",
    "回答格式固定為四段：整體建議、適合原因、搭配建議、注意事項。",
    "每段 1 到 2 句，不要列超過 6 個項目。",
    "不要聲稱已經真的生成換衣圖片。",
    "",
    `使用者 ID: ${context.userId}`,
    `場合: ${context.occasion}`,
    `偏好: ${context.preference || "未指定"}`,
    `Avatar: ${JSON.stringify(context.avatar || {})}`,
    `商品: ${JSON.stringify(context.product || {})}`
  ].join("\n");
  const response = await fetch(`${env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: env.OPENAI_TEXT_MODEL || "gpt-5-mini",
      input: prompt,
      max_output_tokens: 1400
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed: ${response.status}`);
  }
  return extractOpenAIText(data);
}

function extractOpenAIText(data) {
  if (data.output_text) return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim() || JSON.stringify(data);
}


async function getTryon(env, id) {
  const tryon = store.tryons.get(id) || await findDocumentById(env, "tryons", id);
  if (!tryon) return json({ error: "Try-on job not found" }, 404);
  return json({ tryon, storage_mode: "wasabi-document" });
}

async function createOutfit(request, env) {
  const body = await readJson(request);
  requireFields(body, ["user_id", "image_url"]);
  const id = crypto.randomUUID();
  const outfit = {
    id,
    user_id: body.user_id,
    tryon_job_id: body.tryon_job_id || null,
    image_url: body.image_url,
    style: body.style || null,
    description: body.description || null,
    ai_review_status: body.ai_review_status || "pending",
    review_status: "pending",
    like_count: 0,
    collection_count: 0,
    share_count: 0,
    storage_key: buildDocumentKey(env, body.user_id, "outfits", `${id}.json`),
    created_at: new Date().toISOString()
  };
  store.outfits.set(id, outfit);
  await putJsonDocument(env, outfit.storage_key, outfit);

  await addPoints(env, body.user_id, "outfit", id, POINTS.submit_outfit, "submit_outfit");
  return json({ id, review_status: "pending", outfit, storage_mode: "wasabi-document" }, 201);
}

async function listOutfits(env, url) {
  const reviewStatus = url.searchParams.get("review_status");
  const userId = url.searchParams.get("user_id");
  const style = url.searchParams.get("style");
  const documents = await listDocumentsByCategory(env, "outfits");
  const source = documents.length > 0 ? documents : [...store.outfits.values()];
  const outfits = source
    .filter((outfit) => !reviewStatus || outfit.review_status === reviewStatus)
    .filter((outfit) => !userId || outfit.user_id === userId)
    .filter((outfit) => !style || outfit.style === style)
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, 100);
  return json({ outfits, storage_mode: "wasabi-document" });
}

async function reviewOutfit(request, env, id) {
  const body = await readJson(request);
  requireFields(body, ["review_status"]);
  if (!["approved", "rejected"].includes(body.review_status)) {
    return json({ error: "review_status must be approved or rejected" }, 400);
  }

  const outfit = store.outfits.get(id) || await findDocumentById(env, "outfits", id);
  if (!outfit) return json({ error: "Outfit not found" }, 404);
  outfit.review_status = body.review_status;
  outfit.reviewed_at = new Date().toISOString();
  store.outfits.set(id, outfit);
  await putJsonDocument(env, outfit.storage_key, outfit);

  if (body.review_status === "approved") {
    await addPoints(env, outfit.user_id, "outfit", id, POINTS.approved_review, "approved_review");
  }

  return json({ id, review_status: body.review_status });
}

async function createSocialAction(request, env) {
  const body = await readJson(request);
  requireFields(body, ["user_id", "target_type", "target_id", "action"]);
  const id = crypto.randomUUID();
  const action = {
    id,
    ...body,
    storage_key: buildDocumentKey(env, body.user_id, "social", `${Date.now()}-${id}.json`),
    created_at: new Date().toISOString()
  };
  store.socialActions.push(action);
  await putJsonDocument(env, action.storage_key, action);

  if (body.target_type === "outfit" && body.action === "like") {
    const outfit = store.outfits.get(body.target_id) || await findDocumentById(env, "outfits", body.target_id);
    if (outfit) {
      outfit.like_count += 1;
      store.outfits.set(outfit.id, outfit);
      await putJsonDocument(env, outfit.storage_key, outfit);
      await addPoints(env, outfit.user_id, "social", id, POINTS.liked, "liked");
    }
  }

  if (body.target_type === "outfit" && body.action === "collect") {
    const outfit = store.outfits.get(body.target_id) || await findDocumentById(env, "outfits", body.target_id);
    if (outfit) {
      outfit.collection_count += 1;
      store.outfits.set(outfit.id, outfit);
      await putJsonDocument(env, outfit.storage_key, outfit);
      await addPoints(env, outfit.user_id, "social", id, POINTS.collected, "collected");
    }
  }

  if (body.target_type === "product" && body.action === "conversion") {
    const product = store.products.get(body.target_id) || await findDocumentById(env, "products", body.target_id);
    if (product) {
      product.conversion_count += 1;
      store.products.set(product.id, product);
      await putJsonDocument(env, product.storage_key, product);
      await addPoints(env, body.user_id, "social", id, POINTS.conversion, "conversion");
    }
  }

  return json({ id, status: "recorded" }, 201);
}

async function getUserPoints(env, userId) {
  const documents = await listDocumentsForOwnerCategory(env, userId, "points");
  const source = documents.length > 0 ? documents : store.points.filter((point) => point.user_id === userId);
  const total = source.reduce((sum, point) => sum + Number(point.points || 0), 0);
  return json({ user_id: userId, total, entries: source.slice(0, 100), storage_mode: "wasabi-document" });
}

async function getAmbassadorEligibility(env, userId) {
  const [outfits, socialActions] = await Promise.all([
    listDocumentsForOwnerCategory(env, userId, "outfits"),
    listDocumentsByCategory(env, "social")
  ]);
  const userOutfits = outfits.length > 0 ? outfits : [...store.outfits.values()].filter((outfit) => outfit.user_id === userId);
  const approvedOutfits = userOutfits.filter((outfit) => outfit.review_status === "approved");
  const collections = userOutfits.reduce((sum, outfit) => sum + Number(outfit.collection_count || 0), 0);
  const conversions = socialActions.filter((action) => action.user_id === userId && action.action === "conversion").length;
  const thresholds = {
    approved_posts: 20,
    collections: 500,
    conversions: 50
  };
  return json({
    user_id: userId,
    eligible: approvedOutfits.length > thresholds.approved_posts && collections > thresholds.collections && conversions > thresholds.conversions,
    current: {
      approved_posts: approvedOutfits.length,
      collections,
      conversions
    },
    thresholds,
    storage_mode: "wasabi-document"
  });
}

async function getAdminOverview(env) {
  const [products, avatars, tryons, outfits] = await Promise.all([
    listDocumentsByCategory(env, "products"),
    listDocumentsByCategory(env, "members"),
    listDocumentsByCategory(env, "tryons"),
    listDocumentsByCategory(env, "outfits")
  ]);
  const overview = {
    products: products.length || store.products.size,
    avatars: avatars.length || store.avatars.size,
    tryons: tryons.length || store.tryons.size,
    outfits: outfits.length || store.outfits.size,
    pending_reviews: (outfits.length ? outfits : [...store.outfits.values()]).filter((outfit) => outfit.review_status === "pending").length,
    storage_mode: "wasabi-document"
  };

  return json({ overview });
}

async function runTryonProvider(env, input) {
  if ((env.AI_PROVIDER || "stub") !== "stub") {
    throw new Error("Configured AI provider is not implemented yet");
  }

  return {
    provider: "stub",
    provider_job_id: `stub_${input.jobId}`,
    result_image_url: `/demo/tryon-result-${input.productId}.jpg`,
    face_similarity_score: 0.92,
    retry_count: 0
  };
}

function getStorageLocation(env) {
  const basePrefix = normalizePrefix(env.WASABI_BASE_PREFIX || "tonyuse/mycloset");
  return {
    provider: env.STORAGE_PROVIDER || "wasabi",
    bucket: env.WASABI_BUCKET || "tonyuse",
    region: env.WASABI_REGION || "us-west-1",
    endpoint: env.WASABI_ENDPOINT || "https://s3.us-west-1.wasabisys.com",
    base_prefix: basePrefix,
    allowed_prefix: normalizePrefix(env.WASABI_ALLOWED_PREFIX || basePrefix),
    force_path_style: env.WASABI_FORCE_PATH_STYLE !== "false",
    public_url_format: env.WASABI_PUBLIC_URL_FORMAT || "https://tonyuse.s3.us-west-1.wasabisys.com/{object_key}",
    allowed_extensions: splitCsv(env.WASABI_ALLOWED_EXTENSIONS || "jpg,jpeg,png,webp,pdf,csv,xlsx"),
    blocked_extensions: splitCsv(env.WASABI_BLOCKED_EXTENSIONS || "php,js,exe,sh,bat,html"),
    max_image_bytes: Number(env.WASABI_MAX_IMAGE_BYTES || 5242880),
    max_document_bytes: Number(env.WASABI_MAX_DOCUMENT_BYTES || 20971520),
    presigned_expires_seconds: Number(env.WASABI_PRESIGNED_EXPIRES_SECONDS || 600),
    folders: {
      products: `${basePrefix}shops/{shop_id}/products/{yyyy}/{mm}/`,
      members: `${basePrefix}shops/{shop_id}/members/{yyyy}/{mm}/`,
      tryons: `${basePrefix}shops/{shop_id}/tryons/{yyyy}/{mm}/`,
      outfits: `${basePrefix}shops/{shop_id}/outfits/{yyyy}/{mm}/`,
      reports: `${basePrefix}shops/{shop_id}/reports/{yyyy}/{mm}/`,
      line: `${basePrefix}shops/{shop_id}/line/{yyyy}/{mm}/`,
      temp: `${basePrefix}shops/{shop_id}/temp/{yyyy}/{mm}/`
    }
  };
}

function getIntegrationParams(env) {
  return {
    public_base_url: env.PUBLIC_BASE_URL || "https://mycloset.fangwl591021.workers.dev",
    openai: {
      base_url: env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      text_model: env.OPENAI_TEXT_MODEL || "gpt-5-mini",
      image_model: env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
      api_key_secret: "OPENAI_API_KEY",
      intended_uses: [
        "AI outfit advisor",
        "AI stylist text recommendations",
        "product copy and style tags",
        "future image workflow adapter"
      ]
    },
    storage: getStorageLocation(env),
    line: {
      webhook_path: env.LINE_WEBHOOK_PATH || "/line/webhook",
      webhook_url: env.LINE_WEBHOOK_URL || `${env.PUBLIC_BASE_URL || "https://mycloset.fangwl591021.workers.dev"}/line/webhook`,
      liff_url: env.LINE_LIFF_URL || env.PUBLIC_BASE_URL || "https://mycloset.fangwl591021.workers.dev/",
      liff_id: env.LINE_LIFF_ID || "",
      login_required: env.LINE_LOGIN_REQUIRED === "true",
      reply_enabled: env.LINE_REPLY_ENABLED !== "false",
      signature_secret_configured: Boolean(env.LINE_CHANNEL_SECRET),
      access_token_configured: Boolean(env.LINE_CHANNEL_ACCESS_TOKEN),
      secrets_required: [
        "LINE_CHANNEL_SECRET",
        "LINE_CHANNEL_ACCESS_TOKEN"
      ]
    },
    secrets_required: [
      "WASABI_ACCESS_KEY_ID",
      "WASABI_SECRET_ACCESS_KEY",
      "LINE_CHANNEL_SECRET",
      "LINE_CHANNEL_ACCESS_TOKEN",
      "OPENAI_API_KEY",
      "ADMIN_API_TOKEN"
    ]
  };
}

function getPublicConfig(env) {
  return {
    public_base_url: env.PUBLIC_BASE_URL || "https://mycloset.fangwl591021.workers.dev",
    line: {
      liff_id: env.LINE_LIFF_ID || "",
      liff_url: env.LINE_LIFF_URL || env.PUBLIC_BASE_URL || "https://mycloset.fangwl591021.workers.dev/",
      login_required: env.LINE_LOGIN_REQUIRED === "true"
    }
  };
}

async function handleLineWebhook(request, env) {
  if (request.method === "GET") {
    return json({
      ok: true,
      webhook_url: env.LINE_WEBHOOK_URL || `${env.PUBLIC_BASE_URL || "https://mycloset.fangwl591021.workers.dev"}/line/webhook`,
      signature_verification: Boolean(env.LINE_CHANNEL_SECRET),
      reply_enabled: env.LINE_REPLY_ENABLED !== "false"
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const rawBody = await request.text();
  if (env.LINE_CHANNEL_SECRET) {
    const valid = await verifyLineSignature(rawBody, request.headers.get("x-line-signature"), env.LINE_CHANNEL_SECRET);
    if (!valid) {
      return json({ error: "Invalid LINE signature" }, 401);
    }
  }

  const payload = JSON.parse(rawBody || "{}");
  const events = Array.isArray(payload.events) ? payload.events : [];

  for (const event of events) {
    await recordLineEvent(env, event);
    if (shouldReplyLineEvent(env, event)) {
      await replyLineMessage(env, event.replyToken, buildLineReplyText(env, event));
    }
  }

  return json({ ok: true, received: events.length });
}

async function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = bytesToBase64(new Uint8Array(digest));
  return timingSafeEqual(expected, signature);
}

async function recordLineEvent(env, event) {
  const lineEvent = {
    id: crypto.randomUUID(),
    line_event_type: event.type || "unknown",
    line_user_id: event.source?.userId || null,
    reply_token: event.replyToken || null,
    payload: event,
    storage_key: buildDocumentKey(env, event.source?.userId || "unknown", "line", `${Date.now()}-${crypto.randomUUID()}.json`),
    created_at: new Date().toISOString()
  };
  store.lineEvents.push(lineEvent);
  await putJsonDocument(env, lineEvent.storage_key, lineEvent);
}

function shouldReplyLineEvent(env, event) {
  return env.LINE_REPLY_ENABLED !== "false" && Boolean(env.LINE_CHANNEL_ACCESS_TOKEN) && Boolean(event.replyToken);
}

function buildLineReplyText(env, event) {
  const liffUrl = env.LINE_LIFF_URL || env.PUBLIC_BASE_URL || "https://mycloset.fangwl591021.workers.dev/";
  if (event.type === "follow") {
    return `${env.LINE_WELCOME_TEXT || "歡迎使用 My Closet AI。"}\n${liffUrl}`;
  }
  if (event.type === "message" && event.message?.type === "text") {
    return `My Closet AI 真人虛擬試穿入口：\n${liffUrl}`;
  }
  return `My Closet AI：\n${liffUrl}`;
}

async function replyLineMessage(env, replyToken, text) {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`LINE reply failed: ${response.status}`);
  }
}

async function addPoints(env, userId, sourceType, sourceId, points, reason) {
  const pointRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId,
    points,
    reason,
    storage_key: buildDocumentKey(env, userId, "points", `${Date.now()}-${crypto.randomUUID()}.json`),
    created_at: new Date().toISOString()
  };
  store.points.push(pointRecord);
  await putJsonDocument(env, pointRecord.storage_key, pointRecord);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function requireFields(body, fields) {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

function requireAdmin(request, env) {
  if (!env.ADMIN_API_TOKEN) {
    throw new Error("ADMIN_API_TOKEN is not configured");
  }
  const authorization = request.headers.get("authorization") || "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const headerToken = request.headers.get("x-admin-token") || "";
  const token = bearerToken || headerToken;
  if (!token || !timingSafeEqual(token, env.ADMIN_API_TOKEN)) {
    const error = new Error("Admin authorization required");
    error.status = 401;
    throw error;
  }
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  return Number(value);
}

function normalizePrefix(prefix) {
  return prefix.replace(/^\/+/, "").replace(/\/?$/, "/");
}

function buildDocumentKey(env, ownerId, category, filename) {
  const basePrefix = normalizePrefix(env.WASABI_ALLOWED_PREFIX || env.WASABI_BASE_PREFIX || "tonyuse/mycloset");
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${basePrefix}shops/${ownerId}/${category}/${yyyy}/${mm}/${filename}`;
}

function buildStorageObjectKey(env, ownerId, category, filename) {
  return buildDocumentKey(env, ownerId, category, filename);
}

function assertAllowedStorageKey(env, key) {
  const allowedPrefix = normalizePrefix(env.WASABI_ALLOWED_PREFIX || env.WASABI_BASE_PREFIX || "tonyuse/mycloset");
  if (!key.startsWith(allowedPrefix)) {
    const error = new Error("Object key is outside allowed prefix");
    error.status = 400;
    throw error;
  }
}

async function putJsonDocument(env, key, document) {
  if (!hasWasabiSecrets(env)) return { skipped: true, reason: "missing_wasabi_secrets" };
  const body = JSON.stringify(document, null, 2);
  const response = await wasabiRequest(env, "PUT", key, {
    body,
    contentType: "application/json; charset=utf-8"
  });
  if (!response.ok) {
    throw new Error(`Wasabi PutObject failed: ${response.status}`);
  }
  return { ok: true, key };
}

async function getJsonDocument(env, key) {
  if (!hasWasabiSecrets(env)) return null;
  const response = await wasabiRequest(env, "GET", key);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Wasabi GetObject failed: ${response.status}`);
  }
  return response.json();
}

async function listDocumentsByCategory(env, category) {
  if (!hasWasabiSecrets(env)) return [];
  const basePrefix = normalizePrefix(env.WASABI_ALLOWED_PREFIX || env.WASABI_BASE_PREFIX || "tonyuse/mycloset");
  const keys = await listWasabiKeys(env, basePrefix);
  const categoryKeys = keys
    .filter((key) => key.includes(`/${category}/`) && key.endsWith(".json"))
    .slice(0, 100);
  const documents = await Promise.all(categoryKeys.map((key) => getJsonDocument(env, key).catch(() => null)));
  return documents.filter(Boolean);
}

async function listDocumentsForOwnerCategory(env, ownerId, category) {
  if (!hasWasabiSecrets(env)) return [];
  const basePrefix = normalizePrefix(env.WASABI_ALLOWED_PREFIX || env.WASABI_BASE_PREFIX || "tonyuse/mycloset");
  const prefix = `${basePrefix}shops/${ownerId}/${category}/`;
  const keys = await listWasabiKeys(env, prefix);
  const documents = await Promise.all(keys.filter((key) => key.endsWith(".json")).map((key) => getJsonDocument(env, key).catch(() => null)));
  return documents.filter(Boolean);
}

async function findDocumentById(env, category, id) {
  const documents = await listDocumentsByCategory(env, category);
  return documents.find((document) => document.id === id) || null;
}

async function listWasabiKeys(env, prefix) {
  const response = await wasabiRequest(env, "GET", "", {
    query: {
      "list-type": "2",
      prefix,
      "max-keys": "1000"
    }
  });
  if (!response.ok) {
    throw new Error(`Wasabi ListObjectsV2 failed: ${response.status}`);
  }
  const xml = await response.text();
  return [...xml.matchAll(/<Key>(.*?)<\/Key>/g)].map((match) => decodeXml(match[1]));
}

async function wasabiRequest(env, method, key, options = {}) {
  const body = options.body || "";
  const contentType = options.contentType || "";
  const query = options.query || {};
  const endpoint = new URL(env.WASABI_ENDPOINT || "https://s3.us-west-1.wasabisys.com");
  const bucket = env.WASABI_BUCKET || "tonyuse";
  const region = env.WASABI_REGION || "us-west-1";
  const forcePathStyle = env.WASABI_FORCE_PATH_STYLE !== "false";
  const canonicalUri = forcePathStyle ? `/${bucket}${key ? `/${encodePath(key)}` : ""}` : `/${encodePath(key)}`;
  const canonicalQuery = canonicalizeQuery(query);
  const url = `${endpoint.origin}${canonicalUri}${canonicalQuery ? `?${canonicalQuery}` : ""}`;
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);

  const canonicalHeadersMap = {
    host: endpoint.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate
  };

  if (contentType) {
    canonicalHeadersMap["content-type"] = contentType;
  }

  const signedHeaderNames = Object.keys(canonicalHeadersMap).sort();
  const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${canonicalHeadersMap[name]}\n`).join("");
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join("\n");
  const signingKey = await getSignatureKey(env.WASABI_SECRET_ACCESS_KEY, dateStamp, region, "s3");
  const signature = await hmacHex(signingKey, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${env.WASABI_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = {
    authorization,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate
  };
  if (contentType) {
    headers["content-type"] = contentType;
  }

  return fetch(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : body
  });
}

async function createWasabiPresignedUrl(env, method, key, expiresSeconds) {
  if (!hasWasabiSecrets(env)) {
    throw new Error("Wasabi secrets are not configured");
  }
  const endpoint = new URL(env.WASABI_ENDPOINT || "https://s3.us-west-1.wasabisys.com");
  const bucket = env.WASABI_BUCKET || "tonyuse";
  const region = env.WASABI_REGION || "us-west-1";
  const forcePathStyle = env.WASABI_FORCE_PATH_STYLE !== "false";
  const canonicalUri = forcePathStyle ? `/${bucket}/${encodePath(key)}` : `/${encodePath(key)}`;
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const query = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${env.WASABI_ACCESS_KEY_ID}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host"
  };
  const canonicalQuery = canonicalizeQuery(query);
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    `host:${endpoint.host}\n`,
    "host",
    "UNSIGNED-PAYLOAD"
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join("\n");
  const signingKey = await getSignatureKey(env.WASABI_SECRET_ACCESS_KEY, dateStamp, region, "s3");
  const signature = await hmacHex(signingKey, stringToSign);
  return `${endpoint.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function splitCsv(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function sanitizeFilename(filename) {
  const clean = String(filename).split(/[\\/]/).pop().replace(/[^A-Za-z0-9._-]/g, "-");
  if (!clean || !clean.includes(".")) {
    const error = new Error("filename must include a safe extension");
    error.status = 400;
    throw error;
  }
  return clean;
}

function guessContentType(extension) {
  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    pdf: "application/pdf",
    csv: "text/csv; charset=utf-8",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
  return types[extension] || "application/octet-stream";
}

function hasWasabiSecrets(env) {
  return Boolean(env.WASABI_ACCESS_KEY_ID && env.WASABI_SECRET_ACCESS_KEY);
}

function canonicalizeQuery(query) {
  return Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");
}

function encodePath(path) {
  return path.split("/").map((part) => encodeRfc3986(part)).join("/");
}

function encodeRfc3986(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

async function sha256Hex(value) {
  const data = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

async function hmacBytes(key, value) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key instanceof Uint8Array ? key : new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
  return new Uint8Array(signature);
}

async function hmacHex(key, value) {
  return bytesToHex(await hmacBytes(key, value));
}

async function getSignatureKey(secret, dateStamp, regionName, serviceName) {
  const kDate = await hmacBytes(`AWS4${secret}`, dateStamp);
  const kRegion = await hmacBytes(kDate, regionName);
  const kService = await hmacBytes(kRegion, serviceName);
  return hmacBytes(kService, "aws4_request");
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decodeXml(value) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'");
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: JSON_HEADERS
  });
}
