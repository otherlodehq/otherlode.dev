---
title: Scope and environments
description: The three filters that choose which runs a read counts, how a run gets its environment, and how the web app and the read API apply them.
order: 70
---

Every finding, count and list in Otherlode is read over a set of runs. The scope chooses that set. This page covers what the scope matches, how a run gets its environment, and where you set the scope in the web app and in the read API.

A key scope, as in `ingest` or `read`, is a different thing. [Manage API keys](api-keys) covers it.

## Runs and instances

A run is one process's lifetime under one service instance ID. An instance is a JVM as the collector sees it, and it can span several runs when you pin its ID. The agent makes a new run ID at every start, so a restart is a new run even under a pinned instance ID. [Configuration](/docs/agent/configuration#service-identity) says how the agent sets the instance ID, and [data sent](/docs/agent/data-sent#resource-attributes) lists the run ID among the resource attributes.

Otherlode keeps each run apart and matches a run against the scope by the run's own values. One instance can have a run in scope and another run out of it.

## What the scope matches

The scope has three optional parts. A run is in scope when it passes every part you set. A part you leave out matches every run.

| Part | Query parameter | A run matches when |
|---|---|---|
| Environment | `environment` | The run's environment equals the name, after the name is trimmed and lowercased. |
| Version | `version` | The run's own version equals the value exactly, with the same case. A run that reported no version never matches. |
| Seen within | `active_within_days` | Otherlode last heard from the run within that many days. The value is a whole number from 1 to 36500. |

Otherlode hears from a run through its delta batches, which the agent sends on a schedule even when nothing changed. A run's last-heard time starts at its first payload and moves with each delta batch.

A blank `environment` means every environment. An `active_within_days` that is zero, negative, above 36500 or not a whole number gets a `400` from the read API with the message "active_within_days must be a whole number from 1 to 36500".

Two kinds of run never count for a finding, whatever you set. A test run is kept out of every finding, as [test runs](/docs/agent/test-runs) describes. A run that came through a collector older than its agent, so that fields were stripped, is stored, labelled on the **Instances** page and counted in the panel's **Instances** count. No finding counts it.

## Counts and findings use the in-scope runs only

Every count, finding and judgment is taken over the in-scope runs. A run that has expired is in no scope, so a count covers the runs Otherlode still holds, which are the runs seen within the tenant's retention period. Between two daily expiries Otherlode holds a run up to a day longer. See [What Otherlode keeps](data-kept#what-otherlode-deletes-on-a-schedule). A method's hits are summed across them. A class is never loaded only when no in-scope run loaded it. A dependency, an endpoint and an optional parameter are judged the same way. [How findings are judged](how-it-works) explains why.

A read that names no version and no seen-within window, and may name an environment, also counts the hits the service has recorded. A method, a condition outcome or an endpoint that the service has recorded a hit of counts as hit when no run in scope holds one. So it is not never hit or never called, and the stale findings list it once its last hit is older than the days asked for. A recorded hit of a static initialiser keeps its class from never initialised, and one of a constructor or an instance method keeps its class from never instantiated. An optional parameter with a recorded omission is not always supplied. The service keeps the record for each environment, so a hit recorded in staging counts for a read of staging and for a read with no environment, and not for a read of prod. A condition outcome without a branch key has no record. Once a production run of the environment has been removed, that outcome makes no never-hit claim on any read, with or without a version or a seen-within window, since the removed run may hold its only hit. A reference to a dependency from a method with a recorded hit is live, so that dependency is not unreached on its account. A read that names a version or a seen-within window leaves the record out and answers for the runs it selects.

That read also counts a class that any production run of the service has loaded, in the environments in scope, even when that run's data has since been removed. Otherlode keeps one record of the classes each environment has loaded, and removing runs does not remove it. The record applies to [never loaded](findings#never-loaded), [failed to load](findings#failed-to-load), unclassified classes, the never-loaded methods of the call graph, and whether a class-level reference to a dependency is live. A dependency listed from the startup classpath that no run in scope loaded a class from reads as stale, not unloaded, when the service's record of that dependency's loads, kept for each environment, says a class loaded from it in the environments in scope. A read that names a version or a seen-within window leaves the record out and answers for the runs it selects.

### A version or seen-within read keeps removed code

