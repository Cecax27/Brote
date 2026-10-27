# Tech stack and conventions

## Technologies

- **Languages:** TypeScript
- **Framework / runtime:** React Native (Expo)
- **Database:** Supabase (PostgreSQL)
- **External sources:** Supabase Auth (email/password + deep-link), brote-agent (Python + Gemini service on Google Cloud Run, reached over HTTP — never client-side AI)
- **Deployments:** EAS Build (mobile)
- **Package manager:** Npm

## Files

```
app.json                  # Expo config (scheme: brote)
eas.json                  # EAS Build profiles (dev, preview, production)
package.json              # deps + scripts
tsconfig.json             # strict, @/* → ./src/*, @/assets/* → ./assets/*
eslint.config.js          # eslint-config-expo (flat)
src/
  app/                    # expo-router entry
src/lib/                  # shared libs (supabase client, helpers)
assets/                   # images, fonts
supabase/                 # tracked Supabase CLI project
    config.toml             # Supabase project config
    migrations/             # numbered SQL migrations
  .env                      # local only, gitignored
  .env.example              # committed placeholders
```

## Commands

```bash
npm install               # install deps
npm start                 # expo start
npm run lint              # expo lint
npm run android           # expo start --android
npm run ios               # expo start --ios
npm run web               # expo start --web
npx supabase gen types --lang typescript --linked > src/lib/supabase/database.types.ts
```

## Data models

Owned by their feature specs (`spec/features/NNN-name/spec.md`). The first tables
are introduced in `001-supabase-foundation`: `plants` and `journal_entries`.

## Conventions

- Path alias `@/*` → `./src/*`, `@/assets/*` → `./assets/*`
- TypeScript strict mode (via `expo/tsconfig.base`)
- Files and code in English; app UI and AI conversations in Spanish
- No secrets in source code — use `EXPO_PUBLIC_*` env vars read via `process.env` for Supabase keys
- The Gemini key lives in **brote-agent**, never in the app — the app only holds the agent's public URL (`EXPO_PUBLIC_BROTE_AGENT_URL`)
- Supabase schema changes ship as numbered migrations under `supabase/migrations/`
- brote-agent is the only AI provider boundary; the app never calls Gemini directly. Contract: `GET /health` and `POST /chat` (see `spec/constitution/roadmap.md` V0.3)

## Visual style



## Hard limits

- No secrets in source code (Supabase URL + anon key live in `EXPO_PUBLIC_*` env vars, never hardcoded)
- AI (Gemini) key stored in brote-agent, never in the app — app calls brote-agent only (`EXPO_PUBLIC_BROTE_AGENT_URL`); Supabase holds conversation/message history, not AI keys
- Mobile builds must go through EAS (`eas build`); no direct `expo publish`
- All TypeScript strict mode (via `expo/tsconfig.base`)
