---
title: Troubleshooting
description: Find the cause of a refused forward, a missing service or finding, a count with a tilde, a sign-in error or an API error, organised by what you see.
order: 150
---

Every entry starts from something you see: a collector log line, an empty page, a message or an HTTP status. Each gives the text as Otherlode shows it, the cause, and the fix. Each fix links the page that owns the detail.

Otherlode has two hostnames. Collectors send to `https://ingest.otherlode.dev`. People and scripts use `https://app.otherlode.dev`, which serves the web app and the read API. Each hostname answers only its own routes.

## The collector logs a dropped payload

The collector writes one JSON line to standard output for each payload Otherlode refuses for good. The line is at level `WARN`, so the collector's default log level shows it:

```json
{"time":"2026-10-07T09:12:44.512Z","level":"WARN","msg":"dropping payload: permanent failure","namespace":"","service":"checkout","instance":"3f1c9a","path":"/v1/otherlode/deltas","error":"backend returned 401 Unauthorized"}
```

The `error` field ends with the status Otherlode sent. The `path` field names the payload: `/v1/otherlode/deltas`, `/v1/otherlode/manifest`, `/v1/otherlode/static-baseline` or `/v1/otherlode/class-listing`. The collector logs only the status and never the response body, so the bodies below are what you see when you call ingest with `curl`.

The collector retries 429, 502, 503, 504 and a failed connection. It drops any other non-2xx answer at once with `dropping payload: permanent failure`. After 5 minutes of retries, by default, it drops the payload with `dropping payload: retry budget exhausted`. [Send data from your collector](connect) covers the setup.

### backend returned 401

Otherlode answers `{"error":"unauthorized"}`. The forward token is missing, or no live API key matches it. The cause is one of these:

- The collector has no forward token, or it holds a value that is not an API key. Keys start with `otl_`.
- The key was revoked. Revoked keys show as **Revoked** on the **API keys** page.

Create an ingest key on the **API keys** page, then set it as the collector's forward token, `OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN` or the file `OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN_FILE` names. The collector reads that file again every 30 seconds. It reads the variable only at start, so restart the collector after you change it. See [Manage API keys](api-keys).

### backend returned 403

Otherlode answers 403 with one of three bodies. The collector logs only the status, so work through them in order. If your tenant does not [require redacted payloads](require-redaction), only the first applies. If it does, the **Refused payloads** table on the **Redaction** page in the admin area counts the other two by reason.

Otherlode answers `{"error":"this route needs an ingest key"}` when the key is valid but has the `read` scope, and ingest takes only an `ingest` key. A `read` key cannot send reports, and an `ingest` key cannot read anything back. Replace the forward token with an `ingest` key. See [Manage API keys](api-keys).

#### redaction_required

Otherlode answers `{"error":"redaction_required"}`. Your tenant requires redacted payloads, and the payload carried no fingerprint in its `Otherlode-Redaction` header, or carried one that is not 16 lowercase hex characters. The sender is one of these:

- A collector with redaction off. Turn redaction on with your tenant's secret. See [Blank out string literals](/docs/collector/redaction).
- An agent that sends straight to `ingest.otherlode.dev`, such as a test JVM. It sends the payload again at each flush and logs a `WARNING` each time. Point it at a collector with redaction on.
- A proxy between the collector and Otherlode that drops the header. Let it pass `Otherlode-Redaction` through.

The `service` and `instance` fields of the collector's log line name the agent whose payload was refused.

#### redaction_secret_mismatch

