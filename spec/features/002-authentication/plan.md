# 002 - Authentication

## Approach

Three layers, built bottom-up. The infra layer (auth context, deep-link handling) can proceed while the visual mockups are being produced; the screen layer follows once mockups are committed.

```
Layer 1 — Infra        Layer 2 — Routing         Layer 3 — Screens
─────────────          ──────────────            ────────────────
AuthProvider  ───────►  Root <Stack> + guard  ──► (auth)/login.tsx
onAuthStateChange      (auth) group               (auth)/signup.tsx
deep-link parser       (app) group → placeholder  (auth)/forgot-password.tsx
                                                  (auth)/reset-password.tsx
```

### 1. Auth context (`src/context/auth.tsx`)

A React context that wraps `supabase.auth` and exposes a typed `useAuth()` hook:

```ts
type AuthContextValue = {
  session: Session | null
  user: User | null
  isLoading: boolean           // initial session bootstrap
  signIn: (i: { email: string; password: string }) => Promise<void>
  signUp: (i: { email: string; password: string; displayName: string }) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}
```

- On mount: read `supabase.auth.getSession()`, set `isLoading = false` once resolved.
- Subscribe `supabase.auth.onAuthStateChange((_event, session) => setSession(session))`.
- `signIn` → `supabase.auth.signInWithPassword({ email, password })`.
- `signUp` → `supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })`. The display name is stored in `user_metadata`; no extra table.
- `signOut` → `supabase.auth.signOut()`.
- `resetPassword` → `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'brote://reset-password' })`.
- Each method surfaces Supabase errors as Spanish `Error.message` strings (see *Error string map* below). The method `throw`s so the caller can also react.

### 2. Deep-link handling for password reset

The Supabase password-recovery flow sends an email. When the user taps the link, Supabase verifies the token server-side, then redirects to `redirectTo` with auth tokens in the **URL fragment**:

```
brote://reset-password#access_token=eyJ...&refresh_token=...&expires_in=3600&token_type=recovery&type=recovery
```

The `brote` scheme is already in `app.json` (line 8). The handling plan:

1. In `reset-password.tsx`, on mount, use `expo-linking`:
   - `Linking.getInitialURL()` — catches the URL that launched the (cold-start) app.
   - `Linking.addEventListener('url', cb)` — catches URLs while warm.
2. Parse the fragment with `Linking.parse(url)` — it returns `queryParams` including fragment keys on native (Supabase puts everything after `#`). If `Linking.parse` does not surface fragment keys reliably, fall back to `new URL(url).hash` parsing.
3. If `access_token` + `refresh_token` + `type=recovery` are present, call `supabase.auth.setSession({ access_token, refresh_token })`.
4. Keep a local `screenState` (`verifying` → `ready` → `submitting` → `done`) so the password form stays disabled until the session is set.
5. Submit calls `supabase.auth.updateUser({ password })` then `router.replace('/')`.

`detectSessionInUrl` stays `false` on the client (set in `001`) — we handle the URL manually so we control UX on native. Only the `reset-password` screen consumes the deep link; other screens ignore it.

### 3. Routing + auth guard

```
src/app/
  _layout.tsx              # <AuthProvider><Stack /></AuthProvider> + guard
  (auth)/
    _layout.tsx            # minor layout for auth screens
    login.tsx
    signup.tsx
    forgot-password.tsx
    reset-password.tsx
  (app)/
    _layout.tsx
    index.tsx              # home placeholder (logout button) — real home is 003
```

The guard in the root layout uses the canonical expo-router pattern:

```ts
const { session, isLoading } = useAuth()
const segments = useSegments()
useEffect(() => {
  if (isLoading) return
  const inAuthGroup = segments[0] === '(auth)'
  if (!session && !inAuthGroup) router.replace('/(auth)/login')
  else if (session && inAuthGroup) router.replace('/')
}, [isLoading, session, segments])
```

`isLoading` gates the guard so the very first render doesn't flash a redirect before `getSession()` resolves. While loading, render the splash screen (or a null view) — splash behavior itself belongs to `003`.

Move the existing `src/app/index.tsx` into `src/app/(app)/index.tsx`. The `(app)` group becomes the authenticated area; 003 later replaces the placeholder with the real home screen.

### 4. Screens (after mockups)

