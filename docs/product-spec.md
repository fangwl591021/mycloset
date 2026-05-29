# My Closet AI Product Spec

Version 1.0

Project type: AI Virtual Try-On Platform, Fashion Social Commerce, SaaS

## Positioning

My Closet AI is an AI real-person virtual try-on system for fashion brands, clothing stores, livestream sellers, group-buy sellers, and ecommerce platforms.

Core goals:

- Increase conversion rate
- Reduce returns
- Increase session time
- Build an outfit community
- Build a platform model ecosystem

## Core Concept

After users upload their own photos, the system can naturally apply products to the user's body:

- Tops
- Jackets
- Pants
- Dresses
- Shoes
- Accessories

Identity preservation is mandatory. The system must preserve the user's face shape, facial features, hairstyle, and skin tone. It may only modify clothing and accessory regions.

## Roles

### Member

- Create personal model
- AI try-on
- Save outfits
- Submit outfits

### Platform Model

Requires review.

- Public outfits
- Collects
- Followers
- Outfit display

### Fashion Ambassador

Advanced creator tier.

Upgrade conditions:

- Submitted outfits reach threshold
- Collect count reaches threshold
- Conversion count reaches threshold

Privileges:

- Revenue share
- Brand collaboration
- Official badge

### Merchant

- Product listing
- Product management
- AI try-on service
- Order routing

### Admin

- Model review
- Product review
- Content review
- Backoffice management

## Member Setup Flow

1. Login with LINE Login or email.
2. Create a personal model by uploading required photos:
   - Required checklist confirmation
   - Front view
   - Left 45-degree view
   - Right 45-degree view
   - Full body
3. Build avatar profile:

```json
{
  "face_id": "uuid",
  "body_type": "normal",
  "skin_tone": "warm",
  "hair_style": "short"
}
```

Derived body attributes:

- Body ratio
- Body contour
- Shoulder width
- Waist line
- Leg length

## AI Try-On Flow

Input:

```json
{
  "user_avatar": "avatar_id",
  "cloth_id": "cloth_id"
}
```

Output:

```json
{
  "result_image": "url"
}
```

The Worker records the request as a try-on job, calls the configured AI provider, then runs or records face-similarity validation.

## Face Lock System

The AI is forbidden from rebuilding the full face. The face, hairstyle, and facial features must be preserved. Only clothing and accessory regions may be modified.

After generation, a face similarity check is required. If the score is below 80%, the job must be regenerated or rejected.

## Product System

Product fields:

```json
{
  "id": "cloth001",
  "name": "商務西裝外套",
  "brand": "BrandA",
  "category": "jacket",
  "color": "navy",
  "price": 3990
}
```

Categories:

- 上衣
- 外套
- 長褲
- 短褲
- 洋裝
- 鞋子
- 包包
- 配件

## Outfit Submission

Users can submit generated try-on results.

```json
{
  "user_id": "xxx",
  "image": "url",
  "style": "business",
  "description": "商務休閒風"
}
```

Review flow:

1. AI pre-review checks face clarity, complete clothing, image quality, and unsafe content.
2. Human review marks the submission as `pending`, `approved`, or `rejected`.
3. Approved users may receive `My Closet Model` qualification.

## Community

- Likes
- Collections
- Shares
- Follows
- Outfit wall

Feeds:

- 熱門
- 最新
- 商務
- 約會
- 街頭
- 韓系
- 日系

## Fashion Ambassador

Upgrade thresholds:

- Posts greater than 20
- Collections greater than 500
- Conversions greater than 50

Benefits:

- Brand collaboration
- Revenue share
- Official badge

## Points

| Action | Points |
| --- | ---: |
| Submit outfit | 10 |
| Approved review | 50 |
| Collected by another user | 5 |
| Liked by another user | 1 |
| Conversion | 100 |

## Merchant Backoffice

- Product management
- Add product
- Edit product
- Unlist product
- Try-on statistics
- Collection statistics
- Conversion statistics
- Invite platform models for exposure

## SaaS Plans

| Plan | Price | Limits |
| --- | ---: | --- |
| Basic | NT$1999/month | 100 products, 1000 try-ons |
| Pro | NT$4999/month | 1000 products, 10000 try-ons |
| Enterprise | NT$9999/month | Unlimited, API access |

## LINE OA Integration

Flow:

1. Add LINE OA
2. Create personal model
3. Choose product
4. AI try-on
5. Share outfit
6. Route to purchase

## Future Expansion

Phase 2:

- AI outfit advisor
- AI stylist
- Weather outfit recommendation
- Business outfit recommendation

Phase 3:

- AI livestream commerce
- AI model video generation
- AI outfit short videos
- AI avatar
