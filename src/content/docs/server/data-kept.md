---
title: What the server keeps
description: What the server stores from each payload, about people and about API keys, how tenants are kept apart, what an operator removes on request, and what the server sweeps on its own.
order: 130
---

The server stores what your collector forwards, what it needs to know about the people who sign in, and a record of changes to your tenant. It deletes runs once they pass your tenant's retention period, and it deletes other reported data only when an operator removes it on your request. It also sweeps three other things on a daily schedule: ended sessions, expired tenant choices and old client addresses in the audit log.

## What the server stores from a payload

The server stores each payload under the tenant that owns the ingest key it arrived with. [What the agent sends](/docs/agent/data-sent) lists every field of every payload. The server does not redact. A collector with redaction on removes fields before they arrive, and the server stores what is left.

| Payload | What the server keeps |
|---|---|
| Any payload | The service namespace and name, the instance ID, the run ID, the service version, the environment, the test-run flag and the agent version. A payload from a run whose `fields_stripped` flag is set marks the run as stripped for good. |
| Delta batch | The cumulative count for each probe, endpoint and dependency, for its run. The server merges a count with `max()` within a run, so a repeated or late batch changes nothing. A final flush marks the run as ended cleanly. |
| Any delta batch or manifest | The run's delivery state. The run keeps whether a delta batch has arrived, which only a delta batch sets and which never reverts, and the highest `payload_sequence` it has sent. A delta batch or manifest with a higher sequence sets whether the run's counts are pending. A delta batch moves the state only after the server stored all of its counts. The run is marked as behind from the time the server received the first payload that said some counts are pending, until a payload with a higher sequence says none are. A payload with a lower or equal sequence changes nothing. |
| Probe manifest | What the ids in a delta batch name: class, method and parameter names, source file names and lines, call edges, referenced classes, branch sites with their condition text, endpoint route templates, dependencies with their jar locations, and the skipped, failed and unreported classes with the reasons the agent gave. |
| Static baseline chunk | The classes the scan declared, with their methods, call edges, branch sites and references, and the classes it could not read. A scan counts as complete when every chunk has arrived. |

A string literal in a condition and a jar path are stored as the agent sent them. A test run is stored too, but it never lists a service. See [Test runs](/docs/agent/test-runs).

The server stores some code that it never judges: inline, generated, routine and unread-shape code, and every run that carried `fields_stripped`. These are kept and shown, and they never count in a dead-code claim. [How findings are judged](how-it-works) explains why.

### Dates come from the server's clock

The server dates every first and last hit by the time a payload arrived, not by a time the agent sent. It keeps those dates once per service and environment, not per run. A date moves earlier or later only, never back. Expiry and pruning do not touch them. [Dates](dates) describes each one.

## How runs are kept apart

Each process has its own run ID, and the server keeps every run's rows apart. A restart starts a new run and never overwrites an earlier one. That holds under a pinned instance ID, and it holds when the new process reports a different service version. The instance then has both runs, each with its own version, and the earlier run stays until it expires or an operator removes it.

A run takes its environment and its test-run flag from its first payload. It takes its version from the first payload that carries one, and an empty version never replaces a known one. See [Scope and environments](scope).

A run keeps which classes it loaded and its own counts. What it reported about each class is stored once per service and shared by every run that reported the same content, so a restart of a build the service has already reported adds little. A class record that no run names is deleted when an expiry, a prune or an environment deletion removes the last run that named it.

## What the server stores about people

For each user, the server stores:

- The email address.
- The role, `admin` or `viewer`.
- The WorkOS user ID, once the person first signs in.
- When the user was created and when the person last signed in.

The server stores no name and no profile picture, even when the sign-in provider shares them. A person who has users in two tenants has two separate users. For a tenant it also stores the name, whether SSO is enforced, whether just-in-time provisioning is on, the link to its WorkOS organization, and its verified email domains.

For each session, the server stores a hash of the cookie's value, never the value. It also stores whether the session was made through SSO, when it was made, and when it was last used. A session stops working when it ends, as [Sign-in and sessions](sign-in) lists. A sign-out and the removal of a user delete the session's row at once. The daily sweep deletes the rows of sessions that ended by idle time or age.

While a person chooses a tenant on the tenant picker, the server holds a tenant choice. It holds the WorkOS user ID, the email when WorkOS verified it, the tenants on offer and the page to open afterwards. The browser holds only a random token, and the server keeps a hash of it. A tenant choice expires after 5 minutes and works once.

### The audit log

Each tenant has an audit log that its admins read. An event holds the time, the actor, the action, the target and a few details. The server copies the actor's name when it writes the event. Deleting a user or revoking a key therefore leaves the events that name them. The server keeps audit events for as long as the tenant exists.

An event that a person's browser request caused also holds the client's IP address. The server clears that address when the event is more than a year old and keeps the rest of the event. The **IP** column then reads "No address was recorded". See [Audit log](audit-log).

