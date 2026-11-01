---
title: Send data from your collector
description: Create an ingest key, point your collector at ingest.otherlode.dev with it, confirm the service appears, and read what ingest answers.
order: 10
---

Your agents report to your collector. The collector forwards what they send to Otherlode at `https://ingest.otherlode.dev`, and the API key it sends names your tenant. This page connects a collector that already runs. To attach the agent and point it at the collector, see [Attach the agent](/docs/agent/attach).

## Create an ingest key

Only an admin of your tenant can create a key.

1. Sign in at `https://app.otherlode.dev` and open the menu under your tenant's name at the right of the top bar, then click **Admin**.
2. Open **API keys** and click **Create key**.
3. Enter a name, choose the scope **Ingest**, and create the key.
4. Copy the key. The page shows it once, with the note "Copy this key now. You will not see it again."

A key has one scope. Ingest accepts only an `ingest` key. A `read` key is for the read API and cannot send data. [Manage API keys](api-keys) covers scopes, the key prefix, and revoking.

## Set the collector's forward URL and token

The collector forwards nothing until you set its forward URL. Set these two variables where the collector runs:

```bash
OTHERLODE_COLLECTOR_FORWARD_URL=https://ingest.otherlode.dev
OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN=<your ingest key>
```

The collector sends the token as `Authorization: Bearer <key>` on every request. To keep the key out of the environment, put it in a file and set `OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN_FILE` to the file's path. Set one of the two variables, not both.

Use the host name `ingest.otherlode.dev` and no path. The collector adds the paths `/v1/otherlode/deltas`, `/v1/otherlode/manifest`, `/v1/otherlode/static-baseline` and `/v1/otherlode/class-listing` itself. `ingest.otherlode.dev` answers only those paths, and `app.otherlode.dev` never answers them. A request for any other path on the ingest host gets a 404.

Restart the collector after you change its variables.

### Name the environment

A payload names an environment only when its agent has the `environment` option set. To label every payload that passes through one collector, set the collector's own environment:

```bash
OTHERLODE_COLLECTOR_ENVIRONMENT=prod
```

By default the collector fills the name in only when the agent left it blank. An environment the agent names wins. Set `OTHERLODE_COLLECTOR_ENVIRONMENT_ACTION=upsert` to make the collector's value win. Run one collector per environment if you want the two kept apart. [Scope and environments](scope) explains how Otherlode uses the name, and what a run with no name looks like.

## Confirm the service appears

An agent sends a batch every 60 seconds by default, so a service can take that long to show. An idle instance still counts, because the agent sends an empty batch to say it is alive.

1. Sign in at `https://app.otherlode.dev`. The **Services** page opens first.
2. Look for the service under the `serviceName` you gave the agent. The table lists each service's environments, its instance count, **Last seen**, and **Watched for**.

Until a service reports, the page says "No service has reported yet." Use the **Filter** box to match a namespace or a service name. [Inventory](inventory) describes the service list in full.

If the service does not appear, read the collector's log first. The answers below say what each line means, and [Troubleshooting](troubleshooting) goes through the causes by symptom.

### Test runs do not list a service

A test run never adds a service to the list. A service appears only once a production run has reported. If only test JVMs have reported for a service, that service stays off the page, along with any environment that only test runs reached. The agent's [test runs](/docs/agent/test-runs) page explains how to mark a run as a test run.

## Read what ingest answers

The collector accepts a payload from an agent with `202`, queues it, and forwards it in the background. The status Otherlode returns shows up only in the collector's log. When a payload is dropped, the collector logs a warning that starts with `dropping payload` and ends with `backend returned <status>`.

| Status | Body | Meaning | What the collector does |
|---|---|---|---|
| 202 | none | Otherlode accepted the payload. | Counts it as delivered. |
| 401 | `{"error":"unauthorized"}` | The `Authorization` header is missing or is not a bearer key, or the key is unknown or revoked. | Drops the payload. |
| 403 | `{"error":"this route needs an ingest key"}` | The key is valid but has the `read` scope. | Drops the payload. |
| 403 | `{"error":"redaction_required"}` | Your tenant [requires redacted payloads](require-redaction), and the payload carried no fingerprint, or a malformed one. | Drops the payload. |
| 403 | `{"error":"redaction_secret_mismatch"}` | Your tenant requires redacted payloads, and the payload carried the fingerprint of another secret. | Drops the payload. |
| 413 | `request body too large` | The request body is over 16 MiB. | Drops the payload. |
| 413 | `payload has too many elements` | The payload holds more entries than the limit for its kind. Every message and every element of a repeated field counts, at every depth. The limits are 500,000 entries for a delta batch, 100,000 for a manifest chunk, 200,000 for a static baseline chunk and 100,000 for a class listing chunk. | Drops the payload. |
| 429 | `rate limit exceeded`, with `Retry-After` | Your tenant sent more requests than its limit allows. | Retries. |
| 503 | `{"error":"unavailable"}`, or no body with `Retry-After: 5` or `Retry-After: 1` | Otherlode could not check the key or read whether your tenant requires redacted payloads, or, with no body, could not store the payload (`Retry-After: 5`) or was busy with other payloads (`Retry-After: 1`). | Retries. |

The collector retries 429, 502, 503 and 504, and any request that gets no response. It waits at least the `Retry-After` time, backs off between attempts, and drops the payload after 5 minutes of retries. Any other status is final, so the collector drops the payload at once. A 401 or 403 does not fix itself. For a key problem, create or fix the key, set it on the collector, and restart the collector. For a redaction refusal, see [backend returned 403](troubleshooting#backend-returned-403). The collector does not send a dropped payload again.

Ingest answers 400 for a body that is not valid protobuf, lacks a service name, instance ID or run ID, carries an identity value over 1024 bytes or holding a NUL character, carries an agent time before 1970 or after the year 9999, names a class that failed to initialise with no reason, lists a dependency with no identities, or takes more than 15 seconds to arrive, and 415 for the wrong content type. Your collector rejects such payloads before it forwards them, so you see these only from a sender that is not your collector.

### The ingest limit

Each tenant has one limit on ingest requests, shared by all its ingest keys. A second key does not raise it. When the tenant is over the limit, ingest answers 429 and a `Retry-After` header with a whole number of seconds, at most 600. The read API has no such limit.

An operator sets the limit for a tenant. To ask for a higher one, email [support@otherlode.dev](mailto:support@otherlode.dev). A collector that gets a 429 waits and retries, so a short burst loses nothing.
