# 002 - Authentication

**Status:** Done

## What makes

Users can create accounts, log in, log out, and reset their password via an email deep-link flow. This feature introduces the authentication layer that every subsequent feature depends on:

- An auth context + provider exposing `session`, `user`, `signIn`, `signUp`, `signOut`, and `resetPassword` to the whole app.
- A Supabase `onAuthStateChange` listener for session persistence across app restarts.
- Four auth screens: **log in**, **sign up**, **forgot password**, and **reset password** (the last one reached through a `brote://` deep link from the reset email).
- An auth guard that redirects unauthenticated users to the log in screen and bounces already-authenticated users out of the auth group into the app.
- Form validation and error messages in Spanish throughout.

This feature ships the minimum navigation structure the auth screens need (an `(auth)` route group and a root layout that hosts the `AuthProvider`). The full theme, design tokens, home screen, and shared UI components belong to `003-app-foundation`.

## Why

The mission says each plant's history belongs to a user, and `001-supabase-foundation` already enforces RLS on `auth.uid() = user_id`. Without authentication there is no `auth.uid()`, so every query returns nothing. Auth is the prerequisite for every feature that touches user data — plant management, journal entries, AI conversations, and inventory.

Email + password keeps the app honest (mission: *close, not complicated*). The deep-link password reset mirrors the flow users already expect from other apps, without adding OAuth providers or magic links that would expand the surface area before V1.0.

## Mockup-first workflow

Before any auth screen is implemented in React Native, the owner (the user, not opencode) produces **HTML mockups** for each of the four screens so the visual design can be iterated quickly outside the simulator. Mockups live at:

```
spec/features/002-authentication/mockups/
  login.html
  signup.html
  forgot-password.html
  reset-password.html
```

Screen implementation tasks (Phase 3 in `tasks.md`) are blocked until the mockups are committed. The non-visual infra work (auth context, deep-link handling, auth guard) can proceed in parallel with mockup creation since it does not depend on screen styling.

## Acceptance criteria

1. An `AuthProvider` at `src/context/auth.tsx` exports a `useAuth()` hook returning `{ session, user, isLoading, signIn, signUp, signOut, resetPassword }`.
2. `useAuth().signIn({ email, password })` calls `supabase.auth.signInWithPassword` and throws on failure with a Spanish error message.
3. `useAuth().signUp({ email, password, displayName })` calls `supabase.auth.signUp` with `options.data.display_name` and throws on failure with a Spanish error message.
4. `useAuth().signOut()` calls `supabase.auth.signOut` and clears the local session.
5. `useAuth().resetPassword(email)` calls `supabase.auth.resetPasswordForEmail` with `redirectTo: 'brote://reset-password'`.
6. An `onAuthStateChange` listener keeps `session`/`user` in sync and persists across app restarts (session already backed by `AsyncStorage` in `001`).
7. The root `src/app/_layout.tsx` wraps the app in `<AuthProvider>` and renders a `<Stack>`.
8. An auth guard (in the root layout) uses `useSegments()` + `router.replace()` to redirect unauthenticated users into the `(auth)` group and authenticated users out of it.
9. Four screens exist under `src/app/(auth)/`: `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`.
10. **Log in** screen: email + password fields, a "Olvidé mi contraseña" link to the forgot-password screen, a link to sign up. Submitting calls `signIn` and navigates to the app on success.
11. **Sign up** screen: email, password, confirm password, display name fields. Links to log in. Submitting calls `signUp`.
12. **Forgot password** screen: email field. Submitting calls `resetPassword(email)` and shows a confirmation message ("Te hemos enviado un correo…").
13. **Reset password** screen (reached via `brote://reset-password` deep link): new password + confirm password fields. On mount, parses the deep-link URL for `access_token` / `refresh_token` and calls `supabase.auth.setSession`. Submitting calls `supabase.auth.updateUser({ password })` and navigates to the app.
14. The `brote://reset-password` redirect URL is registered in the Supabase project's auth redirect allow-list (verified in the Dashboard or `config.toml` `additional_redirect_urls`).
15. Form validation covers: empty fields, invalid email format, password shorter than 6 characters, password mismatch, server errors. All messages are in Spanish.
16. Every auth action shows a loading state (e.g. disabled submit button + spinner) while the request is in flight.
17. Log out is reachable from a placeholder within the `(app)` group and clears the session.
18. `npm run lint` passes with no new errors.
19. The project compiles under strict TypeScript (`npx tsc --noEmit`).

## Out of reach

- Theme, design tokens, fonts, shared UI component library, and the home screen — all belong to `003-app-foundation`. 002 uses inline minimal styling; 003 retrofits the visual system.
- A `profiles` table or any profiles CRUD. The display name is stored in `auth.users.user_metadata` via `signUp` options. A dedicated profiles feature, if ever needed, lands in `013-settings-profile`.
- OAuth providers (Apple, Google) and magic-link sign-in — deferred beyond V1.0.
- Email verification gating (`enable_confirmations` stays `false` per current `config.toml`) — users can sign in immediately after sign-up.
- Changing the session storage backend from `AsyncStorage` to `expo-secure-store`. 002 reuses the client shipped in `001`. Upgrading to SecureStore is a future hardening concern.
- Biometric auth / Face ID — deferred beyond V1.0.