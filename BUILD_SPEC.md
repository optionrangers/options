# Option Rangers — Build Specification for Antigravity

> **How to use this file:** Put this file at the root of a new, empty GitHub repo together with `reference/option-rangers-design.html`. In Antigravity, open the repo and give the agent this instruction:
>
> *"Read BUILD_SPEC.md and reference/option-rangers-design.html completely. Build the project exactly as specified, phase by phase. After each phase, run `npm run build` and `npm run lint` and fix all errors before moving on. Do not invent business details, registration numbers, testimonials or performance figures. Ask me before changing anything marked LOCKED."*

---

## 0. Project summary

| Item | Value |
|---|---|
| Brand | Option Rangers |
| Tagline | Trade se pehle, research zaroori hai. |
| What it is | Risk-first options market research and education website (India, NSE F&O) |
| Audience | Retail Indian options traders, mostly on mobile, Hinglish-comfortable |
| Goal of site | Explain the service, show plans, collect leads, take subscription payments via Cashfree **only after compliance is cleared** |
| Hosting | Vercel (connected to GitHub, auto-deploy) |
| Payments | Cashfree Payment Gateway (PG), API version `2026-01-01` |
| Code repo | GitHub (`main` = production, every PR = Vercel preview) |

### LOCKED rules (never break these)
1. **No invented facts.** No fake testimonials, win rates, returns, client counts, profit screenshots, registration numbers, addresses or officer names. Use the placeholder values from config until the owner fills real ones.
2. **No profit guarantees** anywhere in copy, metadata, emails or ads. Banned words: guaranteed, sure shot, jackpot, fixed returns, 100% accuracy, risk-free, confirmed profit, multibagger.
3. **Payments are OFF by default.** A server-side flag `PAYMENTS_ENABLED` must be `"true"` for any order to be created. When off, plan buttons show "Payment not active yet" and the API returns 403.
4. **Never collect** broker/demat logins, OTPs, trading passwords, or card numbers. Card/UPI data is only entered on Cashfree's checkout.
5. **Secrets stay server-side.** `CASHFREE_CLIENT_SECRET` must never appear in client code or `NEXT_PUBLIC_*` variables.
6. A risk disclaimer appears in the footer of every page and on the checkout page.

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | First-class on Vercel; server routes for Cashfree |
| Styling | **Tailwind CSS v4** with CSS variables from the design tokens below | Matches the reference design, fast to build |
| Database | **Neon Postgres** (add via Vercel Marketplace → Neon) | Free tier, env vars injected into Vercel automatically |
| ORM | **Drizzle ORM** + `drizzle-kit` migrations | Lightweight, typed |
| Validation | **Zod** | Validate every form and API body |
| Email | **Resend** (transactional: lead checklist, contact receipt, payment receipt) | Simple API, works on Vercel |
| Payments | **Cashfree PG**: server REST API + `@cashfreepayments/cashfree-js` (JS SDK v3) on the client | Official SDK |
| Rate limiting | `@upstash/ratelimit` + Upstash Redis (Vercel Marketplace) | Protect forms and order API |
| Bot protection | Cloudflare Turnstile on lead + contact forms (optional but recommended) | Free |
| Analytics | `@vercel/analytics` | Zero-config |
| Fonts | `next/font/google`: Quicksand (500/600/700), Inter (400/500/600/700), JetBrains Mono (500/600) | Matches design |

Node version: 20 LTS. Package manager: npm.

---

## 2. Design system (copy from the reference file)

The reference file `reference/option-rangers-design.html` is the approved visual design. Recreate it pixel-close in React components. Single light theme only (white background). Do **not** add coloured top strips on cards.

