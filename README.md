# My Closet AI

AI 真人虛擬試穿 SaaS 平台。第一版聚焦在可驗證的 Worker MVP：會員建立 Avatar、商品管理、AI 試穿任務、穿搭投稿、Model 審核、社群互動與 SaaS 店家後台基礎 API。

## Product Position

My Closet AI serves fashion brands, clothing stores, livestream sellers, group-buy hosts, and ecommerce teams. The goal is to let customers try products on their own photo before purchasing, increasing conversion while lowering return risk.

Tagline:

> 讓顧客先穿，再下單。

## MVP Scope

- LINE or email identity placeholder
- Personal avatar profile and required photo checklist
- Product catalog by merchant
- Try-on job API with replaceable AI provider adapter
- Face-lock policy and similarity threshold fields
- Outfit submission workflow
- Platform Model review workflow
- Social actions: like, collect, follow, share
- Point ledger
- SaaS plans and usage counters

## Stack

- Frontend: static LIFF-ready UI in `public/`
- Backend: Cloudflare Worker in `src/worker.js`
- Database: Cloudflare D1, schema in `schema.sql`
- Storage: Wasabi S3-compatible object storage for photos and generated try-on images
- AI: replaceable provider adapter under `/api/tryons`

## Local Files

- `docs/product-spec.md`: Version 1.0 product spec
- `docs/mvp-roadmap.md`: implementation roadmap
- `schema.sql`: D1 table definitions
- `src/worker.js`: Worker API and static asset routing
- `public/index.html`: operator/demo UI

## API Routes

- `GET /api/health`
- `GET /api/storage/location`
- `GET /api/products`
- `POST /api/products`
- `GET /api/avatars/:userId`
- `POST /api/avatars`
- `POST /api/tryons`
- `GET /api/tryons/:id`
- `POST /api/outfits`
- `POST /api/outfits/:id/review`
- `POST /api/social`
- `GET /api/admin/overview`

## Deploy Notes

1. Create D1 database and update `wrangler.toml`.
2. Configure Wasabi secrets with `wrangler secret put WASABI_ACCESS_KEY_ID` and `wrangler secret put WASABI_SECRET_ACCESS_KEY`.
3. Run `wrangler d1 execute my-closet-ai-db --file schema.sql`.
4. Optional demo data: `wrangler d1 execute my-closet-ai-db --file seed.sql`.
5. Deploy with `wrangler deploy`.

The current AI provider is a stub so the workflow can be tested before choosing OpenAI Image, FASHN API, Genlook Try-On API, another commercial API, or a self-hosted VITON model.

## Storage Location

- GitHub repo: `fangwl591021/mycloset`
- Worker URL: `https://mycloset.fangwl591021.workers.dev/`
- Object storage provider: Wasabi
- Bucket: `tonyuse`
- Region: `us-west-1`
- Endpoint: `https://s3.us-west-1.wasabisys.com`
- Base prefix: `tonyuse/mycloset/`

Do not commit Wasabi access keys or secret keys. They must be stored as Cloudflare Worker secrets only.
