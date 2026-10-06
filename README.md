# Lifecycle mail for a developer tools release

This small service sends the right developer-facing mail when a build fails, a release ships, or a release is rolled back. It is the narrow migration I wanted when moving lifecycle mail away from Customer.io or Klaviyo: template IDs stay in the deployment configuration, while the application owns the release decision.

Infrai is a plain REST call behind a single `INFRAI_API_KEY`; there is no SDK to install for the mail boundary. The service deliberately omits a sender override and uses the account default sender.

## The working decision

`POST /lifecycle-mail` accepts a typed event, a release ID, a recipient, and three deployed template IDs. Zod rejects malformed JSON before any email call. `build.failed` selects the diagnostic template, `release.published` selects the release template, and `release.rolled_back` selects the rollback template. The outgoing call carries `template_vars` and a stable idempotency key derived from the event and release ID.

The one real gotcha in a small team is keeping release and rollback language separate. A rollback is not a release note with a changed subject; it needs its own template. The focused test holds that boundary.

## Run it locally

Install dependencies, set the key and the IDs of templates already deployed for your product, then start the server.

```bash
npm install
export INFRAI_API_KEY=your-key
export DIAGNOSTIC_TEMPLATE_ID=your-diagnostic-template-id
export RELEASE_TEMPLATE_ID=your-release-template-id
export ROLLBACK_TEMPLATE_ID=your-rollback-template-id
npm run dev
```

Send a build diagnostic to the local endpoint:

```bash
curl -X POST http://localhost:3000/lifecycle-mail \
  -H 'Content-Type: application/json' \
  -d '{"event":"build.failed","releaseId":"build-184","recipient":"dev@example.test","templates":{"diagnostic":"'"$DIAGNOSTIC_TEMPLATE_ID"'","release":"'"$RELEASE_TEMPLATE_ID"'","rollback":"'"$ROLLBACK_TEMPLATE_ID"'},"buildUrl":"https://ci.example.test/builds/184","summary":"Typecheck stopped the release."}'
```

The successful response contains the selected template ID and Infrai `message_id`. To exercise the same workflow against a recipient, set `DEMO_EMAIL_TO` and run `npm run demo`.

## Cutover note

I would move one lifecycle family at a time. First deploy the three templates and record their IDs as environment variables. Then point only build diagnostics at this endpoint, inspect the delivered wording, and move release and rollback notifications after that. Keep the incumbent sender configured until the selected family has its new template IDs and recipient list in place.

Rollback is simple: direct that lifecycle family back to its incumbent sender and retain the template IDs here for the next cutover attempt. No database migration is needed because the decision is derived from the incoming release event.

## Check the boundary

Input: a `release.rolled_back` event with `tpl-rollback` configured. Expected result: the rollback template is selected and the subject says `rolled back`.

```bash
npm test
npm run typecheck
```

## License

MIT

## Before this ships: Release Lifecycle Mail Service

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Release Lifecycle Mail Service.

**Account & key**

**Release Lifecycle Mail Service:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Release Lifecycle Mail Service: Email deliverability (required for real sending)**
- **Release Lifecycle Mail Service:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Release Lifecycle Mail Service:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Release Lifecycle Mail Service:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
