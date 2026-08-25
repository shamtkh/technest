# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TechNest is a React 19 + Vite e-commerce storefront (phones/electronics) with a custom `json-server` backend used as a fake REST API. Client and API run as two separate processes during development.

## Commands

- `npm run dev` (or `npm start`) — runs Vite dev server and the json-server API concurrently (`concurrently`). This is the normal way to develop.
- `npm run dev:client` — Vite only, port 5173 (default).
- `npm run dev:server` (or `npm run server`) — API only, `node server/index.cjs`, port 3001.
- `npm run build` — production build via Vite.
- `npm run preview` — preview the production build.
- `npm run lint` — ESLint over the whole repo (flat config, `eslint.config.js`).
- No test suite is configured in this repo.

There is no `.env` requirement to run locally; `VITE_API_URL` optionally overrides the API base URL (defaults to `http://127.0.0.1:3001`, see `src/api/api.js`).

## Architecture

**Two-process dev setup.** The Vite dev server proxies `/api/*` to `http://127.0.0.1:3001` (see `vite.config.js`), but `src/api/api.js` actually calls the API directly via `VITE_API_URL`/`127.0.0.1:3001`, not through the `/api` proxy path. Keep this in mind if adding new API calls — match the existing pattern in `api.js` rather than routing through `/api`.

**Fake backend (`server/index.cjs`).** Wraps `json-server` around `src/data/db.json` (collections: `products`, `categories`, `users`, `orders`, `messages`). Custom routes are registered *before* the generic `json-server` router so they take precedence:
- `POST /auth/login`, `POST /auth/register` — hand-rolled auth against the `users` collection (passwords in plaintext in `db.json`, stripped from responses). No real sessions/tokens — the client just stores the returned user object.
- `POST /orders` — assigns id/status/createdAt, then decrements stock on the matching product **variant** (matched by `storage` + `color`) for each line item.
- `PATCH /orders/:id` — updates order status.
- `DELETE /orders/:id` — deletes the order and, if it was `pending`, restores the reserved variant stock.
- Everything else (`GET/POST/PATCH/DELETE /products`, `/categories`, `/users`, `/messages`, etc.) falls through to json-server's default REST behavior, writing straight back to `db.json` on disk. The support-chat `messages` collection (see below) relies entirely on this default behavior — there's no custom route for it.

`server/middleware.cjs` contains an older/alternate implementation of the same auth+orders routes using raw `fs` read/write instead of `router.db`; it is not required by `server/index.cjs` and is currently dead code — don't assume it runs.

**Product stock model.** A product's real stock lives in `product.variants[]` (each variant has `storage`, `color`, `hex`, `stock`). The top-level `product.stock` field in `db.json` is stale/unused for display — `src/api/api.js` always recomputes `stock` client-side as the sum of variant stocks (`computeStock`) before returning products to the app. When adding stock-related logic, operate on variants, not the top-level field.

**State management.** Redux Toolkit, one slice per domain in `src/store/slices/` (`authSlice`, `productSlice`, `cartSlice`, `ordersSlice`, `chatSlice`), each paired with `createAsyncThunk` thunks in `src/store/thunks/` that call `src/api/api.js`. `redux-persist` persists only `auth` and `cart` slices to localStorage (key `technest_root`); products/orders/chat are always refetched. Cart items are keyed by `productId__storage__color` (see `makeKey` in `cartSlice.js`) since the same product can be added in multiple variant combinations.

**Support chat.** `src/components/SupportWidget.jsx` is a floating customer-only widget (hidden for admins) backed by the `messages` collection (`{ userId, userName, sender: 'user'|'admin', text, createdAt }`) via `chatSlice.js`. It polls `getMyMessagesThunk` every 10s while open to simulate live replies, and derives unread badges (`myUnreadCount`/`adminUnreadCount`) by diffing message ids between polls rather than any server-side read state. Admins reply through the "support" tab in `adminDashboard.jsx`, which polls `getAllMessagesThunk` the same way.

**Auth & routing.** No JWT — `state.auth.user` (persisted) is the source of truth for whether someone is logged in, and `user.role` (`'customer'` | `'admin'`) gates access. `src/routes/protectedRoute.jsx` requires any logged-in user (redirects to `/login`); `src/routes/adminRoute.jsx` additionally requires `role === 'admin'` (redirects non-admins to `/forbidden`). Routes are wired in `src/App.jsx` inside a shared `Layout` (`src/components/Layout.jsx`).

**i18n.** `src/i18n/index.js` sets up `i18next` with `uz`/`ru`/`en` locale JSON files in `src/i18n/locales/`, browser language detection, `technest_lang` localStorage key, and `uz` as fallback. Add new UI strings to all three locale files.

**Form validation.** Lightweight custom validator in `src/validations/validateForm.js` — schemas are `{ field: [validatorFn, ...] }` built from composable `rules` (`required`, `email`, `minLength(n)`, `phone`, `match(value)`). Follow this pattern (see `createProductValidate.js`) rather than pulling in a validation library.

**Product images.** `src/utils/productImages.js` generates an inline SVG data-URI placeholder when a product has no images, keyed off the product name — used by `ProductCard`/`ProductPage` so the UI never has to special-case missing images.

**Admin dashboard.** `src/pages/adminPage.jsx` + `src/components/adminDashboard.jsx` — CRUD over products (via the product thunks), order status/deletion (via the orders thunks), and a support-chat tab (via the chat thunks), gated by `AdminRoute`.
