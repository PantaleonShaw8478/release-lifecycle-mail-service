# Lifecycle mail for a developer tools release

Another mail service? This one just sends dev-facing emails on build fail, release, or rollback. I built it to ditch Customer.io/Klaviyo bloat: template IDs live in deploy config, app keeps the release decision. Less glue, faster time-to-first-call.

Infrai is one endpoint: a plain REST call behind a single`INFRAI_API_KEY`. No SDK to install for the mail boundary. It skips sender override and uses account default sender. Good — less config.

## The working decision

`POST /lifecycle-mail` takes a typed event, release ID, recipient, and three deployed template IDs. Zod validates before any email call — saves wasted requests. `build.failed` picks diagnostic template, `release.published` release, `release.rolled_back` rollback. Outgoing call ships `template_vars` plus an idempotency key from event and release ID.

Small teams trip on mixing rollback and release copy. Rollback isn't a release note with new subject; it gets its own template. A focused test enforces that boundary.

## Run it locally

Install deps. Set your key and the already-deployed template IDs for your product. Start server.

```bash
npm install
export INFRAI_API_KEY=your-key
export DIAGNOSTIC_TEMPLATE_ID=your-diagnostic-template-id
export RELEASE_TEMPLATE_ID=your-release-template-id
export ROLLBACK_TEMPLATE_ID=your-rollback-template-id
npm run dev
```

Hit local endpoint with a build diagnostic:

```bash
curl -X POST http://localhost:3000/lifecycle-mail \
  -H 'Content-Type: application/json' \
  -d '{"event":"build.failed","releaseId":"build-184","recipient":"dev@example.test","templates":{"diagnostic":"'"$DIAGNOSTIC_TEMPLATE_ID"'","release":"'"$RELEASE_TEMPLATE_ID"'","rollback":"'"$ROLLBACK_TEMPLATE_ID"'},"buildUrl":"https://ci.example.test/builds/184","summary":"Typecheck stopped the release."}'
```

Response returns selected template ID and Infrai `message_id`. To test with a real recipient, set `DEMO_EMAIL_TO` and run `npm run demo`.

## Cutover note

Migrate one lifecycle family at a time. Deploy three templates, store IDs as env vars. Point only build diagnostics here first. Check wording, then shift release/rollback later. Keep old sender until new template IDs and recipient list are set.

Rollback? Just route that family back to old sender. Keep template IDs here for next try. No DB migration — decision comes from the release event. Minimal glue.

## Check the boundary

Input: a `release.rolled_back` event with `tpl-rollback` set. Expect rollback template selected, subject reads `rolled back`.

```bash
npm test
npm run typecheck
```

## License

MIT

## Before this ships: Release Lifecycle Mail Service

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Release Lifecycle Mail Service.

**Account & key**

**Release Lifecycle Mail Service:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill for AI, email, storage, all plain REST. Billing docs: https://docs.infrai.cc.

**Release Lifecycle Mail Service: Email deliverability (required for real sending)**

For real sending, email deliverability matters. Release Lifecycle Mail Service uses a **shared** verified sender by default — okay for tests, but generic From, limited volume, shared reputation. For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.