# Fix: Cashfree "domain not whitelisted" on optionrangers.vercel.app

> Paste into Antigravity, in the repo that contains `src/cashfree.js`, `src/payments.js`, `src/api/index.js` (or `api/index.js`), `public/assets/app.js` and `vercel.json`:
>
> *"Read CASHFREE_FIX.md completely. Work through every task in order. Do not change prices, plans, or database tables except where a task says so. Never print or log the Cashfree secret key. After each task, run the project locally and tell me what you changed."*

---

## Facts (already checked, do not change)

| Item | Value |
|---|---|
| Live site | `https://optionrangers.vercel.app` (Vercel project `option-rangers`, team `option-rangers`) |
| Cashfree whitelist | `optionrangers.vercel.app`, type Website, **Approved** on 2026-10-30, on the **Trade Adhyayan** Cashfree account |
| Other hostnames serving the same site | `option-rangers.vercel.app`, `option-rangers-option-rangers.vercel.app`, and per-deploy URLs `option-rangers-xxxx.vercel.app` — **none of these are whitelisted** |
| Vercel env (Production) | `CASHFREE_ENV=production`, `CASHFREE_APP_ID` (secret), `CASHFREE_SECRET_KEY` (secret), `CASHFREE_API_VERSION=2023-08-01`, `BASE_URL=https://optionrangers.vercel.app` |
| Vercel env (Preview) | `CASHFREE_ENV=sandbox`, **no Cashfree keys** → payments can never work on preview URLs |
| Server client | `src/cashfree.js` picks `https://api.cashfree.com/pg` when `CASHFREE_ENV=production` — this part is correct |

The domain is approved, so the error comes from one of: (A) the browser is on a non-whitelisted hostname, (B) the keys belong to a different Cashfree account or to Test mode, (C) the checkout JS SDK runs in `sandbox` mode while the order is created in production (or the reverse), or (D) the browser calls Cashfree directly instead of the server.

---

## Task 1 — Add a payment diagnostics endpoint (admin only)

Add `GET /api/admin/cashfree-check`, protected by the existing admin login (`ADMIN_USER` / `ADMIN_PASSWORD`). It must return JSON:

```json
{
  "cashfreeEnv": "production",
  "apiBase": "https://api.cashfree.com/pg",
  "apiVersion": "2023-08-01",
  "appIdPrefix": "1234…",          // first 4 characters only
  "appIdLooksLikeTest": false,       // true if CASHFREE_APP_ID starts with "TEST"
  "secretPresent": true,             // boolean only, never the value
  "baseUrl": "https://optionrangers.vercel.app",
  "requestHost": "<host header of this request>",
  "hostIsWhitelisted": true,         // requestHost === "optionrangers.vercel.app"
  "sdkMode": "<the mode the frontend will use>",
  "testOrder": { "ok": true, "cfOrderId": "...", "paymentSessionIdPresent": true }
                // or { "ok": false, "status": 401, "code": "...", "message": "..." }
}
```

`testOrder`: create a real ₹1 order through the existing `createOrder` function with `order_id = "DIAG_" + timestamp`, test customer `customer_id: "diag_admin"`, `customer_phone: "9999999999"`. Creating an order does not charge anyone. Return Cashfree's `code` and `message` exactly as received on failure.

**Rule:** if `appIdLooksLikeTest` is true while `cashfreeEnv` is production, also return `"problem": "Sandbox keys used with production. Copy Production keys from the Trade Adhyayan Cashfree dashboard."`

## Task 2 — Make the checkout SDK mode come from the server

In `public/assets/app.js` (and any other page that opens checkout, e.g. `bootcamp.js`, `academy.js`):

1. Load only the official SDK: `<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>`. Remove any other Cashfree script (old `v2`, `cashfree.prod.js`, `cashfree.sandbox.js`, drop-in, seamless).
2. The order-creation API response must include `mode`:
   ```js
   // server, in the create-order route
   res.json({ orderId, paymentSessionId: cf.payment_session_id,
              mode: process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox' });
   ```
3. Frontend uses that value, never a hard-coded one:
   ```js
   const { paymentSessionId, mode } = await createOrderOnServer(planId, form);
   const cashfree = Cashfree({ mode });
   await cashfree.checkout({ paymentSessionId, redirectTarget: '_self' });
   ```
4. Search the whole repo for `mode:` / `"sandbox"` / `'sandbox'` / `TEST` in client files and remove every hard-coded value.

## Task 3 — Orders are created only on the server

Search all files under `public/` for `api.cashfree.com`, `sandbox.cashfree.com`, `x-client-id`, `x-client-secret`. There must be **zero** matches. The browser only calls our own `/api/...` endpoint, which calls Cashfree from `src/cashfree.js`. If any client code calls Cashfree directly, move it to the server.