A full read leaves out [removed code](findings#removed-code): code that every live run of the environment proves absent. A read that names a version or a seen-within window leaves nothing out, because it describes the runs it selects, and those runs held the code. A read of an old version lists the code that version held, and the Removed page is empty for it. The report's `removed` counts are zero for it.

A count that reads as a number of instances counts the distinct instances that own the in-scope runs. An instance that restarted ten times in scope counts once.

### Runs that are not settled

A run is settled when a delta batch from it has arrived and its newest payload says no counts are pending. A run that has sent only a manifest is not settled, and neither is one whose counts a collector or proxy refused. Its hits still count: a method it hit is hit, and the counts it has delivered are kept and summed with the other runs' counts.

A zero-count claim about a location needs every in-scope run that knows the location to be settled. One unsettled run that knows a method, a condition path, a class, an endpoint, an optional parameter or a dependency holds that claim back, whether or not another run has the zero. A run that does not know the location holds nothing back. For **Never loaded**, a run knows a class when its latest complete scan declares it, and a run with no complete scan knows every class, since it could load any of them. Only a run that has not ended or passed its live deadline holds a never-loaded claim back. A run that ended or passed its live deadline without delivering a delta batch declares no class. [Findings](findings) says which findings this covers. The **Instances** page marks a run that is not settled.

When in-scope runs disagree on a value that the page shows for one row, such as the line of a method, the newest in-scope run supplies it. The newest is the run that started last.

Only the environment also changes which dates a read shows. [Dates](dates) covers how dates are kept for each environment.

## The latest run

The latest run of an instance is its in-scope run that started last. Every earlier run has ended, because a later one started.

Reads that describe an instance itself use its latest run:

- On the instance list, the columns **Latest run**, **Version**, **Environment** and **Ended cleanly** come from the latest run. **Runs** counts the instance's in-scope runs. The columns **Baseline**, **Dependencies** and **Last seen** cover all of them.
- In the report, `instances.ended_cleanly` and `instances.silent_without_final_flush` judge each instance by its latest run.

The run that sent the most recent payload is not always the latest. A late payload from an older run moves that run's last-heard time, and the older run stays the older run.

A version filter can leave an instance with only some of its runs in scope. The instance list then describes the instance by the latest of those runs.

## How a run gets its environment

The environment is the deployment a run reports from, such as `prod` or `staging`. Two places can name it.

- The agent. Its `environment` option sets it, and so do OpenTelemetry's `deployment.environment.name` and `deployment.environment`. [Configuration](/docs/agent/configuration#service-identity) gives the order.
- The collector. Its `OTHERLODE_COLLECTOR_ENVIRONMENT` setting fills the environment in on every payload that has none. [Send data from your collector](connect#name-the-environment) covers the setting and the action that makes the collector's value win.

The first payload that reaches Otherlode for a run fixes the run's environment for its whole life. A first payload that names no environment fixes the run to the environment `none`. A later payload of the same run that names another environment is ignored. Changing the collector's environment affects the runs that start afterwards, so restart the process to start a new run in the new environment.

A test run with no other source reports the environment `test`. Test runs are never in scope, so you never pick it.

## Case and spaces

Otherlode trims the spaces around an environment name and lowercases it, both when it stores the name and when it reads `environment`. `Prod`, ` prod ` and `prod` are one environment. Spaces inside a name stay. `prod` and `production` are two environments.

The version is not changed. `1.4.2` and `1.4.2 ` do not match.

## The environment "not named"

A run whose first payload names no environment belongs to the environment `none`. A run that names `none` belongs to the same one. In the web app the name reads "not named". In the API it is `none`. Pass `environment=none` to select it. An instance's `environment` field reads `none`.

The environment `none` is an environment of its own. It never matches a named environment, and a filter for `prod` leaves it out.

## A service watches at most 10 environments

Otherlode watches the first 10 environments a service's production runs report in. A production run in another environment after that is stored, but Otherlode does not watch its environment. The web app and the read API call such an environment not tracked:

- No dead-code claim counts the run. A read of every environment leaves it out, and a read that names the environment finds nothing. The service list still counts its instance, the report's `stripped_runs` counts it when it is stripped, and a class it loaded counts as production code, so a method called only from that class does not read as called only by tests.
- Otherlode computes no stored snapshot for the environment.
- The **Services** page counts the service's environments that are not tracked, and the read API lists them in `not_tracked_environments`. The collector logs a warning with the notice `environment-not-tracked` for the payloads of such a run. See [Otherlode stores a payload but does not track it](/docs/collector/troubleshooting#otherlode-stores-a-payload-but-does-not-track-it).

An environment that is already watched stays watched. An agent whose environment name changes on every start, such as one built from a pod name, fills the 10 slots and then reports into environments that are not tracked. Give the agent a fixed environment name, then email [support@otherlode.dev](mailto:support@otherlode.dev) to have the extra environments deleted. Deleting a watched environment frees its slot, and the next production run in an environment that is not tracked starts watching it. An operator can also raise the cap for your tenant. A test run never takes a slot.

## Your plan tracks a fixed number of services

Your plan sets how many services Otherlode tracks at once: 2 on the free plan, and 100 on the Team and Enterprise plans. A service takes one slot while it is tracked. Only a production run takes a slot, so a service that only test runs reach never does. One name in two namespaces is two services.

A production run from a service past the number is stored, but Otherlode does not track the service. The web app and the read API call such a service not tracked:

- Otherlode stores its runs, counts and class records as usual. No dead-code claim counts them, and Otherlode computes no stored snapshot for the service. It watches none of the service's environments.
- The **Services** page lists the service as not tracked. It has no page to open.
- The read API lists the service in `not_tracked_services`, beside `services`, with its instances and last-seen time. Every per-service route for it answers `404` with the error `service not tracked`, so an empty result never reads as no findings.
- The collector logs a warning with the notice `service-over-cap` for its payloads. See [Otherlode stores a payload but does not track it](/docs/collector/troubleshooting#otherlode-stores-a-payload-but-does-not-track-it).

The number bounds the work Otherlode does for a tenant. An agent that builds its service name from a pod name creates a new service on every restart, and the cap stops that from growing the refresh without limit.

A tracked service keeps its slot while it reports. A slot frees only when a service needs one. A service that waits is one without a slot that has sent a production run within the last 30 days. When a slot is free, the waiting service whose first production run arrived first takes it. When none is free, it takes the slot of the tracked service that has been silent longest, if that service has sent no production run for 30 days or more. A silent service that no other service needs keeps its slot. Send a production run from a service that is not tracked and Otherlode checks for a free slot then.

A change to the cap applies at once. When your plan changes to one with more slots, or an operator raises the cap for your tenant, waiting services take the new slots in the order of their first production run. When the cap falls, the services tracked longest keep their slots and the rest become not tracked. A kept service that has sent no production run for 30 days or more still gives its slot to one of those if it waits, so the longest-tracked service can lose its slot to an active one. To change your plan or ask for another cap, email [support@otherlode.dev](mailto:support@otherlode.dev). Deleting a service at your request frees its slot, and the waiting service that arrived first takes it.

A service that gains a slot starts watching its environments at that moment, up to the environment cap, the environment with the earliest production run first. Its stored runs join every read, and its snapshots become due for the next refresh without waiting for the usual interval. A service that loses a slot watches no environment. Otherlode serves none of its stored snapshots and deletes them at its next refresh. If the service gains a slot again before that, its snapshots stay and show as of their own time until the refresh replaces them. If it gains a slot again, its watching starts again from then, so the age that [dates](dates) shows for a finding starts again too. That can only hold a claim back.

## An environment the service does not know

The picker lists the environments the service watches. If the address names another, the picker shows it with "(unknown)" after the name, such as `staging (unknown)`. When the service has the environment but does not track it, the note reads "(not tracked)" instead. No run matches either, so every list and count on the page is empty. A misspelled environment, or one that was deleted at your request, looks like this.

The read API answers such a filter with empty results. It does not return an error.

## Set the scope in the web app

Every page under a service has the **Environment** picker. It offers **All environments** and each environment the service watches, with the environment `none` shown as "not named".

The picker is the only scope control in the web app. It writes the `environment` parameter into the page's address, and choosing **All environments** removes it.

The web app has no control for `version` or `active_within_days`, but it reads both from the address. Add them to the address and every page under the service applies them:

```
https://app.otherlode.dev/services/orders?environment=prod&version=2.4.1&active_within_days=7
```

The panel links and the links inside a service carry the scope with them, so it stays as you move between pages. A copied address opens the same scope for a colleague. The web app drops an `active_within_days` that is not a whole number from 1 to 36500, and it lowercases and trims `environment` as Otherlode does.

The browser also remembers the environment you last picked for each service, separately for each tenant. The **Services** page opens a service in that environment when the service still has it. Otherwise it opens the service with every environment. Signing out clears what the browser remembers.

## Set the scope in the read API

Every per-service route of the read API takes `environment`, `version` and `active_within_days` as query parameters, with the meaning above. For example:

```
GET https://app.otherlode.dev/api/v1/services/orders/instances?environment=prod&version=2.4.1&active_within_days=7
```

The report echoes `version` and `active_within_days` when you set them. [Read API](api) lists the routes and their other parameters.
