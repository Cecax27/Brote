# 015 — Push Notifications — Tasks

- [x] Create `push_tokens` migration and apply
- [x] Create `pg_net` + cron schedule migration
- [x] Deploy `send-watering-reminders` edge function
- [x] Create `src/lib/supabase/push-tokens.ts`
- [x] Simplify `src/lib/notifications.ts` (remove scheduling, keep handler + listener)
- [x] Remove `reconcileWateringNotifications` from all screens
- [x] Add `notificationPermission` state to auth context
- [x] Create `NotificationPermissionBanner` component
- [x] Update home screen with permission flow + banner
- [x] Update `database.types.ts`
- [x] Update `config.toml` with edge function schedule
- [x] Create spec files
- [ ] Run lint and verify
