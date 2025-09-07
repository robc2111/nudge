Week 1

Day 3 (Wed) - Register for self employed tax (sole trader) - transfer render, supabase and netlfiy accounts to goalcrumbs email if needed

Day 5 (Fri)
• Quick: Fix CTA/banner contrast (WCAG AA)
• Medium: Social OG images aligned with brand
• Large: Performance dashboard (Metabase/Grafana basic setup) - change telegram bot instruction so /done allows users to select a number for the appropriate microtask

Day 6 (Sat)
• Quick: Add SEO meta descriptions to missing pages (Reflections, Profile)
• Medium: Account deletion integration with Stripe (cancel subscription on delete)
• Large: Test matrix (Free vs Pro, Telegram enabled/disabled, timezones) - ensure weekly checkin acts as an accoutability partner by monitoring progress and giving a message that reflects this - Trademark GoalCrumbs

⸻

Week 2

Day 7 (Mon)
• Quick: Accessibility labels/focus pass (forms + buttons)
• Medium: Account deletion integration with Telegram (final goodbye + forget ID)
• Large: Cron/unit tests with mocked Date (time windows) - allow users to switch tone through dashboard or telegram (pro only)

Day 8 (Tue)
• Quick: Disable/hide Delete Goal button for free plan (UI polish)
• Medium: Manual test: stripe checkout/cancel/portal
• Large: Security: rate limiting for login/auth/AI endpoints - review faqs

Day 9 (Wed)
• Quick: Polish error states (e.g. profile load, dashboard load)
• Medium: Profile page — add cached user to localStorage after sync
• Large: Extract plan limit logic into utils/planGuard.js and wire UI + server - recycle api keys

Day 10 (Thu)
• Quick: Add “Upgrade” links to empty states (Dashboard, Reflections)
• Medium: Ensure Pro vs Free features exactly match Stripe product
• Large: Deployment smoke test checklist (payments, cron, AI, Telegram)

Day 11 (Fri)
• Quick: Add cookie notice (banner if tracking/cookies used)
• Medium: Data export/delete policy doc (backend stub + button text)
• Large: Backups (DB automated daily + one restore drill) - check timezone is working

Day 12 (Sat)
• Quick: Ensure helmet headers cover XSS/Clickjacking basics
• Medium: Analytics (privacy-respecting, basic server-side events)
• Large: OpenAI org setup: dedicated key, usage caps, prod/dev split
Day 13 - soft launch - business plan with marketing and sales strategy - update portfolio

⸻

🔎 Notes
• Each day balances visible wins (quick tasks), incremental depth (medium), and structural impact (large).
• You’ll close out a lot of UI polish + compliance early (Week 1), then move to deeper infra/security (Week 2).
• Sundays are skipped to give you breathing space.
