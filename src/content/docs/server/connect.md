---
title: Send data to Otherlode
description: Create an ingest key, point your agents or your collector at ingest.otherlode.dev with it, confirm the service appears, and read what ingest answers.
order: 10
---

Your agents send what they count to Otherlode at `https://ingest.otherlode.dev`, either straight or through a collector you run. The API key they send names your tenant. This page connects either one. To attach the agent, see [Attach the agent](/docs/agent/attach). To decide whether you need a collector, see [Add a collector](/docs/collector/add).

## Create an ingest key

Only an admin of your tenant can create a key.

1. Sign in at `https://app.otherlode.dev`, open the tenant menu in the top bar, then click **Admin**.
2. Open **API keys** and click **Create key**.
3. Enter a name, choose the scope **Ingest**, and create the key.
4. Copy the key. The page shows it once, with the note "Copy this key now. You will not see it again."

Use one key for each deployment or collector, so you can revoke one without the others. A key has one scope. Ingest accepts only an `ingest` key. A `read` key is for the read API and cannot send data. [Manage API keys](api-keys) covers scopes, the key prefix, and revoking.

## Point the agent at ingest

To send straight to Otherlode, set two agent options where the JVM starts:

```bash
OTHERLODE_EXPORT_URL=https://ingest.otherlode.dev
OTHERLODE_AUTH_TOKEN=<your ingest key>
```

The agent sends the key as `Authorization: Bearer <key>` on every request. Use `https://`, the host name `ingest.otherlode.dev` and no path, since the agent adds the paths itself. Ingest does not listen for plain HTTP, and the agent refuses an `http://` URL for an `otherlode.dev` host while a key is set. Set the agent's `environment` option too, since no collector fills it in. [Configuration](/docs/agent/configuration) lists every way to set the options. Restart the JVM after you change them.

## Or set the collector's forward URL and token

The collector forwards nothing until you set its forward URL. Set these two variables where the collector runs:

```bash
OTHERLODE_COLLECTOR_FORWARD_URL=https://ingest.otherlode.dev
OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN=<your ingest key>
```

The collector sends the token as `Authorization: Bearer <key>` on every request. To keep the key out of the environment, put it in a file and set `OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN_FILE` to the file's path. Set one of the two variables, not both.

Use `https://`, the host name `ingest.otherlode.dev` and no path. Ingest does not listen for plain HTTP, so an `http://` forward URL gets no answer. The collector adds the paths `/v1/otherlode/deltas`, `/v1/otherlode/manifest`, `/v1/otherlode/static-baseline` and `/v1/otherlode/class-listing` itself. `ingest.otherlode.dev` answers only those paths, and `app.otherlode.dev` never answers them. A request for any other path on the ingest host, except the health check `/healthz`, gets a 404.

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

Until a service reports, the page says "No service has reported yet." [Inventory](inventory) describes the service list in full.

If the service does not appear, read the log of whatever sends to Otherlode: the agent's, or the collector's if one runs. The answers below say what each status means, and [Troubleshooting](troubleshooting) goes through the causes by symptom.

### Test runs do not list a service

A test run never adds a service to the list. A service appears only once a production run has reported. If only test JVMs have reported for a service, that service stays off the page, along with any environment that only test runs reached. The agent's [test runs](/docs/agent/test-runs) page explains how to mark a run as a test run.

## Read what ingest answers

Ingest answers each payload with a status. An agent that sends straight to ingest gets the answer itself. It counts a payload as stored only on `202`. For any status other than a `2xx` it logs a `WARNING`, such as `otherlode: delta export failed, will retry next flush`, with `unexpected status <status>` on the line after it. For a `2xx` other than `202` the line after it reads `answered <status>, not 202, so the payload counts as not stored`. Either way it and keeps the payload to send again on its next flush.

A collector forwards each payload to Otherlode while the agent waits, and answers the agent from Otherlode's answer, as the last column says. It answers `202` only when Otherlode answered `202`. When Otherlode refuses a payload, the collector logs a line whose `error` field reads `backend returned <status>`, such as `backend returned 401 Unauthorized`.

| Status | Body | Meaning | What the collector does |
|---|---|---|---|
| 202 | none | Otherlode accepted the payload. | Answers the agent `202`. |
| 401 | `{"error":"unauthorized"}` | The `Authorization` header is missing or is not a bearer key, or the key is unknown or revoked. | Answers the agent `401`. |
| 403 | `{"error":"this route needs an ingest key"}` | The key is valid but has the `read` scope. | Answers the agent `403`. |
| 403 | `{"error":"redaction_required"}` | Your tenant [requires redacted payloads](require-redaction), and the payload carried no fingerprint, or a malformed one. | Answers the agent `403`. |
| 403 | `{"error":"redaction_secret_mismatch"}` | Your tenant requires redacted payloads, and the payload carried the fingerprint of another secret. | Answers the agent `403`. |
| 413 | `request body too large` | The request body is over 16 MiB. | Answers the agent `413`. |
| 413 | `payload has too many elements` | The payload holds more entries than the limit for its kind. Every message and every element of a repeated field counts, at every depth. The limits are 500,000 entries for a delta batch, 100,000 for a manifest chunk, 200,000 for a static baseline chunk and 100,000 for a class listing chunk. | Answers the agent `413`. |
| 429 | `rate limit exceeded`, with `Retry-After` | Your tenant sent more requests than its limit allows. | Answers the agent `429` with the same `Retry-After`. |
| 503 | `{"error":"unavailable"}` with `Retry-After: 5`, or no body with `Retry-After: 5` or `Retry-After: 1` | Otherlode could not check the key or read whether your tenant requires redacted payloads, or, with no body, could not store the payload (`Retry-After: 5`) or was busy with other payloads (`Retry-After: 1`). | Answers the agent `503` with `Retry-After: 5`. |

The agent makes up to five attempts at a `408`, `429` or `5xx` in one send, waits out a `Retry-After` of 2 seconds or less, and ends the send at once on a longer one. A collector makes one attempt and retries nothing. Either way the agent sends the payload again on its next flush, so nothing is lost while it keeps running. A 401 or 403 does not fix itself. For a key problem, create or fix the key, set it where the agent or the collector reads it, and restart that process. For a redaction refusal, see [backend returned 403](troubleshooting#backend-returned-403).

Ingest answers 400 for a body that is not valid protobuf, lacks a service name, instance ID or run ID, carries an identity value over 1024 bytes or holding a NUL character, carries an agent time before 1970 or after the year 9999, names a class that failed to initialise with no reason, lists a dependency with no identities, or takes more than 15 seconds to arrive, and 415 for the wrong content type. An agent never sends such a payload, and a collector rejects one before it forwards it, so you see these only from another sender.

### The ingest limit

Each tenant has one limit on ingest requests, shared by all its ingest keys and by every agent and collector that sends with them. A second key does not raise it. When the tenant is over the limit, ingest answers 429 and a `Retry-After` header with a whole number of seconds, at most 600. The read API has no such limit.

An operator sets the limit for a tenant. To ask for a higher one, email [support@otherlode.dev](mailto:support@otherlode.dev). The agent keeps a payload that got a 429 and sends it again, so a short burst loses nothing.