### Tokens (put in `app/globals.css` as CSS variables and map in Tailwind theme)
```css
:root{
  --red-800:#8F1729; --red-700:#A91E30; --red-600:#C51F32; --red-500:#E23744;
  --red-soft:#FFF5F6; --red-tint:#FFE4E8; --red-line:#F5D6DA;
  --bg:#FFFFFF; --surface:#FFFFFF; --surface-2:#FAFAFB;
  --fg:#15181E; --ink:#20242B; --ink-2:#3F4652; --muted:#667085; --faint:#8B94A3;
  --line:#F4E3E6; --line-soft:#EEF0F2;
  --teal:#0E9E86; --teal-ink:#127A62; --teal-soft:#E8F8F3;
  --amber-ink:#8A6116; --amber-soft:#FFF7E8;
  --shadow-sm:0 2px 8px rgba(23,16,20,.05),0 1px 2px rgba(23,16,20,.04);
  --shadow-md:0 14px 34px -16px rgba(23,16,20,.24);
  --shadow-red:0 14px 34px -14px rgba(197,31,50,.45);
}
```
- Display font: Quicksand 700, tight letter-spacing (-0.035em to -0.05em) for headings.
- Body: Inter 15px / 1.65.
- Numbers (strikes, prices in charts): JetBrains Mono with `tabular-nums`. Prices on plan cards use Quicksand 700.
- Primary button: gradient `135deg, #C51F32 → #8F1729`, white text, radius 12px, `--shadow-red`.
- Outline button: white bg, `--red-700` text, `--red-line` border.
- Cards: white, 1px `--line-soft` border, radius 18–20px, `--shadow-sm`.
- Kicker pill: uppercase 10.5px, letter-spacing .17em, `--red-soft` bg, `--red-line` border.
- Section rhythm: every homepage section has **56px** vertical padding on desktop, **36px** on phones, separated by a 1px `--line-soft` top border. Content max-width 1200px, side gutter 16px minimum.

### Mobile requirements (most users are on phones)
- Test at 360px, 390px and 430px widths. **No horizontal scroll on any page.**
- Hero H1 40px on phones, 62px max on desktop. Hero buttons stack full-width on phones.
- Header: logo left, "Menu" button right below 860px; menu opens as full-width list, tap targets ≥ 44px.
- Form inputs use 16px font (prevents iOS zoom).
- Testimonial cards become a horizontal swipe row on phones (scroll-snap), contained so the page never widens.
- Lighthouse mobile targets: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.

---

## 3. Site map and routes

| Route | Type | Content source |
|---|---|---|
| `/` | Static | Home (see §4) |
| `/about` | Static | About |
| `/plans` | Static + client | Plans & fees, checkout entry |
| `/track-record` | Static | Track record (no figures) |
| `/faq` | Static | FAQ |
| `/contact` | Static + form | Contact form + support details |
| `/legal/risk-disclosure` | Static | Risk disclosure |
| `/legal/terms` | Static | Terms & conditions |
| `/legal/refund` | Static | Refund & cancellation |
| `/legal/privacy` | Static | Privacy policy |
| `/checkout/[plan]` | Client | Checkout form (only when payments enabled) |
| `/payment/status` | Server | Payment result page (reads `order_id` query) |
| `/api/leads` | POST | Save lead, send checklist email |
| `/api/contact` | POST | Save message, send receipt + notify owner |
| `/api/orders` | POST | Create Cashfree order |
| `/api/orders/[orderId]` | GET | Server-verified order status |
| `/api/webhooks/cashfree` | POST | Cashfree payment webhooks |
| `/admin` | Protected | Simple table of leads, messages, orders (basic-auth via env) |
| `/sitemap.xml`, `/robots.txt` | Generated | `app/sitemap.ts`, `app/robots.ts` |

Use real routes (not hash tabs like the prototype). Shared `<Header>`, `<Footer>`, `<PreviewBanner>` in `app/layout.tsx`.

**PreviewBanner:** amber bar at the top, text "Preview only · payments and live research not active". Shown when `NEXT_PUBLIC_SITE_MODE=preview`. Hidden when `live`.

---

## 4. Page content

All copy lives in `content/*.ts` files (not hard-coded in components) so the owner can edit text without touching layout.

