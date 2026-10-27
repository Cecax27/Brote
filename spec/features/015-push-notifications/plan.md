# 015 — Push Notifications — Plan

## Architecture

```
Client (React Native)
  ├── getExpoPushTokenAsync() → Expo Push Token
  ├── registerPushToken() → push_tokens table
  └── on signOut → delete push_tokens

Supabase Cloud
  ├── push_tokens table (user_id, token)
  ├── pg_cron → "0 9 * * *"
  │     └── pg_net.http_post → Edge Function
  └── send-watering-reminders edge function
        ├── query push_tokens + watering_schedules (due today)
        ├── group by user
        └── POST → exp.host/--/api/v2/push/send (one per user)
```

## Decisions

- **Remove local scheduled notifications** entirely. No fallback. Push is the sole mechanism.
- **One notification per user per day**, not one per plant. Less noise, more calm.
- **pg_cron + pg_net** over Edge Function scheduled triggers. Simpler to configure and reason about for cloud deployments.
- **verify_jwt = false** on the edge function since it's only called internally by pg_cron. The anon key is used in the Authorization header to pass the API gateway.
- **DeviceNotRegistered cleanup**: the edge function removes invalid tokens from the table when Expo responds with that error.

## Files

| File | Purpose |
|---|---|
| `supabase/migrations/20260729000000_create_push_tokens.sql` | push_tokens table + RLS |
| `supabase/migrations/20260729000001_enable_pg_net_and_schedule_cron.sql` | pg_net + cron schedule |
| `supabase/functions/send-watering-reminders/index.ts` | Edge function |
| `src/lib/supabase/push-tokens.ts` | Client push token helpers |
| `src/lib/notifications.ts` | Simplified — removed schedule methods |
| `src/components/NotificationPermissionBanner.tsx` | Home screen banner |
| `src/context/auth.tsx` | Permission state + token cleanup on signOut |
| `src/app/(app)/index.tsx` | Permission flow + banner |
| `src/lib/supabase/database.types.ts` | push_tokens types |
| `supabase/config.toml` | Schedule config for local dev |

## Risks

- Expo Push API has rate limits (600 req/min for free). Our volume is very low per day, so not a concern.
- `pg_net.http_post` timeout is 30s default. The edge function runs quickly (a few DB queries + N push API calls), well within limits.
- `buildBody` mutates the `names` array with `.pop()`. This is fine since the array is not reused. Fixed by using a copy if needed.
