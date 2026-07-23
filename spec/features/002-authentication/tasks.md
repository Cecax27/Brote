# 002 - Authentication

## Phase 0 — Mockups (owner: user, not opencode)

> Blocks Phase 3. Phases 1–2 can start in parallel with this phase.

- [x] Create `spec/features/002-authentication/mockups/` directory
- [x] `login.html` — email, password, "Olvidé mi contraseña" link, sign up link, primary button, loading state
- [x] `signup.html` — email, password, confirm password, display name, log in link, primary button, loading state
- [x] `forgot-password.html` — email, primary button, success state ("Te hemos enviado un correo…"), back to login
- [x] `reset-password.html` — new password, confirm password, primary button, verifying state, loading state
- [x] Review mockups against mission tone (close, calm, Spanish copy)

## Phase 1 — Auth context + provider

- [x] Create `src/context/auth.tsx`
- [x] Implement `AuthProvider` — bootstrap `getSession()`, set `isLoading = false` once resolved
- [x] Subscribe `supabase.auth.onAuthStateChange` → `setSession`
- [x] Implement `signIn({ email, password })` → `signInWithPassword` with Spanish error mapping
- [x] Implement `signUp({ email, password, displayName })` → `signUp` with `options.data.display_name` + Spanish error mapping
- [x] Implement `signOut()` → `supabase.auth.signOut`
- [x] Implement `resetPassword(email)` → `resetPasswordForEmail` with `redirectTo: 'brote://reset-password'`
- [x] Export `useAuth()` hook with typed return (`Session | null`, `User | null`, `isLoading`, the four methods)
- [x] Add the Spanish error string map (table from `plan.md`)

## Phase 2 — Deep-link handling

- [x] Verify `brote://reset-password` is registered in the Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
- [x] Append `brote://reset-password` to `auth.additional_redirect_urls` in `supabase/config.toml` (local dev allow-list)
- [x] Implement deep-link handling in `reset-password.tsx` using `expo-linking`:
  - `Linking.getInitialURL()` for cold-start URL
  - `Linking.addEventListener('url', cb)` while warm
  - Parse the URL fragment for `access_token`, `refresh_token`, `type=recovery`
- [x] On tokens present, call `supabase.auth.setSession({ access_token, refresh_token })`
- [x] Local screen state machine (`verifying` → `ready` → `submitting` → `done`)

## Phase 3 — Auth screens (blocked by Phase 0 mockups)

- [x] Move `src/app/index.tsx` → `src/app/(app)/index.tsx` (home placeholder)
- [x] Create `src/app/(app)/_layout.tsx`
- [x] Create `src/app/(auth)/_layout.tsx`
- [ ] `src/app/(auth)/login.tsx` — restyle to match `mockups/login.html`
- [ ] `src/app/(auth)/signup.tsx` — restyle to match `mockups/signup.html`
- [ ] `src/app/(auth)/forgot-password.tsx` — restyle to match `mockups/forgot-password.html`
- [ ] `src/app/(auth)/reset-password.tsx` — restyle to match `mockups/reset-password.html`
- [x] Inline `StyleSheet` styling per mockup (no shared component library yet — 003 owns that)
- [x] Loading state on every submit button (disabled + activity indicator)
- [x] Client-side validation for all forms (empty, email format, password length ≥ 6, confirm match)

## Phase 4 — Root layout + auth guard

- [x] Update `src/app/_layout.tsx` — wrap `<Stack>` in `<AuthProvider>`
- [x] Implement auth guard in `(auth)/_layout.tsx` and `(app)/_layout.tsx` using `router.replace()` + `useEffect` (simpler than `useSegments()` approach — each group layout guards its own boundary)
- [x] Gate guard on `isLoading` (render nothing while bootstrapping session)
- [x] Ensure typedRoutes (`app.json` `experiments.typedRoutes: true`) accepts the `/(auth)/login` and `/(auth)/reset-password` literals
- [x] Add a temporary "Cerrar sesión" (log out) button to `src/app/(app)/index.tsx` to verify signOut + guard
- [x] Verify logout → guard routes to `(auth)/login`

## Phase 5 — Verification

- [ ] Sign up flow end-to-end → land on home placeholder with session
- [ ] Reload app → session persists, lands on home (no login flash)
- [ ] Log out → lands on login; reload stays on login
- [ ] Forgot password → reset email → tap link → `brote://reset-password` opens app → tokens parsed → new password set → lands on home
- [ ] Validation: empty fields, invalid email, short password, confirm mismatch → correct Spanish messages
- [ ] Server errors (wrong password, duplicate email, rate limit) → correct Spanish messages
- [x] `npm run lint` passes
- [x] `npx tsc --noEmit` passes under strict

## Phase 6 — Roadmap

- [ ] Update `spec/constitution/roadmap.md`: mark `002-authentication` checklist items and feature section as Done