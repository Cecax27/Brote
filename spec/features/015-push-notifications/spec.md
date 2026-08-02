# 015 — Push Notifications

## What

Replace local scheduled notifications with Expo push notifications powered by a Supabase edge function + pg_cron, enabling true background reminders even when the app is not open.

## Why

Local notifications (V0.1) only work when the app is opened to reconcile schedules. If the user doesn't open the app for days, no reminders fire. Push notifications ensure users always receive watering reminders daily at 9am, regardless of app open state.

## Acceptance Criteria

- [x] On first login, the app requests notification permission from the OS
- [x] If permission is granted, the Expo push token is stored in a `push_tokens` table on Supabase
- [x] If permission is denied, a friendly banner appears on the home screen allowing the user to enable notifications later
- [x] A cron job fires daily at 9am, invoking an edge function
- [x] The edge function queries users with plants due for watering, groups by user, and sends one push notification per user via Expo Push API
- [x] Notifications use appropriate copy: "Tienes 1 planta por regar hoy" or "Tienes N plantas por regar hoy"
- [x] Invalidated push tokens (device uninstalled app) are cleaned up automatically
- [x] Push tokens are deleted on sign out
- [x] Local `reconcileWateringNotifications` is removed entirely
