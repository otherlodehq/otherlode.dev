---
title: Troubleshooting
description: Find the cause of a refused forward, a missing service or finding, a count that may change, a sign-in error or an API error, organised by what you see.
order: 150
---

Every entry starts from something you see: a collector log line, an empty page, a message or an HTTP status. Each gives the text as the server or the UI shows it, the cause, and the fix. Each fix links the page that owns the detail.

The server has two hostnames. Collectors send to `https://ingest.otherlode.dev`. People and scripts use `https://app.otherlode.dev`, which serves the web UI and the read API. Each hostname answers only its own routes.

## The collector logs a dropped payload

The collector writes one JSON line to standard output for each payload the server refuses for good. The line is at level `WARN`, so the collector's default log level shows it:

```json
{"time":"2026-10-07T09:12:44.512Z","level":"WARN","msg":"dropping payload: permanent failure","namespace":"","service":"checkout","instance":"3f1c9a","path":"/v1/otherlode/deltas","error":"backend returned 401 Unauthorized"}
```

The `error` field ends with the status the server sent. The `path` field names the payload: `/v1/otherlode/deltas`, `/v1/otherlode/manifest`, `/v1/otherlode/static-baseline` or `/v1/otherlode/class-listing`. The collector logs only the status and never the response body, so the bodies below are what you see when you call ingest with `curl`.

The collector retries 429, 502, 503, 504 and a failed connection. It drops any other non-2xx answer at once with `dropping payload: permanent failure`. After 5 minutes of retries, by default, it drops the payload with `dropping payload: retry budget exhausted`. [Send data from your collector](connect) covers the setup.

### backend returned 401

The server answers `{"error":"unauthorized"}`. The forward token is missing, or no live API key matches it. The cause is one of these:

- The collector has no forward token, or it holds a value that is not an API key. Keys start with `otl_`.
- The key was revoked. Revoked keys show as **Revoked** on the **API keys** page.

Create an ingest key on the **API keys** page, then set it as the collector's forward token, `OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN` or the file `OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN_FILE` names. The collector reads that file again every 30 seconds. It reads the variable only at start, so restart the collector after you change it. See [Manage API keys](api-keys).

### backend returned 403

The server answers 403 with one of three bodies. The collector logs only the status, so work through them in order. If your tenant does not [require redacted payloads](require-redaction), only the first applies. If it does, the **Refused payloads** table on the **Redaction** page in the admin area counts the other two by reason.

The server answers `{"error":"this route needs an ingest key"}` when the key is valid but has the `read` scope, and ingest takes only an `ingest` key. A `read` key cannot send reports, and an `ingest` key cannot read anything back. Replace the forward token with an `ingest` key. See [Manage API keys](api-keys).

#### redaction_required

The server answers `{"error":"redaction_required"}`. Your tenant requires redacted payloads, and the payload carried no fingerprint in its `Otherlode-Redaction` header, or carried one that is not 16 lowercase hex characters. The sender is one of these:

- A collector with redaction off. Turn redaction on with your tenant's secret. See [Blank out string literals](/docs/collector/redaction).
- An agent that sends straight to `ingest.otherlode.dev`, such as a test JVM. It sends the payload again at each flush and logs a `WARNING` each time. Point it at a collector with redaction on.
- A proxy between the collector and the server that drops the header. Let it pass `Otherlode-Redaction` through.

The `service` and `instance` fields of the collector's log line name the agent whose payload was refused.

#### redaction_secret_mismatch