## Task 4 — Force every visitor onto the whitelisted hostname

In `vercel.json` add redirects so payments always happen on `optionrangers.vercel.app`:

```json
{
  "redirects": [
    { "source": "/:path*", "has": [{ "type": "host", "value": "option-rangers.vercel.app" }],
      "destination": "https://optionrangers.vercel.app/:path*", "permanent": true },
    { "source": "/:path*", "has": [{ "type": "host", "value": "option-rangers-option-rangers.vercel.app" }],
      "destination": "https://optionrangers.vercel.app/:path*", "permanent": true }
  ]
}
```
Merge with the existing `vercel.json` (keep its current `rewrites`, `functions`, `headers`). Do not redirect per-deploy preview URLs.

Also in the frontend, before starting checkout:
```js
if (location.hostname !== 'optionrangers.vercel.app') {
  showError('Payments work only on optionrangers.vercel.app. Redirecting…');
  location.href = 'https://optionrangers.vercel.app' + location.pathname;
  return;
}
```
Put the allowed hostname in one constant so it is easy to change when a custom domain is added later.

## Task 5 — Correct return_url and notify_url

In `src/payments.js` `startCheckout`, build URLs from `BASE_URL` only:
```js
order_meta: {
  return_url: `${base}/payment/status?order_id={order_id}`,   // Cashfree replaces {order_id}
  notify_url: `${base}/api/payments/webhook`                  // use the existing webhook route path
}
```
Both must start with `https://optionrangers.vercel.app`. Fail with a clear server error if `BASE_URL` is missing or not https.

Also validate before calling Cashfree:
- `customer_id`: only letters, numbers, `_`, `-`, max 50 chars (strip dashes from UUIDs if needed).
- `customer_phone`: exactly 10 digits.
- `order_id`: 3–45 chars, letters/numbers/`_`/`-` only.

## Task 6 — Show the real Cashfree error

- In the create-order route, on failure: `console.error('cashfree_create_order_failed', { status: err.status, code: err.details?.code, type: err.details?.type, message: err.details?.message, host: req.headers.host })`. Never log keys or full customer details.
- Return to the browser: `{ error: "Payment could not start. Please try again or contact support.", code: err.details?.code }`.
- In the frontend, also catch errors from `cashfree.checkout()` (the promise result has `error`) and show `result.error.message` in the page, not just the console.

## Task 7 — Disable payments on Preview deployments

If `CASHFREE_ENV !== 'production'` **and** keys are missing, the create-order route returns `503 { error: "Payments are disabled on test deployments." }` and the Pay button shows that text. This stops confusing errors on preview links.

## Task 8 — Deploy and verify

1. Commit, push, wait for the Vercel production deployment to finish.
2. Log in to admin, open `https://optionrangers.vercel.app/api/admin/cashfree-check`. Expected: `appIdLooksLikeTest: false`, `hostIsWhitelisted: true`, `sdkMode: "production"`, `testOrder.ok: true`.
3. On `https://optionrangers.vercel.app`, click Pay on the cheapest plan. The Cashfree checkout page must open. Pay with UPI, then refund from the Cashfree dashboard.
4. Confirm the status page shows PAID and the webhook updated the order.
5. Open `https://option-rangers.vercel.app` → it must redirect to `optionrangers.vercel.app`.

---

## Reading the diagnostics result

| What `/api/admin/cashfree-check` shows | Cause | Fix |
|---|---|---|
| `appIdLooksLikeTest: true` | Test keys in production | Trade Adhyayan dashboard → switch to **Production** → Developers → API Keys → copy App ID + Secret into Vercel Production env → redeploy |
| `testOrder` status 401 / `authentication_error` | Wrong or mismatched keys | Re-copy both keys from the same account and mode; redeploy |
| `testOrder.ok: true` but checkout says domain not whitelisted | Keys are from a **different Cashfree account** than the one with the approval (e.g. the Option Rangers account) | Use keys from the Trade Adhyayan account, where the domain is approved |
| `testOrder.ok: true`, `hostIsWhitelisted: false` | Opened from wrong hostname | Task 4 redirect fixes this |
| `testOrder.ok: true`, error only in checkout window, `sdkMode` ≠ `production` | SDK mode mismatch | Task 2 fixes this |
| Everything correct and still blocked | Account-level restriction | Email Cashfree support with the approved domain, the App ID prefix, an order id from `testOrder`, and the exact error text |

**Remember:** after changing any Vercel environment variable, redeploy production. Env changes do not apply to the running site until a new deployment.