### 4.1 Home (`/`) — keep it short, in this order only
1. **Hero** (two columns desktop, stacked phone)
   - Eyebrow: OPTIONS RESEARCH & EDUCATION
   - H1: "Trade se pehle, **research zaroori hai.**" (second line in `--red-600`)
   - Sub: "Market analysis, trade ka logic aur risk, simple language mein. We explain market context and risk without hype. We do not promise profits."
   - Buttons: "Explore our plans →" (→ `/plans`), "Read risk disclosure" (→ `/legal/risk-disclosure`)
   - Note: "No profit is guaranteed. Option buyers can lose the entire premium."
   - Right: **Payoff card** — inline SVG long-call payoff at expiry. Buy 24,500 CE at ₹120. Max loss ₹120, breakeven 24,620, profit "Not guaranteed". Loss zone light red, profit zone light teal, dashed zero line, breakeven dot. Caption: "Payoff at expiry. Before expiry, theta decay reduces the premium every day. Illustrative only; not a trading signal. Excludes costs and taxes." Build it as a reusable `<PayoffChart strike premium />` component that computes points from props.
2. **Three things to check, every time** — 3 cards (Direction & momentum / Time & theta / Strike & risk) + Do & Don't two-column cards (5 bullets each, text in reference file).
3. **Proposed plans** — the two plan cards (§5) + small disclaimer line.
4. **Testimonials** — 3 cards rendering from `content/testimonials.ts`. While the array is empty, show dashed placeholder cards reading "Verified client quote / Client name / City · client since [month]" **only in preview mode**; in live mode, hide the section entirely if empty. Each testimonial object must include `consentOnFile: true` or it is not rendered. (Owner must confirm with compliance whether testimonials are permitted under SEBI's advertisement rules before adding any.)
5. **Free Option Buyer Risk Checklist** — left: title, 3 bullets; right: Name + Email form → `/api/leads`.
6. **Quick answers** — 3 accordion items.

### 4.2 Other pages
Copy every page's text from the reference file: About ("Clarity over certainty."), Plans & fees ("Know the full price before you decide." + "Before you subscribe, confirm" checklist + planned-prices notice), Track record ("See the facts, not just the claims." + no-figures notice + 6-point list), FAQ (8 Q&As), Contact (form + support details table), Legal (4 policies; render from MDX files in `content/legal/*.mdx` with a yellow "Draft — awaiting professional review" notice until `LEGAL_REVIEWED=true`).

### 4.3 Business details config — `content/site.ts`
```ts
export const site = {
  name: "Option Rangers",
  legalEntity: null as string | null,         // e.g. "XYZ Research Pvt Ltd"
  sebiRaNumber: null as string | null,        // e.g. "INH000000000"
  principalOfficer: null as string | null,
  complianceOfficer: null as string | null,
  grievanceOfficer: { name: null, email: null, phone: null },
  supportEmail: null as string | null,
  supportPhone: null as string | null,
  address: null as string | null,
  supportHours: null as string | null,
  social: { instagram: null, youtube: null, telegram: null, x: null, linkedin: null },
};
```
Every `null` renders as an amber "pending" chip in preview mode. **Build-time check:** if `NEXT_PUBLIC_SITE_MODE=live` and any of `legalEntity`, `sebiRaNumber`, `supportEmail`, `grievanceOfficer.email`, `address` is null, fail the build with a clear error.

---

## 5. Plans

`content/plans.ts`:
```ts
export const plans = [
  {
    id: "weekly", name: "Weekly Research", priceInr: 3999, durationDays: 7,
    desc: "Try the research process for one week.",
    features: ["Daily market context note", "Risk notes with invalidation level", "Option basics learning material", "Email support"],
    featured: false,
  },
  {
    id: "monthly", name: "Monthly Research", priceInr: 14999, durationDays: 30,
    desc: "For traders who want a full month of context and risk notes.",
    features: ["Everything in Weekly", "Weekly market review", "Live Q&A session every week", "Priority email support"],
    featured: true, badge: "Lower cost per day",
  },
] as const;
export const PRICES_INCLUDE_GST = true; // OWNER TO CONFIRM
```
Features above are **examples — owner must replace with actual scope**.

Plan card layout: name + "Proposed" pill (preview mode only) → description → big price "₹3,999" + "/ 7 days" → "About ₹571 per day · incl. GST" (computed, rounded) → divider → feature checklist → button. Featured card: 2px `--red-600` border + badge pill on top edge. Cards fixed max width 380px, centred, side by side on desktop, stacked on phone.

Button behaviour:
- Payments disabled → disabled outline button "Payment not active yet".
- Payments enabled → "Subscribe" → `/checkout/[planId]`.

**Server is the source of truth for price.** The client sends only `planId`; the server looks up the amount.

---

## 6. Database schema (Drizzle, `db/schema.ts`)

```ts
leads:        id uuid pk, name text, email text, source text default 'checklist',
              createdAt timestamptz default now(), emailSentAt timestamptz null
contacts:     id uuid pk, name, email, topic (enum: general|subscription|privacy|complaint|grievance),
              message text, status (enum: new|replied|closed) default 'new', createdAt
customers:    id uuid pk, name, email, phone (10-digit), pan text null, createdAt
              unique(email)
orders:       id uuid pk, orderId text unique  // our id sent to Cashfree, e.g. "OR_20261020_ab12cd"
              cfOrderId text null, customerId fk, planId text, amountInr numeric(10,2),
              status (enum: CREATED|ACTIVE|PAID|EXPIRED|FAILED|USER_DROPPED|CANCELLED) default 'CREATED',
              paymentSessionId text null, cfPaymentId text null, paymentMethod text null,
              termsAcceptedAt timestamptz not null, termsVersion text not null,
              riskAckAcceptedAt timestamptz not null, ip text null, userAgent text null,
              createdAt, paidAt null, updatedAt
subscriptions: id uuid pk, customerId fk, orderId fk unique, planId, startsAt, endsAt, createdAt
webhook_events: id uuid pk, eventType text, orderId text, signatureValid bool,
              payload jsonb, receivedAt, processedAt null
              unique(orderId, eventType, cfPaymentId)   // idempotency
```

---

## 7. Cashfree integration (detailed)

Docs: https://www.cashfree.com/docs/api-reference/payments/latest/orders/create

### 7.1 Environment
| Env | Base URL | Mode for JS SDK |
|---|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` | `"sandbox"` |
| Production | `https://api.cashfree.com/pg` | `"production"` |

Headers on every server call:
```
x-client-id: ${CASHFREE_CLIENT_ID}
x-client-secret: ${CASHFREE_CLIENT_SECRET}
x-api-version: 2026-01-01
x-request-id: <uuid>
x-idempotency-key: <uuid>   (on create order)
Content-Type: application/json
```
Put the API version in one constant `CASHFREE_API_VERSION` in `lib/cashfree.ts`.

### 7.2 Checkout page `/checkout/[plan]`
Form fields (Zod-validated):
- Full name (required)
- Email (required)
- Mobile (required, Indian 10-digit `^[6-9]\d{9}$`)
- PAN (optional, only if owner's compliance requires it; regex `^[A-Z]{5}[0-9]{4}[A-Z]$`)
- Checkbox (required): "I have read and agree to the Terms & Conditions and Refund policy." (links)
- Checkbox (required): "I understand options trading is risky, I may lose the entire premium, and no profit is guaranteed." (link to risk disclosure)
- Order summary box: plan name, duration, price, GST note.
- Button "Pay ₹14,999 securely" → disabled while submitting.
- Under button: "Payments are processed by Cashfree. We never see your card or UPI PIN."

### 7.3 `POST /api/orders` (server)
1. If `process.env.PAYMENTS_ENABLED !== "true"` → `403 { error: "Payments are not active yet." }`.
2. Rate-limit by IP (5 requests / 10 min).
3. Validate body `{ planId, name, email, phone, pan?, termsAccepted: true, riskAccepted: true }`.
4. Look up plan from `content/plans.ts`; unknown plan → 400.
5. Upsert customer by email.
6. Generate `orderId = "OR_" + yyyymmdd + "_" + nanoid(10)` (3–45 chars, letters/numbers/_/- only).
7. Insert `orders` row with status `CREATED`, terms + risk timestamps, `termsVersion` (from legal file frontmatter), IP, UA.
8. Call Cashfree:
```json
POST {BASE}/orders
{
  "order_id": "<orderId>",
  "order_amount": 14999,
  "order_currency": "INR",
  "customer_details": {
    "customer_id": "<customer uuid without dashes, max 50>",
    "customer_name": "<name>",
    "customer_email": "<email>",
    "customer_phone": "<10-digit>"
  },
  "order_meta": {
    "return_url": "https://<SITE_URL>/payment/status?order_id={order_id}",
    "notify_url": "https://<SITE_URL>/api/webhooks/cashfree"
  },
  "order_note": "Option Rangers - Monthly Research",
  "order_tags": { "plan_id": "monthly" }
}
```
9. Save `cf_order_id` and `payment_session_id` on the order. Return `{ orderId, paymentSessionId }` to the client. Never return secrets.
10. On Cashfree error → log full error server-side, return a generic message, keep order as `FAILED`.

### 7.4 Client checkout (JS SDK v3)
```ts
import { load } from "@cashfreepayments/cashfree-js";
const cashfree = await load({ mode: process.env.NEXT_PUBLIC_CASHFREE_MODE as "sandbox" | "production" });
await cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
```
Cashfree redirects back to `return_url` after success/failure/cancel.

### 7.5 `/payment/status?order_id=...`
- **Never trust the redirect alone.** Server component calls `GET {BASE}/orders/{order_id}` and reads `order_status`.
- `PAID` → mark order PAID (if webhook hasn't yet), create subscription (idempotent), show success: plan, amount, order id, "A receipt has been sent to your email."
- `ACTIVE` → "Payment pending. If money was deducted, it will update within a few minutes." + Refresh button.
- `EXPIRED` / failed → "Payment not completed. No money was taken, or any deduction will be reversed by your bank." + Try again button.
- Show support email from config on every state.

### 7.6 Webhook `POST /api/webhooks/cashfree`
- In Cashfree dashboard → Developers → Webhooks, add `https://<SITE_URL>/api/webhooks/cashfree` for **Payments** events (success, failed, user dropped). Use the latest webhook version.
- Read the **raw body** (`await req.text()`), do not parse first.
- Verify signature:
```ts
import crypto from "crypto";
const ts = req.headers.get("x-webhook-timestamp")!;
const sig = req.headers.get("x-webhook-signature")!;
const expected = crypto.createHmac("sha256", process.env.CASHFREE_CLIENT_SECRET!)
  .update(ts + rawBody).digest("base64");
const valid = sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
// also reject if |now - ts| > 5 minutes
```
  (Use the secret Cashfree specifies for webhook signing on the dashboard; for PG this is the client secret.)
- Store every event in `webhook_events` (including invalid ones with `signatureValid=false`). Return 200 quickly for valid events; 401 for invalid.
- On `PAYMENT_SUCCESS_WEBHOOK`: re-fetch the order via `GET /orders/{id}` to confirm `PAID` and that `order_amount` matches our DB amount → update order, create subscription (`startsAt=now`, `endsAt=now+durationDays`), send receipt email (once).
- On failed / user-dropped events: update order status only.
- All handlers must be **idempotent** (same webhook may arrive more than once).

### 7.7 Receipt email (Resend)
Subject: "Payment received – Option Rangers <Plan>". Body: name, plan, amount, order id, payment date, validity dates, support email, risk disclaimer, link to terms. Note "GST invoice will follow" unless the owner adds invoice generation.

### 7.8 Refunds
Phase 1: manual from Cashfree dashboard. Admin page shows a "Mark refunded" button that only updates our DB. (Phase 2 optional: call Cashfree Refund API `POST /orders/{order_id}/refunds`.)

### 7.9 Testing in sandbox
- Use sandbox keys from Cashfree dashboard (Test mode).
- Test success, failure and user-cancel with Cashfree test cards/UPI from their docs.
- Use the Vercel **preview** URL as `return_url`/`notify_url` during testing (set `NEXT_PUBLIC_SITE_URL` per environment).
- Confirm: order row created → redirect → status page shows PAID → webhook logged with `signatureValid=true` → subscription row created → one receipt email.

---

## 8. Lead and contact forms

- `/api/leads`: Zod `{ name (2–80), email }` + Turnstile token. Rate-limit 5/10 min/IP. Save lead, send email with the checklist PDF link (`/downloads/option-buyer-risk-checklist.pdf` in `public/` — owner supplies PDF; until then email says "coming soon"). Response message on page: "Check your inbox for the checklist."
- `/api/contact`: Zod `{ name, email, topic, message (10–2000) }` + Turnstile. Save, send receipt to user ("We received your message, reference #<short id>. We reply within <supportHours>."), notify owner at `OWNER_NOTIFY_EMAIL`. Grievance topic emails also go to grievance officer email when set.
- Both forms: inline errors under fields, success state replaces the form, button shows loading state.

---

## 9. Admin (minimal)

`/admin` protected with HTTP Basic Auth in `middleware.ts` using `ADMIN_USER` / `ADMIN_PASSWORD`. Tabs: Leads, Messages, Orders, Subscriptions. Each a simple table, newest first, CSV export button. Messages can be marked replied/closed. `noindex`.

---

## 10. SEO and metadata

- `metadata` per page. Home title: "Option Rangers | Options Market Research & Education". Description: "Learn options market context, risk management and research process in simple language. No profit guarantees. Trade se pehle, research zaroori hai."
- Open Graph image generated with `app/opengraph-image.tsx` (white bg, red "OR" mark, tagline).
- `lang="en-IN"`. Canonical URLs. JSON-LD `Organization` only with real fields (omit nulls).
- Favicon: red rounded square with white "OR".

---

## 11. Security checklist

- Security headers in `next.config.ts`: `Content-Security-Policy` (allow `sdk.cashfree.com`, `*.cashfree.com`, `challenges.cloudflare.com`, Google fonts handled by next/font), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geolocation off), `X-Frame-Options: DENY`.
- All API routes: Zod validation, rate limits, generic error messages to client.
- No PII in logs (mask email/phone).
- `.env*` in `.gitignore`. Commit only `.env.example`.
- Dependabot enabled on GitHub.

---

## 12. Environment variables

`.env.example`:
```
# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_MODE=preview            # preview | live
PAYMENTS_ENABLED=false                   # true only after compliance sign-off
LEGAL_REVIEWED=false

# Cashfree
CASHFREE_ENV=sandbox                     # sandbox | production
CASHFREE_CLIENT_ID=
CASHFREE_CLIENT_SECRET=
NEXT_PUBLIC_CASHFREE_MODE=sandbox        # sandbox | production

# Database (Neon via Vercel Marketplace sets this automatically)
DATABASE_URL=

# Email
RESEND_API_KEY=
EMAIL_FROM="Option Rangers <hello@yourdomain.in>"
OWNER_NOTIFY_EMAIL=

# Rate limit (Upstash via Vercel Marketplace)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Bot protection (optional)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Admin
ADMIN_USER=
ADMIN_PASSWORD=
```
Validate env at startup with Zod (`lib/env.ts`); fail fast with a readable message.

---

## 13. Folder structure

```
/app
  layout.tsx  page.tsx  globals.css  sitemap.ts  robots.ts  opengraph-image.tsx
  about/ plans/ track-record/ faq/ contact/ legal/[slug]/
  checkout/[plan]/page.tsx   payment/status/page.tsx   admin/...
  api/leads/route.ts  api/contact/route.ts  api/orders/route.ts
  api/orders/[orderId]/route.ts  api/webhooks/cashfree/route.ts
/components   Header Footer PreviewBanner Button Card Kicker PlanCard PayoffChart
              Accordion TestimonialCard LeadForm ContactForm CheckoutForm PendingChip
/content      site.ts plans.ts faq.ts home.ts testimonials.ts legal/*.mdx
/db           schema.ts index.ts  /drizzle (migrations)
/lib          cashfree.ts env.ts email.ts ratelimit.ts turnstile.ts format.ts
/public       favicon, downloads/
/reference    option-rangers-design.html   (design reference, not deployed)
/tests        e2e/*.spec.ts (Playwright)  unit/*.test.ts (Vitest)
middleware.ts  next.config.ts  drizzle.config.ts  .env.example  README.md
```

---

## 14. GitHub + Vercel setup (owner steps; agent writes these into README.md)

1. **GitHub:** create private repo `option-rangers`. Push the code. Protect `main` (require PR + passing checks).
2. **GitHub Actions** `.github/workflows/ci.yml`: on PR → `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
3. **Vercel:** New Project → Import the GitHub repo → Framework: Next.js (auto). Production branch `main`.
4. **Vercel Marketplace:** add **Neon** (Postgres) and **Upstash** (Redis) to the project — env vars are injected.
5. **Env vars** in Vercel → Settings → Environment Variables: set all from §12. Use **sandbox** Cashfree keys for Preview + Development, **production** keys for Production only (later).
6. **Migrations:** `npm run db:migrate` (runs `drizzle-kit migrate`) — add to Vercel build command: `npm run db:migrate && next build`, or run manually before deploy.
7. **Domain:** Vercel → Domains → add `optionrangers.in` (or chosen domain), set DNS as Vercel shows. Then update `NEXT_PUBLIC_SITE_URL`.
8. **Resend:** verify the sending domain (DNS records), set `EMAIL_FROM`.
9. **Cashfree:**
   - Sign up, complete KYC/business onboarding (Cashfree will review the website — it must show terms, refund, privacy, contact details and pricing clearly).
   - Developers → API Keys: copy sandbox keys → Vercel Preview env.
   - Developers → Webhooks: add `https://<domain>/api/webhooks/cashfree` (Payments).
   - Whitelist the production domain if Cashfree asks.
10. **Go-live switch:** only after the compliance checklist (§16) is complete: set production Cashfree keys, `CASHFREE_ENV=production`, `NEXT_PUBLIC_CASHFREE_MODE=production`, `NEXT_PUBLIC_SITE_MODE=live`, `PAYMENTS_ENABLED=true`, redeploy, do one real ₹ payment and refund it.

---

## 15. Build phases (agent must follow in order)

| Phase | Deliverable | Done when |
|---|---|---|
| 1 | Scaffold Next.js + Tailwind + fonts + tokens, Header/Footer/PreviewBanner, all static pages with content from reference | Every route renders; no horizontal scroll at 360px; Lighthouse ≥ 90 mobile |
| 2 | Home page components incl. `PayoffChart`, PlanCard, testimonials logic, accordions | Visual match with reference at 390px and 1280px |
| 3 | DB (Neon + Drizzle), lead + contact APIs, Resend emails, rate limit, Turnstile | Forms save rows and send emails on a Vercel preview |
| 4 | Cashfree: orders API, checkout page, status page, webhook, receipt email, subscriptions | Full sandbox flow passes (§7.9) with `PAYMENTS_ENABLED=true` on preview |
| 5 | Admin, SEO, OG image, security headers, sitemap | Admin works behind auth; headers verified at securityheaders.com |
| 6 | Tests + CI + README | Playwright: home renders, nav works on mobile, lead form validation, checkout blocked when payments off, sandbox order creation mocked. CI green |

Commit after each phase with a clear message. Open one PR per phase so each gets a Vercel preview.

---

## 16. Compliance checklist before turning payments on (owner, not the agent)

This is a business checklist, not legal advice. Confirm each with a SEBI compliance professional:
- [ ] SEBI Research Analyst registration (or the correct authorisation) obtained; number added to `content/site.ts`.
- [ ] Fee structure, advance-billing limits and refund terms match current SEBI RA rules.
- [ ] Terms & Conditions / Most Important Terms and client consent flow match current SEBI requirements; legal pages reviewed (`LEGAL_REVIEWED=true`).
- [ ] Grievance officer, SCORES and ODR details published.
- [ ] Website advertising checked against SEBI advertisement code (testimonials, performance claims, disclaimers).
- [ ] Check whether SEBI's centralised fee collection mechanism for RAs applies to you.
- [ ] GST registration and invoice process ready.
- [ ] Cashfree merchant account approved for this business category.

---

## 17. Acceptance criteria (final)

- All pages from §3 live on Vercel, match the reference design, and work at 360–430px with no sideways scroll.
- No invented business facts anywhere; all nulls show as pending in preview and block a live build.
- With `PAYMENTS_ENABLED=false`, no order can be created (UI and API).
- With sandbox keys, a payment completes end to end, status is verified server-side, webhook signature verified, subscription created once, one receipt email sent.
- CI passes on every PR; secrets never in client bundle (check with `grep -r CLIENT_SECRET .next/static` → no results).
