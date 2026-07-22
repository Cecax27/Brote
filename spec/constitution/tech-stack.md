# Tech stack and conventions

## Technologies

- **Languages:** TypeScript
- **Framework / runtime:** React Native (Expo)
- **Database:** Supabase (PostgreSQL)
- **External sources:** Supabase Auth (email/password + deep-link)
- **Deployments:** EAS Build (mobile)
- **Package manager:** Npm

## Files

```
app.json                  # Expo config (scheme: brote)
package.json              # deps + scripts
tsconfig.json             # strict, @/* → ./src/*, @/assets/* → ./assets/*
eslint.config.js          # eslint-config-expo (flat)
src/
  app/                    # expo-router entry
src/lib/                  # shared libs (supabase client, helpers)
assets/                   # images, fonts
supabase/                 # tracked Supabase CLI project (config.toml + migrations/)
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
- No secrets in source code — use `EXPO_PUBLIC_*` env vars read via `process.env`
- Supabase schema changes ship as numbered migrations under `supabase/migrations/`

## Visual style



## Hard limits

- No secrets in source code (Supabase URL + anon key live in `EXPO_PUBLIC_*` env vars, never hardcoded)
- Mobile builds must go through EAS (`eas build`); no direct `expo publish`
- All TypeScript strict mode (via `expo/tsconfig.base`)