## What the server stores about API keys

The server stores only the SHA-256 hash of an API key and its prefix, `otl_` followed by 8 characters. It also stores the key's name, its scope, when it was created and, for a revoked key, when it was revoked. It shows you the plaintext once, when you create the key, and cannot show it again. A revoked key stays on record with its revoke time and never authenticates again. See [Manage API keys](api-keys).

## How tenants are kept apart

An ingest key belongs to one tenant, so every payload that arrives already names its tenant. A person's session names one tenant too. The server takes the tenant from the key or the session and never from the request.

Every query that reads or writes tenant data filters by tenant. The database adds a second check. It shows a request only the rows of the tenant that the request belongs to, so a query that missed its filter would still read nothing from another tenant.

## What the server deletes on a schedule

The server deletes runs on a schedule, by each tenant's retention period. A service that goes quiet stays in the service list with its dates. The scope parameter `active_within_days` only narrows what a read shows. It deletes nothing. See [Scope and environments](scope).

### The retention period

Each tenant has a retention period. The default is 30 days. It can be from 7 to 3650 days. An operator sets it for the tenant. Once a day the server deletes, for each tenant:

- Every run not seen within the period. A run counts as seen when its latest delta batch arrived. A run that still reports is kept whole, however long ago it started, because its counts are cumulative and cannot be split by date.
- Every test run that a newer run of the same test instance has replaced, whatever its age. A newer run replaces a test run when it started after the test run last reported, so test runs that share an instance ID and overlap are all kept. A read of test callers uses the newest test run, the newest unstripped one and the one with the newest complete scan of each test instance. A test run that such a read uses is kept.
- Every instance left with no run.
- Every stored class that no run names.

Services, environments and their dates stay. So does every service-wide record: the first and last hit of each location and endpoint, the classes each environment has loaded, and the last time each dependency loaded a class. A finding that code has had no hit for longer than the period therefore stays as sound as a newer one. What goes is per-run detail: hit counts, call edges, and the per-instance and per-version views. Code can show 0 hits beside a last-hit date. A read that names a version or a seen-within window answers for the runs it selects, so it cannot see past the period. See [Dates](dates) and [Scope and environments](scope).

An expiry that removes anything records one **Runs expired** event for the tenant in your [audit log](audit-log). Changing the period records **Retention period set**. Deleted rows leave database backups within 7 days.

### Other sweeps

The server deletes three other things once a day.

| What | When it is deleted |
|---|---|
| A session | After 7 days without use, or 30 days after sign-in, whichever comes first. |
| A tenant choice | After it expires, 5 minutes after it starts. |
| An audit event's client address | When the event is more than a year old. The rest of the event stays. |

Each deletion happens within a day of its cutoff. A session that has ended stops working at once, whether or not the sweep has removed its row.

## What an operator removes on request

An operator is a person who runs the hosted service. To ask for any removal below except expiry, email [support@otherlode.dev](mailto:support@otherlode.dev). Expiry runs every day without a request. Expiry, deleting a service, deleting an environment and a prune that removes something each record an event in your audit log.

| Removal | What goes | What stays |
|---|---|---|
| Delete a service | The service, its instances and runs, and its dates in every environment. | Every other service. |
| Delete an environment | The environment's runs and dates, then every instance left with no run. | The service and its other environments. |
| Prune old runs | Every run whose last delta batch is older than the number of days the operator names, then every instance left with no run, then every stored class that no run names. A run counts as seen when its latest delta batch arrived. | Every service, every date, and the names of the classes each environment has loaded. |
| Expire old runs | Every run whose latest delta batch is older than the tenant's retention period, every test run that a newer run of the same test instance replaced after it last reported, then every instance left with no run, then every stored class that no run names. It runs daily, tenant by tenant. | Every service, every date, every service-wide record, and every run seen within the period. |
| Delete a tenant | Everything the tenant holds: users, sessions, API keys, reported data and the audit log. The server ends the tenant's sessions and revokes its keys first. | Nothing of the tenant. |

A prune covers the runs of every tenant at once, and an operator runs it by hand. After a prune or an expiry removes a production run of an environment, a condition outcome without a branch key makes no never-hit claim in that environment, since the removed run may hold its only hit. [Dates](dates#capped-dates) explains why. An agent that still reports in a deleted environment brings the environment back with a new run and fresh dates.

Deleted rows stay in database backups for up to 7 more days. The [privacy policy](/privacy) covers what else is kept, including logs and the records WorkOS holds.

## Related

- [What the agent sends](/docs/agent/data-sent) lists the fields of each payload.
- [Sign-in and sessions](sign-in) lists the ways a session ends.
- [Audit log](audit-log) lists every action and actor kind.
- [Dates](dates) explains why dates outlive runs.