The four auth screens rely on mockups at `spec/features/002-authentication/mockups/`. Until mockups land, screens are not implemented. The mockups define layout, copy, and interaction states — implementation matches them exactly. No shared UI component library exists yet (that's `003`); 002 uses inline `StyleSheet` styles. 003 will refactor screens onto shared components later.

Spanish copy lives in the mockups and is mirrored verbatim in the React Native screens. Tone follows the mission — close, calm, never alarmist. Example login error: *"Revisa tu correo y contraseña e inténtalo de nuevo."*

## Implementation

### Error string map (Spanish)

Map Supabase auth error codes / message substrings to friendly Spanish strings:

| Supabase signal | Spanish message |
|---|---|
| `Invalid login credentials` | "Revisa tu correo y contraseña e inténtalo de nuevo." |
| `User already registered` | "Ya existe una cuenta con este correo. ¿Quieres iniciar sesión?" |
| `Password should be at least 6 characters` | "La contraseña debe tener al menos 6 caracteres." |
| `Email rate limit exceeded` | "Has hecho muchas peticiones. Inténtalo de nuevo en unos minutos." |
| `Email not confirmed` (off by default) | "Necesitas confirmar tu correo antes de entrar." |
| Network / unknown | "Algo salió mal. Inténtalo de nuevo." |

Validation messages (client-side, also Spanish): empty email → "El correo es obligatorio.", invalid format → "Introduce un correo válido.", empty password → "La contraseña es obligatoria.", mismatch → "Las contraseñas no coinciden.", short password → "La contraseña debe tener al menos 6 caracteres."

### Supabase project configuration

Before the reset flow can work end-to-end, the remote Supabase project must allow the `brote://reset-password` redirect URL. Two routes:

- **Dashboard** → Authentication → URL Configuration → add `brote://reset-password` to "Redirect URLs".
- **config.toml** → append to `[auth] additional_redirect_urls` (local/CLI). This is tracked but only affects local dev; the Dashboard is authoritative for the hosted project.

Email deliverability is Supabase's default transactional sender until a custom SMTP is configured — acceptable for V1.0. The `max_frequency` on password resets is `1s` (current `config.toml`), so repeated taps rate-limit quickly.

### Packages

No new runtime packages are strictly required. `expo-linking` (~8.0.12) is already installed. `expo-constants` (~18) already installed. We will not add `expo-secure-store` in this feature (see Out of reach). The only dependency is the existing `@supabase/supabase-js` client.

## Decisions

1. **Display name in `user_metadata`, not a `profiles` table.** `signUp` accepts `options.data.display_name`. It's readable from `session.user.user_metadata.display_name`. No migration, no RLS, no extra queries. `013-settings-profile` can later move to a `profiles` table if query/join needs arise; the migration would backfill from `user_metadata`.
2. **Manual deep-link parsing over `detectSessionInUrl`.** The client from `001` has `detectSessionInUrl: false`. For web that flag would auto-handle email redirects; for native it's unreliable and can double-fire. Manual parsing in one screen keeps the recoverable session local to the reset-password flow.
3. **Route groups without affecting the home screen.** 002 introduces `(auth)` and `(app)` groups and a minimal `(app)/index.tsx` placeholder. 003 owns the real home screen, fonts, tokens, and shared components. The preview refactor of auth screens onto shared components is deferred to 003.
4. **Mockup-first.** Screen UI is blocked on committed HTML mockups at `spec/features/002-authentication/mockups/`. Infra work (context, deep-link, guard) is unblocked and runs in parallel.
5. **No email verification gate.** `enable_confirmations` stays `false`. Beginners drop off at verification steps; the mission prioritizes reducing friction.
6. **`AuthError.message` is pre-translated inside the hook** so screens can `try/catch` and display `error.message` directly without a separate translation layer.

## Risks

- **Deep-link reliability on Android cold start.** Some launchers strip the fragment from the opening URL. Mitigation: verify against `Linking.parse` output on a physical device before marking acceptance; if the fragment is missing, fall back to the Supabase PKCE/OTP flow (Supabase 2.x supports a `token` query-param variant). Flag any device that loses the fragment as a follow-up bug, not a blocker.
- **Splash flicker before session resolves.** If the guard fires before `getSession()` completes, the user may see a login flash before being redirected to home. Mitigation: gate the guard on `isLoading` and render nothing (or Expo's splash) during boot.
- **Email deliverability.** Supabase's default sender lands in spam for some providers. Mitigation: documented as a known limitation for V1.0; custom SMTP is a later infra task. Not blocking.
- **`useSegments()` typing with route groups.** Group segments are returned as the string `'(auth)'`. The guard checks `segments[0] === '(auth)'` — verify `useSegments` returns the group literally, not a resolved route, once typedRoutes is enabled (it is — `experiments.typedRoutes: true` in `app.json`).

## Verification

- Sign up with a fresh email → expect to land on the home placeholder with a session.
- Reload the app → session persists (no login flash, lands on home).
- Log out → lands on login; reloading still lands on login.
- Forgot password → email arrives (or shows in Supabase's local SMTP / Dashboard Auth email log); tapping the link opens `brote://reset-password`; the reset screen parses the tokens; submitting a new password updates auth and routes to home.
- Validation: empty fields, invalid email, short password, mismatched confirm-password all show the expected Spanish messages.
- `npm run lint` and `npx tsc --noEmit` both pass.