The server answers `{"error":"redaction_secret_mismatch"}`. The payload came through a collector with redaction on, but its secret differs from the one whose fingerprint your tenant requires. Compare the `secret_fingerprint` the collector logs at startup with the fingerprint on the **Redaction** page. Then give the collector the same secret as your other collectors, or, if you changed the secret on purpose, change the fingerprint. See [Change the fingerprint](require-redaction#change-the-fingerprint).

A refused payload is dropped and never stored, and the collector does not send it again.

### backend returned 404

The server answers `404 page not found`. The collector's forward URL does not reach the ingest routes. The cause is one of these:

- The forward URL names `app.otherlode.dev`. The app hostname does not serve ingest.
- The forward URL has a path after the hostname. The collector adds `/v1/otherlode/deltas`, `/v1/otherlode/manifest`, `/v1/otherlode/static-baseline` and `/v1/otherlode/class-listing` to the URL it holds.
- A proxy between the collector and the server drops those paths.

Set the forward URL to `https://ingest.otherlode.dev` and nothing more, in `OTHERLODE_COLLECTOR_FORWARD_URL`.

### backend returned 400

The server rejected the content. A collector that forwards what an Otherlode agent sent rarely hits this. The body is one of these:

- `invalid delta batch: <reason>`, `invalid manifest: <reason>`, `invalid static baseline: <reason>` or `invalid class listing: <reason>`. The reason is one of `missing resource`, `resource.service_name is empty`, `resource.service_instance_id is empty`, `resource.run_id is empty`, or `resource.service_name is ".."`. A namespace of `.` or `..` is refused the same way, as `resource.service_namespace is ".."`. A static baseline can also fail with `scanned_at is not set`, `chunk_count must be at least 1`, `chunk_index is negative` or `chunk_index is out of range for chunk_count`. A class listing can fail with `listed_at is not set` or the same three chunk reasons.
- `malformed delta batch`, `malformed manifest`, `malformed static baseline` or `malformed class listing`. The body is not valid protobuf.
- `failed to read body`.

Something other than an agent is posting to the collector, or something changed the payload on the way. Find the sender with the `service` and `instance` fields of the log line. See [the agent's configuration](/docs/agent/configuration) for service names.

### backend returned 413

The server answers `request body too large`. It accepts a request body of at most 16 MiB. A proxy or gateway that you run between the collector and `ingest.otherlode.dev` can also answer 413 with a smaller limit of its own. Raise that limit. If no proxy sits in between, the payload itself is over the limit. See [What the agent sends](/docs/agent/data-sent).

While the collector refuses a run's delta batches, the agent keeps the hits and offers them again. The run's instance shows **Counts behind since** and a date on the **Instances** page, and the top bar's evidence list adds a **Counts behind** fact, until the collector accepts the counts. An instance that never delivered a delta batch shows **No counts received yet**.

### backend returned 429

The server answers `rate limit exceeded` with a `Retry-After` header in whole seconds. Each tenant has one request limit on ingest, shared by all its ingest keys, so a second key adds nothing. A collector that forwards a whole fleet can hit it in a burst.

The collector waits for the `Retry-After` time and sends again, so a 429 that clears is harmless. A payload is lost only when the 5-minute retry budget runs out first. An operator sets each tenant's limit. If a single collector reaches it routinely, email [support@otherlode.dev](mailto:support@otherlode.dev) to ask for a higher one.

### backend returned 502, 503 or 504

The collector retries all three. The server uses 503 for three cases:

- `{"error":"unavailable"}`. The server could not check the key, or could not read whether your tenant requires redacted payloads. This clears on its own.
- The text `unavailable`. The request ended while it waited for the server's first read of your tenant's request limit, as when the sender gave up on it. A failed read of the limit gives no 503. The server applies its default limit and reads your tenant's limit again 5 seconds later.
- An empty body with `Retry-After: 5`. The server could not store a valid payload. The collector waits at least 5 seconds before it sends the payload again.

If the retries run out, the line `dropping payload: retry budget exhausted` follows. A proxy you run can also produce 502 and 504. The collector does not retry a plain 500, and drops that payload at once.

### A request you send with curl

Use a `POST` with `Content-Type: application/x-protobuf`, no `Content-Encoding` other than `identity`, and a key in `Authorization: Bearer <key>`. Two more answers come from a hand-made request:

- `415` with `unsupported content type` or `unsupported content encoding`. The collector never causes this. A proxy that compresses the body, or a different sender, does.
- `405 Method Not Allowed`. The ingest routes take only `POST`.

## A service does not appear in the list

The **Services** page lists a service once a production run has reached the server. It shows `No service has reported yet.` when the tenant has none, and `No service matches the filter.` when the filter box above the table matches none. Work through these causes in order.

### The collector's payloads are refused

If the collector log holds `dropping payload` lines for this service, fix those first. See [the entries above](#the-collector-logs-a-dropped-payload).

### Only test runs have arrived

A test run never lists a service, adds to no count and never enters a finding. An agent with `testRun` on, such as the one the testkit starts, marks every payload as a test run. The evidence list in the top bar of a service that has production runs shows the test runs it holds as the **Test runs** fact, such as `3, latest 2 days ago`. Run the service without `testRun`. See [Name the tests that call your code](/docs/agent/test-runs).

### The key belongs to another tenant

A key names one tenant, and the services it delivers show only in that tenant. If you sign in to a different tenant, the service is missing there. The top bar shows the tenant's name at the right. Click it to see your email and your role. On the **API keys** page of the tenant that should hold the service, find the key's **Prefix**, which reads like `otl_ab12cd34…`, and compare it with the start of the key your collector sends. If it is not there, the key is from another tenant. See [Manage API keys](api-keys) and [Sign-in and sessions](sign-in).

### The service is listed under another name

A service with no name set reports as `unknown_service`. The **Services** page marks it with a **name not set** badge. Other services with no name in the same namespace merge into it. Set `OTHERLODE_SERVICE_NAME` or `OTEL_SERVICE_NAME` on the service, as the badge's tooltip says. A service with no namespace sits under **not named** when other services have a namespace. The filter box matches the namespace or the service name. See [Service identity](/docs/agent/configuration#service-identity).

### The first report has not arrived

The agent sends its first batch at a random point within the first `flushIntervalSeconds`, 60 seconds by default. See [Troubleshooting the agent](/docs/agent/troubleshooting#nothing-reaches-the-collector).

## A finding page is empty or lacks a row you expect

An empty table shows `0 of 0` under it. Some pages add a sentence: `No instances in this scope.` and `No class failed to load in this scope.` A finding is a lead made over the runs in scope, and only for code the server can judge. A row is missing for one of the reasons below. [Findings](findings) says what each finding needs, and [Scope and environments](scope) says what narrows the runs.

### The overview shows no graph

With no run in scope, the graph area reads `No run in scope`. No run matches the scope you picked, and the **Instances** fact in the top bar's evidence list reads `0`. It reads `Nothing judged` when every run that matches the scope is a stripped run, described [below](#an-instance-is-kept-out-of-every-finding). The **Instances** fact then reads like `2, all kept out of every finding`. It reads `No known endpoints or entry methods` when a run is in scope and none of them knows an endpoint or an entry method, which includes a service whose code holds nothing the server judges, such as only inline or generated methods. See [How findings are judged](how-it-works) and [the code path graph](unreached-clusters#the-code-path-graph).

### The page is empty after you change the scope

Every finding covers only the runs in scope: the environment you pick, an optional version, and an optional `active_within_days`. The environment picker in the top bar lists the environments the service reported. A link with an environment the service never reported shows it as `<name> (unknown)` and matches no run. Pick **All environments**, or the right one. The environment `none` reads **not named**. See [Scope and environments](scope).

### Never loaded is empty

**Never loaded** needs a complete static scan. A class is listed only when some in-scope run's latest complete scan declares it and no in-scope run loaded it. The top bar reads `3 instances, 2 with a complete baseline` when one instance has none, and the **Instances** fact in the evidence list reads `3, 2 with a complete baseline`. Turn on `staticBaselineEnabled` in the agent and wait for a scan to finish. A class the scan cannot see, such as one from a WAR deployed after startup, is never listed. See [Never loaded](/docs/agent/classes#never-loaded).

### A class is under Failed to load and not under Never loaded

A class that a run named as failed to load is left out of **Never loaded** and of every class finding. It is a deployment problem and never evidence of unused code. The strip above the overview's graph states `N classes failed to load`, linked to the list. The **Failed to load** item shows only while its count is above zero. See [Failed to load](/docs/agent/classes#failed-to-load).

### A method or condition is not under Never hit

**Never hit** leaves out code the server does not judge. Each kind is kept and shown elsewhere, and never counted in a finding:

- An inline or generated method, such as a data class's `copy`.
- A method or condition the agent reports as an unread shape, which the strip above the overview's graph counts.
- A condition path that is routine. The page then says `1 condition not listed, since its untaken path is routine` or `3 conditions not listed, since their untaken paths are routine`, with a **Show** link.
- A condition inside code that another row of the finding already covers. Deleting the covering code deletes the condition, so the server lists the covering row only.

See [Findings](findings).

### Rows vanish after you set Known for at least or Stale after

Never hit and Stale each have a day filter: **Known for at least (days)** and **Stale after (days)**. A branch outcome with no service-wide dates takes its dates from the in-scope runs, so a day filter cannot prove its age. The page leaves it out and says `1 branch outcome was left out because its dates are not known for the whole service.` or `4 branch outcomes were left out because their dates are not known for the whole service.` The API counts them in `capped_hidden`. Clear the filter to see them. A keyless outcome of an environment that has lost a production run stays out of the list with or without the filter, since the server makes no claim about it. The API counts it in `capped_hidden` too. See [Dates](dates).

### An instance is kept out of every finding

An instance whose latest run came through a collector older than its agent shows a **Collector older than agent** badge on the **Instances** page. The top bar's evidence list adds a **Stripped runs** fact: `1 run, kept out of every finding until the collector matches the agent's version`. The old collector dropped fields it did not know, so the server makes no claim from that run. The badge looks at the latest run only. The evidence list's **Instances** fact counts an instance as kept out of every finding only when every run of it that matches the scope came through such a collector, as in `3, 2 judged with a complete baseline, 1 kept out of every finding`. An instance with a badge can still count as judged through an earlier run. Upgrade the collector to the agent's version. Runs that start after the upgrade count. A service that only such runs reached is still listed.

### A never-called endpoint is missing

An endpoint whose framework module switched itself off reads **Module disabled** in **Endpoints**. Its counts stopped, so it is listed and never named never called or stale. See [Endpoints](/docs/agent/endpoints). The **Endpoints** page lists each switched-off module with the kind of failure and the agent's reason.

### The dependency lists look short

A note above the **Dependencies** table reads `The dependency listing has not fully arrived from 2 instances, so this list may be missing entries.` The listing arrives after startup, so a new instance has none for a while. Two more notes can follow. `No in-scope run records references, so a loaded dependency reads as loaded and only unloaded is judged.` means no run recorded references. `Unreferenced and unreached are not told apart, because some run that judged a dependency has no complete static baseline. Such a dependency reads as no live reference.` means some run has no complete scan. See [Dependencies](/docs/agent/dependencies).

### A finding you did not expect appears on a new service

The top bar shows `watched 12 days` in bold amber. It does so for 30 days after the service first reported, since code that runs weekly or monthly reads as never hit until it runs. Wait for a full cycle of the job before you act on the row. See [Dates](dates).

## A count shows a tilde or says it may change

Four counts in the panel come from the dependency listing: **Unused dependencies**, **Dependencies failed to load**, **Dependencies** and **Absent references**. Each count has a `~` after it while some in-scope instance has not sent its whole listing, and its tooltip reads `The dependency listing is incomplete, so this count may change.` Every dependency the page shows is right. The list can lack some. The count settles when each in-scope run has sent its listing. The **Instances** page shows `incomplete` in the **Dependencies** column for each instance still waiting.

## Sign-in fails

After a failed sign-in, the page **Sign-in did not complete** shows one message above a **Try again** button. [Sign-in and sessions](sign-in) describes the methods and the sessions.

| Message | Cause and fix |
|---|---|
| `The sign-in attempt expired. Try again.` | The sign-in began more than 10 minutes ago, or the browser dropped the cookie it set. Choose **Try again**, and keep the same browser. |
| `The sign-in response did not match this browser. Try again.` | The response does not match the sign-in this browser began, for example because you began a second sign-in in another tab. Begin again and finish in one tab. |
| `Sign-in was cancelled.` | The sign-in page of the identity service reported an error, or you cancelled. Try again. |
| `Sign-in could not be completed. Try again in a moment.` | The server could not finish the exchange or read your user. Try again. |
| `That account is not set up here. An admin or an operator must add your email before you can sign in. If you could sign in here before, ask an admin to delete your user and add it again.` | No user matches your email. It also shows when the tenant is being deleted or its single sign-on link is removed. Ask an admin to add your email. See [Manage users and roles](users). |
| `Your organization requires single sign-on. Sign in again through your company's single sign-on. If you do not see it, ask your admin.` | The tenant enforces single sign-on, and you signed in another way. Use your company's single sign-on. See [Set up single sign-on](sso). |
| `Impersonated sign-ins are not accepted here.` | The sign-in came from an impersonation session. The server refuses these. Sign in as yourself. |
| `That way of signing in is not accepted here. Sign in with Google, Microsoft, GitHub or your company's single sign-on.` | The sign-in used a method such as a password or a magic link. Use one of the four named. |
| `Your sign-in needed one of your organizations picked, and it could not be finished here. Ask your admin for help.` | The identity service asked for one of your organizations to be picked, and the server could not finish the sign-in. Ask an admin to check your single sign-on connection. |
| `Sign-in failed.` | The server sent a code the page does not know. Try again, and ask an admin if it repeats. |

If you can reach more than one tenant, a page titled **Choose a tenant** follows a successful sign-in. It shows `This choice expired. Sign in again.` with a **Back to sign in** link when you wait too long, and `The tenants could not be loaded. Try again in a moment.` when the list fails.

### AuthKit's sign-in page appears with no message

When your session ends, the browser goes to AuthKit's sign-in page and says nothing. A session ends when you sign out, when it sits idle too long, when it reaches its maximum age, when an admin deletes your user, and when the tenant enforces single sign-on and your session did not come through it. Sign in again. See [Sign-in and sessions](sign-in).

### A page shows only the word unavailable

The session check failed on the server, and the page shows the server's answer as plain text, such as `unavailable`. Reload the page. The text `internal error` means the server failed on that request. It is not about your session.

### Sign-out failed

A red line reads `Sign-out failed, so you are still signed in. Try again.` The server did not end the session. Choose **Sign out** again, in the menu under your tenant's name in the top bar.

## A page says only admins can see it

```text
Only admins can see this page.
```

This replaces **Users**, **API keys**, **Single sign-on**, **Redaction** and **Audit log** for a viewer. A viewer reads everything in the tenant and changes nothing. Ask an admin to change your role on the **Users** page, then reload the page. See [Manage users and roles](users).

## The API answers 401 or 403

Every body is JSON, in the shape `{"error":"<message>"}`. The read API sits under `/api/v1/` on `app.otherlode.dev` and takes `Authorization: Bearer <key>` with a `read` key. See [Read API](api).

| Status | Body | Cause and fix |
|---|---|---|
| 401 | `{"error":"unauthorized"}` | No `Authorization` header, a header that is not `Bearer <key>`, or a key that is unknown or revoked. A request that has an `Authorization` header never falls back to a session cookie, even an empty header. |
| 403 | `{"error":"this route needs a read key"}` | The key has the `ingest` scope. Create a `read` key. |
| 403 | `{"error":"this needs an admin"}` | The request has no admin session. The audit log and the admin routes answer an admin's browser session only, never a key. Use the UI. |
| 403 | `{"error":"cross-origin request"}` | A browser session sent a change from another site. Make the change from the app itself. |
| 404 | `{"error":"service not found"}` | The tenant has no service at that namespace and name. Check the `namespace` and `service` parts of the path against the **Services** page. A service with no production run is not listed. |
| 503 | `{"error":"unavailable"}` | The server could not check the key. Retry. |

A key never has a role, so `/api/v1/me` answers `"user":null` for a key.

### The API answers 400

A query parameter is wrong. The body names it, for example `limit must be between 1 and 5000`, `offset must be 0 or greater`, `active_within_days must be a whole number from 1 to 36500`, `days must be a whole number from 1 to 36500`, `routine must be "exclude" or "include"`, or `kind must be "method" or "branch"`. Fix the parameter. [Read API](api) lists each route's parameters.