Otherlode answers `{"error":"redaction_secret_mismatch"}`. The payload came through a collector with redaction on, but its secret differs from the one whose fingerprint your tenant requires. Compare the `secret_fingerprint` the collector logs at startup with the fingerprint on the **Redaction** page. Then give the collector the same secret as your other collectors, or, if you changed the secret on purpose, change the fingerprint. See [Change the fingerprint](require-redaction#change-the-fingerprint).

A refused payload is dropped and never stored, and the collector does not send it again.

### backend returned 404

Otherlode answers `404 page not found`. The collector's forward URL does not reach the ingest routes. The cause is one of these:

- The forward URL names `app.otherlode.dev`. The app hostname does not serve ingest.
- The forward URL has a path after the hostname. The collector adds `/v1/otherlode/deltas`, `/v1/otherlode/manifest`, `/v1/otherlode/static-baseline` and `/v1/otherlode/class-listing` to the URL it holds.
- A proxy between the collector and Otherlode drops those paths.

Set the forward URL to `https://ingest.otherlode.dev` and nothing more, in `OTHERLODE_COLLECTOR_FORWARD_URL`.

### backend returned 400

Otherlode rejected the content. A collector that forwards what an Otherlode agent sent rarely hits this. The body is one of these:

- `invalid delta batch: <reason>`, `invalid manifest: <reason>`, `invalid static baseline: <reason>` or `invalid class listing: <reason>`. The reason is one of `missing resource`, `resource.service_name is empty`, `resource.service_instance_id is empty`, `resource.run_id is empty`, or `resource.service_name is ".."`. A namespace of `.` or `..` is refused the same way, as `resource.service_namespace is ".."`. A value over 1024 bytes in `service_name`, `service_version`, `service_instance_id`, `environment`, `run_id`, `service_namespace` or `agent_version` is refused with the field and its length, as in `resource.run_id is 5000 bytes, over the 1024-byte limit`. A static baseline can also fail with `scanned_at is not set`, `chunk_count must be at least 1`, `chunk_index is negative` or `chunk_index is out of range for chunk_count`. A class listing can fail with `listed_at is not set` or the same three chunk reasons.
- `malformed delta batch`, `malformed manifest`, `malformed static baseline` or `malformed class listing`. The body is not valid protobuf.
- `failed to read body`.

Something other than an agent is posting to the collector, or something changed the payload on the way. Find the sender with the `service` and `instance` fields of the log line. See [the agent's configuration](/docs/agent/configuration) for service names.

### backend returned 413

Otherlode accepts a request body of at most 16 MiB. It also refuses a payload with more entries than the limit for its kind, whatever its size. The collector logs only the status, not which of the two it was. [Read what ingest answers](connect#read-what-ingest-answers) lists the limits. A proxy or gateway that you run between the collector and `ingest.otherlode.dev` can also answer 413 with a smaller limit of its own. Raise that limit. If no proxy sits in between, the payload itself is over the limit. See [What the agent sends](/docs/agent/data-sent).

For `payload has too many elements`, the agent splits its payloads far below the limits, except that it never splits a class. So a refusal means one class with more entries than the limit, or a sender that isn't an agent. Email [support@otherlode.dev](mailto:support@otherlode.dev) with the time of the collector's warning. An operator can find the refusal, which Otherlode counts and logs with your tenant. A class that large cannot be sent.

While the collector refuses a run's delta batches, the agent keeps the hits and offers them again. The run's instance shows **Counts behind since** and a date on the **Instances** page, and the evidence list adds a **Counts behind** fact, until the collector accepts the counts. An instance that never delivered a delta batch shows **No counts received yet**.

### backend returned 429

Otherlode answers `rate limit exceeded` with a `Retry-After` header in whole seconds. Each tenant has one request limit on ingest, shared by all its ingest keys, so a second key adds nothing. A collector that forwards a whole fleet can hit it in a burst.

The collector waits for the `Retry-After` time and sends again, so a 429 that clears is harmless. A payload is lost only when the 5-minute retry budget runs out first. An operator sets each tenant's limit. If a single collector reaches it routinely, email [support@otherlode.dev](mailto:support@otherlode.dev) to ask for a higher one.

### backend returned 502, 503 or 504

The collector retries all three. Otherlode uses 503 for four cases:

- `{"error":"unavailable"}`. Otherlode could not check the key, or could not read whether your tenant requires redacted payloads. This clears on its own.
- The text `unavailable`. The request ended while it waited for Otherlode's first read of your tenant's request limit, as when the sender gave up on it. A failed read of the limit gives no 503. Otherlode applies its default limit and reads your tenant's limit again 5 seconds later.
- An empty body with `Retry-After: 5`. Otherlode could not store a valid payload. The collector waits at least 5 seconds before it sends the payload again.
- An empty body with `Retry-After: 1`. Otherlode was busy with other payloads. The collector waits at least a second before it sends the payload again.

If the retries run out, the line `dropping payload: retry budget exhausted` follows. A proxy you run can also produce 502 and 504. The collector does not retry a plain 500, and drops that payload at once.

### A request you send with curl

Use a `POST` with `Content-Type: application/x-protobuf`, no `Content-Encoding` other than `identity`, and a key in `Authorization: Bearer <key>`. Two more answers come from a hand-made request:

- `415` with `unsupported content type` or `unsupported content encoding`. The collector never causes this. A proxy that compresses the body, or a different sender, does.
- `405 Method Not Allowed`. The ingest routes take only `POST`.

## A service does not appear in the list

The **Services** page lists a service once a production run has reached Otherlode. It shows `No service has reported yet.` when the tenant has none, and `No service matches the filter.` when the filter matches none. Work through these causes in order.

### The collector's payloads are refused

If the collector log holds `dropping payload` lines for this service, fix those first. See [the entries above](#the-collector-logs-a-dropped-payload).

### Only test runs have arrived

A test run never lists a service, adds to no count and never enters a finding. An agent with `testRun` on, such as the one the testkit starts, marks every payload as a test run. The evidence list of a service that has production runs shows the test runs it holds as the **Test runs** fact. Run the service without `testRun`. See [Name the tests that call your code](/docs/agent/test-runs).

### The key belongs to another tenant

A key names one tenant, and the services it delivers show only in that tenant. If you sign in to a different tenant, the service is missing there. The tenant menu in the top bar names the tenant you're signed in to. On the **API keys** page of the tenant that should hold the service, find the key's **Prefix**, which reads like `otl_ab12cd34…`, and compare it with the start of the key your collector sends. If it is not there, the key is from another tenant. See [Manage API keys](api-keys) and [Sign-in and sessions](sign-in).

### The service is listed under another name

A service with no name set reports as `unknown_service`. The **Services** page marks it with a **name not set** badge. Other services with no name in the same namespace merge into it. Set `OTHERLODE_SERVICE_NAME` or `OTEL_SERVICE_NAME` on the service. A service with no namespace sits under **not named** when other services have a namespace. See [Service identity](/docs/agent/configuration#service-identity).

### The service is not tracked

A service that a production run reached can be missing from the **Services** list and the `services` array of `GET /services` and still have its runs stored. Your plan tracks a fixed number of services, and a service past that number is not tracked. The read API lists it in `not_tracked_services`, and each of its per-service routes answers `404` with `{"error":"service not tracked"}`.

The collector logs a `WARN` line for each of its payloads, at most once an hour for each service, and counts them in `otherlode_collector_forward_notices_total` with the label `notice="service-over-cap"`:

```text
{"time":"2026-10-29T08:28:22.418Z","level":"WARN","msg":"backend stores the service's payloads but does not track the service, because the tenant's plan tracks no more services","notice":"service-over-cap","namespace":"","service":"checkout"}
```

The collector's [troubleshooting page](/docs/collector/troubleshooting#otherlode-stores-a-payload-but-does-not-track-it) describes the line. A change to a collector setting does not clear it. The service takes a slot when one is free, which happens when your plan changes, an operator raises your cap, or a tracked service has sent no production run for 30 days and this service needs its slot. A service name built from a pod name creates a new service on every restart, so give the service a fixed name. See [Scope and environments](scope#your-plan-tracks-a-fixed-number-of-services).

### The first report has not arrived

The agent sends its first batch at a random point within the first `flushIntervalSeconds`, 60 seconds by default. See [Troubleshooting the agent](/docs/agent/troubleshooting#nothing-reaches-the-collector).

## A finding page is empty or lacks a row you expect

Some pages say `No instances in this scope.`, `No class failed to load in this scope.` and `No class failed to initialise in this scope.` A finding is a lead made over the runs in scope, and only for code Otherlode can judge. A row is missing for one of the reasons below. [Findings](findings) says what each finding needs, and [Scope and environments](scope) says what narrows the runs.

### The overview shows no graph

With no run in scope, the graph area reads `No run in scope`. No run matches the scope you picked, and the **Instances** fact in the evidence list reads `0`. It reads `Nothing judged` when every run that matches the scope is a stripped run, described [below](#an-instance-is-kept-out-of-every-finding). The **Instances** fact then reads like `2, all kept out of every finding`. It reads `No endpoints or entry methods to draw` when a run is in scope and none of them knows an entry method, or an endpoint that is not an [outside route](findings#outside-routes), which includes a service whose code holds nothing Otherlode judges, such as only inline or generated methods. When a run reported a framework marker, Otherlode's label for it follows, such as `A grpc-java server started`: routing the agent does not count was set up in that run. See [Routing whose routes are not counted](inventory#routing-whose-routes-are-not-counted), [How findings are judged](how-it-works) and [the code path graph](unreached-clusters#the-code-path-graph).

### The report stays old or its refresh keeps failing

Otherlode stops computing a scope's call graph when it resolves to more than 200,000 calls, or takes more work than one graph may use. A service with many calls through an interface that has hundreds of implementations can pass that limit. Each refresh of the scope then fails, an hour apart. A scope that already has a report keeps it, and its **As of** time grows older. A scope with no report says `Last refresh failed`. A read API route that computes the graph when you call it, such as `/call-edges`, answers 500 for that scope. Email [support@otherlode.dev](mailto:support@otherlode.dev) with the service's namespace, name and environment.

### The page is empty after you change the scope

Every finding covers only the runs in scope: the environment you pick, an optional version, and an optional `active_within_days`. The **Environment** picker lists the environments the service reported. A link with an environment the service never reported shows it as `<name> (unknown)` and matches no run. Pick **All environments**, or the right one. The environment `none` reads **not named**. See [Scope and environments](scope).

### Never loaded is empty

**Never loaded** needs a complete static scan. A class is listed only when some in-scope run's latest complete scan declares it and no in-scope run loaded it. The top bar reads `3 instances, 2 with a complete baseline` when one instance has none, and the **Instances** fact in the evidence list reads `3, 2 with a complete baseline`. Turn on `staticBaselineEnabled` in the agent and wait for a scan to finish. A class the scan cannot see, such as one from a WAR deployed after startup, is never listed. See [Never loaded](/docs/agent/classes#never-loaded).

### A class is under Failed to load and not under Never loaded

A class that a run named as failed to load is left out of **Never loaded** and of every class finding. It is a deployment problem and never evidence of unused code. The overview states `N classes failed to load`. The **Failed to load** item shows only while its count is above zero. See [Failed to load](/docs/agent/classes#failed-to-load).

### A class is under Failed to initialise and not under Never initialised

A class that some run in scope named as failed to initialise, or whose supertype it names, is left out of **Never initialised**, **Never instantiated**, **Never hit** and the clusters when no run in scope initialised it. The JVM defined the class and it can never run, so it is a deployment problem and never evidence of unused code. Its hits still stand. The overview states `N classes failed to initialise`, and the **Failed to initialise** item shows only while its count is above zero. The **Reasons** column says whether its static initialiser threw or the verifier rejected it, and **Carried from** names the supertype a subclass fails with. See [Failed to initialise](/docs/agent/classes#failed-to-initialise).

### A method or endpoint reads without evidence

A method or condition with no hits that is not under **Never hit**, and an endpoint that reads **Without evidence** instead of **Never called**, have no run that is evidence for the zero count. The overview states `N methods, conditions and endpoints without evidence`, and `N instances with the verifier unwatched` or `N instances with an unplaced verification failure` for the runs behind them. An unwatched run is one whose agent could not install its hook on the JVM's `VerifyError`. The agent logs one `WARNING` for it. A run with an unplaced verification failure reported a `VerifyError` message that the agent could not read, or had no room to keep. Neither kind of run makes a zero-count claim. The claim returns when a run that is evidence reports the same code, for example after the instance restarts.

A third cause is a skipped class, which the overview counts by instance as `N instances skipped a class` while a run in scope skipped it, and by class as `N skipped classes` for every skipped class with code in scope, which on a read that names no version and no seen-within window also counts a class whose skipping run has expired. The agent skipped the class because it could not instrument it, or because the class's manifest entries are too large to send, and a skipped class sends no hits. The hits it did not send could be the ones that ran, so Otherlode makes no zero-count claim about the class in any run. On a read that names no version and no seen-within window, the claim stays withheld after the run that skipped the class expires, until an operator deletes the environment. A read that names a version or a seen-within window weighs only the skips of the runs it selects. The agent logs one `WARNING` for each skipped class, such as `instrumentation failed for <class>, class will run uninstrumented`. Read the reason in the log, and fix what blocks the class: a supertype its loader cannot serve, or a class too large for the collector's limits. A restart that skips nothing does not clear the record. Ask an operator to delete the environment when you have fixed the cause and want its claims back. An endpoint is not withheld for a skipped class. See [Without evidence](findings#without-evidence) and, for the agent's side, [Skipped classes](/docs/agent/classes#skipped-classes) and [Rejected by the verifier](/docs/agent/classes#rejected-by-the-verifier).

### A method or condition is not under Never hit

**Never hit** leaves out code Otherlode does not judge. Each kind is kept and shown elsewhere, and never counted in a finding:

- An inline or generated method, such as a data class's `copy`.
- A method or condition the agent reports as an unread shape, which the overview counts.
- A condition path that is routine. The page then says `1 condition not listed, since its untaken path is routine` or `3 conditions not listed, since their untaken paths are routine`, with a **Show** link.
- A condition inside code that another row of the finding already covers. Deleting the covering code deletes the condition, so Otherlode lists the covering row only.

See [Findings](findings).

### Rows vanish after you set Known for at least or Stale after

Never hit and Stale each have a day filter: **Known for at least (days)** and **Stale after (days)**. A branch outcome with no service-wide dates takes its dates from the in-scope runs, so a day filter cannot prove its age. The page leaves it out and says `1 branch outcome was left out because its dates are not known for the whole service.` or `4 branch outcomes were left out because their dates are not known for the whole service.` The API counts them in `capped_hidden`. Clear the filter to see them. A keyless outcome of an environment that has lost a production run stays out of the list with or without the filter, since Otherlode makes no claim about it. The API counts it in `capped_hidden` too. See [Dates](dates).

### An instance is kept out of every finding

An instance whose latest run came through a collector older than its agent shows a **Collector older than agent** badge on the **Instances** page. The evidence list adds a **Stripped runs** fact: `1 run, kept out of every finding`. The old collector dropped fields it did not know, so Otherlode makes no claim from that run. The badge looks at the latest run only. The evidence list's **Instances** fact counts an instance as kept out of every finding only when every run of it that matches the scope came through such a collector, as in `3, 2 judged with a complete baseline, 1 kept out of every finding`. An instance with a badge can still count as judged through an earlier run. Upgrade the collector to the agent's version, as the [collector's troubleshooting](/docs/collector/troubleshooting) describes. Runs that start after the upgrade count. A service that only such runs reached is still listed.

### A never-called endpoint is missing

An endpoint whose framework module switched itself off reads **Module disabled** in **Endpoints**. Its counts stopped, so it is listed and never named never called or stale. See [Endpoints](/docs/agent/endpoints). The **Endpoints** page lists each switched-off module with the kind of failure and the agent's reason.

### The dependency lists look short

The **Dependencies** page says `The dependency listing has not fully arrived from 2 instances.` The listing arrives after startup, so a new instance has none for a while. Two more notes can follow: `No in-scope run records references, so a loaded dependency reads as loaded and only unloaded is judged.` and `Unreferenced and unreached are not told apart, because some run that judged a dependency has no complete static baseline. Such a dependency reads as no live reference.` See [Dependencies](/docs/agent/dependencies).

### A finding you did not expect appears on a new service

The top bar shows `watched 12 days` in amber. It does so for 30 days after the service first reported, since code that runs weekly or monthly reads as never hit until it runs. Wait for a full cycle of the job before you act on the row. See [Dates](dates).

## A count shows a tilde

Five counts in the panel come from the dependency listing: **Unused dependencies**, **Dependencies failed to load**, **Dependencies failed to initialise**, **Dependencies** and **Absent references**. Each count has a `~` after it while some in-scope instance has not sent its whole listing. Every dependency the page shows is right. The list can lack some. The count settles when each in-scope run has sent its listing. The **Instances** page shows `incomplete` in the **Dependencies** column for each instance still waiting.

## Sign-in fails

After a failed sign-in, the page **Sign-in did not complete** shows one of the messages below and a **Try again** button. [Sign-in and sessions](sign-in) describes the methods and the sessions.

| Message | Cause and fix |
|---|---|
| `The sign-in attempt expired. Try again.` | The sign-in began more than 10 minutes ago, or the browser dropped the cookie it set. Choose **Try again**, and keep the same browser. |
| `The sign-in response did not match this browser. Try again.` | The response does not match the sign-in this browser began, for example because you began a second sign-in in another tab. Begin again and finish in one tab. |
| `Sign-in was cancelled.` | The sign-in page of the identity service reported an error, or you cancelled. Try again. |
| `Sign-in could not be completed. Try again in a moment.` | Otherlode could not finish the exchange or read your user. Try again. |
| `That account is not set up here. An admin or an operator must add your email before you can sign in. If you could sign in here before, ask an admin to delete your user and add it again.` | No user matches your email. It also shows when the tenant is being deleted or its single sign-on link is removed. Ask an admin to add your email. See [Manage users and roles](users). |
| `Your organization requires single sign-on. Sign in again through your company's single sign-on. If you do not see it, ask your admin.` | The tenant enforces single sign-on, and you signed in another way. Use your company's single sign-on. See [Set up single sign-on](sso). |
| `Impersonated sign-ins are not accepted here.` | The sign-in came from an impersonation session. Otherlode refuses these. Sign in as yourself. |
| `That way of signing in is not accepted here. Sign in with Google, Microsoft, GitHub or your company's single sign-on.` | The sign-in used a method such as a password or a magic link. Use one of the four named. |
| `Sign-in needs one of your organizations picked, which this page cannot do. Ask your admin.` | The identity service asked for one of your organizations to be picked and Otherlode could not finish the sign-in, or it returned a single sign-on sign-in with no organization. Ask an admin to check your single sign-on connection. |
| `Sign-in failed.` | Otherlode sent a code the page does not know. Try again, and ask an admin if it repeats. |

If you can reach more than one tenant, a page titled **Choose a tenant** follows a successful sign-in. It shows `This choice expired. Sign in again.` with a **Back to sign in** link when you wait too long, and `The tenants could not be loaded. Try again in a moment.` when the list fails.

### AuthKit's sign-in page appears with no message

When your session ends, the browser goes to AuthKit's sign-in page and says nothing. A session ends when you sign out, when it sits idle too long, when it reaches its maximum age, when an admin deletes your user, and when the tenant enforces single sign-on and your session did not come through it. Sign in again. See [Sign-in and sessions](sign-in).

### A page shows only the word unavailable

The session check failed, and the page shows Otherlode's answer as plain text, such as `unavailable`. Reload the page. The text `internal error` means Otherlode failed on that request. It is not about your session.

### Sign-out failed

The page reads `Sign-out failed, so you are still signed in. Try again.` Otherlode did not end the session. Choose **Sign out** again in the tenant menu.

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
| 403 | `{"error":"this needs an admin"}` | The request has no admin session. The audit log and the admin routes answer an admin's browser session only, never a key. Use the web app. |
| 403 | `{"error":"cross-origin request"}` | A browser session sent a change from another site. Make the change from the web app itself. |
| 404 | `{"error":"service not found"}` | The tenant has no service at that namespace and name. Check the `namespace` and `service` parts of the path against the **Services** page. A service with no production run is not listed. |
| 503 | `{"error":"unavailable"}` | Otherlode could not check the key. Retry. |

A key never has a role, so `/api/v1/me` answers `"user":null` for a key.

### The API answers 400

A query parameter is wrong. The body names it, for example `limit must be between 1 and 5000`, `offset must be 0 or greater`, `active_within_days must be a whole number from 1 to 36500`, `days must be a whole number from 1 to 36500`, `routine must be "exclude" or "include"`, or `kind must be "method" or "branch"`. Fix the parameter. [Read API](api) lists each route's parameters.
