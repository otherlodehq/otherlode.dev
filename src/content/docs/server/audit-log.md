---
title: Audit log
description: What the audit log records, who can read it, how each action and actor reads in the UI, and when an event's client address is cleared.
order: 60
---

The audit log records who signed in to your tenant and who changed who can reach it or what it holds. Operator actions on your tenant are in it too, because the question a log answers is who touched your data, and the operator is one of the answers. The log is the **Audit log** page in the admin area at `https://app.otherlode.dev`.

## Who can read it

Only an admin reads the log. Open **Admin** in the top bar, then **Audit log**. A viewer who opens the page sees "Only admins can see this page." An API key cannot read it. [Manage users and roles](users) covers the roles.

Every event belongs to one tenant. An admin sees the events of their own tenant and no other.

## What the page shows

The page lists events newest first in a table with six columns.

| Column | Shows |
|---|---|
| **Time** | When the server recorded the event, to the second, in UTC, such as `2026-10-07 09:14:03 UTC`. Hover the time to see how long ago it was. |
| **Actor** | Who did it. A note in parentheses follows the name for some [actor kinds](#actors). |
| **Action** | The action's label, with its dotted name in small type under it. |
| **Target** | What the action changed, such as a user's email or a key's name. An en dash means the event has no target. |
| **IP** | The client address of the browser request that caused the event. An en dash means no address was recorded. |
| **Details** | Facts about the event as `name: value` pairs separated by semicolons. A change reads `from → to`, such as `viewer → admin`. An en dash means the event has no details. |

The page loads 50 events. While more events follow, a **Load more** button under the table adds the next 50. A tenant with no events shows "Nothing has been recorded yet." The page has no filter, so it always lists every action and actor.

A target that would pass 512 characters, such as a very long service name, is cut and ends with an ellipsis. The server never puts a secret, an API key, or a token in an event.

## Actors

The actor is the person or system that made the change. The page writes a note after the name for three kinds. A user and an operator read clearly by name alone.

| Actor kind | The page shows | Meaning |
|---|---|---|
| User | The user's email | A person signed in to your tenant, an admin using the web UI, or a person whose own login caused the event. |
| Directory sync | "WorkOS event `<id>`" followed by "(directory sync)" | Your identity provider removed, suspended, or renamed a person, and the server applied it. [Manage users and roles](users) covers what directory sync does. |
| WorkOS | "WorkOS event `<id>`" or "WorkOS, read by the SSO page", followed by "(WorkOS)" | WorkOS reported a change to your tenant's domains, connection, or organization. The **Single sign-on** page found some domain changes by reading WorkOS, and those name "WorkOS, read by the SSO page". |
| Just-in-time provisioning | The new user's email, followed by "(just-in-time provisioning)" | A person's own single sign-on login created their user, because your tenant turned on [just-in-time provisioning](sso). No admin did it. |
| Operator | The name of the operator's job and execution, such as `job=<job> execution=<execution>` | A person who runs the hosted service did it. |

The name of an actor is copied into the event when the event is written. It still reads right after the user is deleted or renamed.

An operator action on your tenant appears here, including a read of your users or keys. An operator can create the tenant, set its ingest rate limit, remove a service, an environment, or old runs, link or unlink its WorkOS organization, change its single sign-on settings, and add, change, or delete its users and keys. [What the server keeps](data-kept) covers what an operator can do to your data.

Ingest records no event. It happens too often to log, and the runs it writes already show what arrived.

## What an event is recorded for

Each action is recorded in the same step as the change it names, so an event exists for every change that took effect. An action that changes nothing records nothing. Giving a user the role they already have, enforcing SSO when it is enforced, and verifying a domain the tenant already holds each leave no event. Opening an Admin Portal link is the exception, because it hands setup to someone outside the tenant.

A session that ends because it was idle too long or reached its maximum age records nothing. A logout records its own event.

## Sign-in actions

A browser request causes each of these events, so each carries the client address.

| Label | Action | Recorded when | Actor | Target | Details |
|---|---|---|---|---|---|
| Signed in | `login.succeeded` | A person signs in and a session starts. | User | The user's email | None |
| Sign-in failed | `login.failed` | A login is refused and the server can tie it to one tenant. See [Failed sign-ins](#failed-sign-ins). | User | The user's email | `reason`, `workos_user_id`, and `organization_id` for a refused SSO login |
| Signed out | `logout` | A person signs out and the server ends their session. | User | The user's email | None |
| Session ended | `session.ended` | A session ends because of a change. One event for each session. | Whoever made the change | The session's user | `reason`, `created_at`, `last_seen_at` |
| Sign-in identity linked | `user.identity_bound` | A person signs in for the first time and their sign-in identity is linked to their user. | User | The user's email | `workos_user_id` |

The `reason` of a **Session ended** event is one of these:

- `user_deleted`, when a user is deleted. The same actor then records **User deleted**.
- `sso_enforced`, when SSO is turned on and ends every session not made through SSO.
- `organization_unlinked`, when the tenant's WorkOS organization is unlinked and every session made through SSO ends.

`created_at` and `last_seen_at` are the times the session began and was last used, in UTC.

### Failed sign-ins

A failed sign-in is recorded only when it names one tenant. A login that matches no user, or users in several tenants, records nothing, because no tenant owns it. A login whose email WorkOS did not verify records nothing either, so nobody can write events into a tenant they do not belong to.

The `reason` is one of two values:

- `identity_mismatch`. The login's verified email names a user in your tenant who is already linked to a different sign-in identity. The actor is the email the login used.
- `sso_required`. The login matched a user in your tenant, and your tenant enforces SSO, but the login did not come through your SSO connection. The actor is the matching user.

In both cases the target is the user's email as your tenant stores it.

## Changes to users and keys

Admins make these changes in the web UI, so those events carry the admin's address. An operator or directory sync makes the same changes without one.

| Label | Action | Recorded when | Actor | Target | Details |
|---|---|---|---|---|---|
| User created | `user.created` | A user is added on the **Users** page, an operator adds one, or just-in-time provisioning creates one at an SSO login. | Admin, operator, or just-in-time provisioning | The user's email | `role`. A just-in-time event adds `organization_id` and `workos_user_id`. |
| User deleted | `user.deleted` | A user is deleted by an admin, an operator, or directory sync. | Admin, operator, or directory sync | The user's email | `role`, `sessions_ended` |
| Role changed | `user.role_changed` | A user's role changes. | Admin or operator | The user's email | `from → to` |
| Email changed | `user.email_changed` | Directory sync gives a user the new email your directory holds. | Directory sync | The new email | `from → to` |
| Key created | `key.created` | An API key is created. | Admin or operator | The key's name | `scope`, `prefix` |
| Key revoked | `key.revoked` | A live API key is revoked. | Admin or operator | The key's name | `scope`, `prefix` |

A deletion records **Session ended** for each session first, and then **User deleted**. `sessions_ended` counts them. [Manage API keys](api-keys) covers key names, scopes, and prefixes. The `prefix` is the key's visible prefix. The event never holds the key.

## Changes to single sign-on

Opening an Admin Portal link and turning SSO on or off are admin actions in the UI. WorkOS and the operator also change this state. [Set up single sign-on](sso) covers each setting.

| Label | Action | Recorded when | Actor | Target | Details |
|---|---|---|---|---|---|
| WorkOS organization linked | `tenant.organization_linked` | The tenant is first linked to its WorkOS organization. The first Admin Portal button you click does it. | Admin or operator | The tenant's name | `organization_id` |
| WorkOS organization unlinked | `tenant.organization_unlinked` | The link is removed, by an operator or because WorkOS deleted the organization. | Operator or WorkOS | The tenant's name | `organization_id`, `reason` (`operator` or `organization_deleted`) |
| Admin Portal opened | `sso.portal_opened` | An admin asks for an Admin Portal link. | Admin | The tenant's name | `intent` (`sso`, `domain_verification`, or `dsync`) |
| SSO requirement changed | `tenant.sso_changed` | The tenant starts or stops enforcing SSO. | Admin, operator, or WorkOS | The tenant's name | `from → to`, as `on` or `off`. After an unlink, also `reason: organization_unlinked`. |
| Just-in-time provisioning changed | `tenant.jit_changed` | Just-in-time provisioning turns on or off. | Admin, operator, or WorkOS | The tenant's name | `from → to`. When it turns off by itself, also `reason` (`sso_off` or `organization_unlinked`). |
| SSO connection changed | `sso.connection_changed` | WorkOS reports a change to an SSO connection. One event for each WorkOS event. | WorkOS | The connection's name | `event`, `connection_type`, `state` |
| Domain verified | `domain.verified` | The tenant gains a verified domain. | WorkOS | The domain | `event` when a WorkOS event reported it. None when the **Single sign-on** page found it. |
| Domain removed | `domain.removed` | The tenant loses a verified domain. | WorkOS or operator | The domain | `event` and WorkOS's `reason` when a WorkOS event reported it. `reason: not_verified_at_workos` when the page found it. `reason: organization_unlinked` after an unlink. |

Turning SSO on records **SSO requirement changed**, then **Session ended** with the reason `sso_enforced` for each session it ends. Turning SSO off also turns just-in-time provisioning off, and that records **Just-in-time provisioning changed** when it was on. An unlink records the changes it causes, in this order: **SSO requirement changed** and **Just-in-time provisioning changed** when they were on, **Session ended** for each SSO session, **Domain removed** for each domain, and last **WorkOS organization unlinked**.

## Operator actions

An operator's action on your tenant records an event with the actor kind operator. The operator can also make most of the changes in the earlier tables, and those carry the operator as actor.

| Label | Action | Recorded when | Target | Details |
|---|---|---|---|---|
| Tenant created | `tenant.created` | An operator creates the tenant. | The tenant's name | None |
| Ingest limit set | `tenant.limit_set` | An operator changes the tenant's ingest rate limit. | The tenant's name | `ingest_rps` and `ingest_burst`, or "default" for each when the operator clears the limit |
| Retention period set | `tenant.retention_set` | An operator changes the tenant's retention period. Setting the period it already has records nothing. | The tenant's name | `from` and `to`, in days |
| Runs expired | `runs.expired` | The daily expiry removes runs, test runs, instances or stored classes of the tenant. A day it removes nothing records nothing. | "runs not seen in N days, or replaced test runs" | `retention_days`, `runs` (not seen within the period), `replaced_test_runs`, `instances`, `class_records`, `declared_class_records` |
| Instances pruned | `instances.pruned` | An operator removes runs not seen for some days, and instances left with no run. One event for each tenant that lost any. | "runs not seen in N days" | `older_than_days`, `runs`, `instances` |
| Service deleted | `service.deleted` | An operator deletes one of your services on request. | The service, as `name` or `namespace/name` | None |
| Environment deleted | `environment.deleted` | An operator deletes one of a service's environments on request. | The service followed by "environment" and the environment | `runs`, `instances` |
| Bootstrap ran | `bootstrap.ran` | An operator's setup run created a tenant, key, or admin that did not exist. A run that finds everything in place records nothing. | The tenant's name | `created`, a list such as `admin ana@example.com` |
| Operator read data | `operator.read` | An operator listed your tenant's users or keys. | The tenant's name | `subcommand`, the name of the read the operator ran |

The operator's actor name reads `job=<job> execution=<execution>`. It names the job that ran the action and that one run of it, not a person. Removing runs, a service, or an environment never removes audit events.

## The client address

An event caused by a person's browser request holds the address the request came from. That covers a sign-in, a sign-out, and an admin's change in the web UI. An event that no browser request caused has none: directory sync, WorkOS, and operator events, and the domain changes the **Single sign-on** page finds. The server also records no address when it cannot tell where a request came from.

The server clears an event's client address once the event is more than a year old. A daily job does it, so an address goes at the first run after its event passes one year. The **IP** column then shows an en dash. The rest of the event stays.

## Events are not edited or deleted

An event is written once. Nobody edits it, and nothing deletes it on a schedule while the tenant exists. The one change to an event is the cleared client address.

Deleting the tenant removes its events with it. An operator deletes a tenant only on request.
