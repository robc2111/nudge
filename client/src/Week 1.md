Week 1

Day 1 (Mon)
	•	Quick: Add sitemap.xml + robots.txt
	•	Medium: Add Telegram reminders toggle (Profile UI + DB flag)
	•	Large: Styling pass (Dashboard page only)

Day 2 (Tue)
	•	Quick: Verify social links/icons open in new tab
	•	Medium: Add Delete Account button (frontend UI with double confirm)
	•	Large: Security hardening – enable helmet + strict CORS

Day 3 (Wed)
	•	Quick: Remove dead routes (obsolete weekly reflection, etc.)
	•	Medium: Validation with zod/yup on user/goal inputs
	•	Large: Deployment readiness → test migrations + add rollback procedure

Day 4 (Thu)
	•	Quick: Add lint + prettier + pre-commit hook
	•	Medium: Add Delete Account backend cascade (soft delete or ON DELETE CASCADE)
	•	Large: Monitoring/alerts baseline (uptime + error rate)

Day 5 (Fri)
	•	Quick: Fix CTA/banner contrast (WCAG AA)
	•	Medium: Social OG images aligned with brand
	•	Large: Performance dashboard (Metabase/Grafana basic setup)

Day 6 (Sat)
	•	Quick: Add SEO meta descriptions to missing pages (Reflections, Profile)
	•	Medium: Account deletion integration with Stripe (cancel subscription on delete)
	•	Large: Test matrix (Free vs Pro, Telegram enabled/disabled, timezones)

⸻

Week 2

Day 7 (Mon)
	•	Quick: Accessibility labels/focus pass (forms + buttons)
	•	Medium: Account deletion integration with Telegram (final goodbye + forget ID)
	•	Large: Cron/unit tests with mocked Date (time windows)

Day 8 (Tue)
	•	Quick: Disable/hide Delete Goal button for free plan (UI polish)
	•	Medium: Manual test: stripe checkout/cancel/portal
	•	Large: Security: rate limiting for login/auth/AI endpoints

Day 9 (Wed)
	•	Quick: Polish error states (e.g. profile load, dashboard load)
	•	Medium: Profile page — add cached user to localStorage after sync
	•	Large: Extract plan limit logic into utils/planGuard.js and wire UI + server

Day 10 (Thu)
	•	Quick: Add “Upgrade” links to empty states (Dashboard, Reflections)
	•	Medium: Ensure Pro vs Free features exactly match Stripe product
	•	Large: Deployment smoke test checklist (payments, cron, AI, Telegram)

Day 11 (Fri)
	•	Quick: Add cookie notice (banner if tracking/cookies used)
	•	Medium: Data export/delete policy doc (backend stub + button text)
	•	Large: Backups (DB automated daily + one restore drill)

Day 12 (Sat)
	•	Quick: Ensure helmet headers cover XSS/Clickjacking basics
	•	Medium: Analytics (privacy-respecting, basic server-side events)
	•	Large: OpenAI org setup: dedicated key, usage caps, prod/dev split

⸻

🔎 Notes
	•	Each day balances visible wins (quick tasks), incremental depth (medium), and structural impact (large).
	•	You’ll close out a lot of UI polish + compliance early (Week 1), then move to deeper infra/security (Week 2).
	•	Sundays are skipped to give you breathing space.
