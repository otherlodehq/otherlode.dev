---
title: Scope and environments
description: The three filters that choose which runs a read counts, how a run gets its environment, and how the web UI and the read API apply them.
order: 70
---

Every finding, count and list in the server is read over a set of runs. The scope chooses that set. This page covers what the scope matches, how a run gets its environment, and where you set the scope in the web UI and in the read API.

A key scope, as in `ingest` or `read`, is a different thing. [Manage API keys](api-keys) covers it.

## Runs and instances

A run is one process's lifetime under one service instance ID. An instance is a JVM as the collector sees it, and it can span several runs when you pin its ID. The agent makes a new run ID at every start, so a restart is a new run even under a pinned instance ID. [Configuration](/docs/agent/configuration#service-identity) says how the agent sets the instance ID, and [data sent](/docs/agent/data-sent#resource-attributes) lists the run ID among the resource attributes.

The server keeps each run apart and matches a run against the scope by the run's own values. One instance can have a run in scope and another run out of it.

## What the scope matches

The scope has three optional parts. A run is in scope when it passes every part you set. A part you leave out matches every run.

| Part | Query parameter | A run matches when |
|---|---|---|
| Environment | `environment` | The run's environment equals the name, after the name is trimmed and lowercased. |
| Version | `version` | The run's own version equals the value exactly, with the same case. A run that reported no version never matches. |
| Seen within | `active_within_days` | The server last heard from the run within that many days. The value is a whole number of 1 or more. |

The server hears from a run through its delta batches, which the agent sends on a schedule even when nothing changed. A run's last-heard time starts at its first payload and moves with each delta batch.

A blank `environment` means every environment. An `active_within_days` that is zero, negative or not a whole number gets a `400` from the read API with the message "active_within_days must be a whole number of 1 or more".

Two kinds of run are never in scope, whatever you set. A test run is kept out of every finding, as [test runs](/docs/agent/test-runs) describes. A run that came through a collector older than its agent, so that fields were stripped, is stored and listed on the instance list, and it is labelled there. No finding counts it.

## Counts and findings use the in-scope runs only

Every count, finding and judgment is taken over the in-scope runs. A run that has expired is in no scope, so a count covers the runs the server still holds, which are the runs seen within the tenant's retention period. Between two daily expiries the server holds a run up to a day longer. See [What the server keeps](data-kept#what-the-server-deletes-on-a-schedule). A method's hits are summed across them. A class is never loaded only when no in-scope run loaded it. A dependency, an endpoint and an optional parameter are judged the same way. [How findings are judged](how-it-works) explains why.

A read that names no version and no seen-within window, and may name an environment, also counts the hits the service has recorded. A method, a condition outcome or an endpoint that the service has recorded a hit of counts as hit when no run in scope holds one. So it is not never hit or never called; a recorded hit of a static initialiser keeps its class from never initialised, and one of a constructor keeps its class from never instantiated; and the stale findings list it once its last hit is older than the window asked for. The service keeps the record for each environment, so a hit recorded in staging counts for a read of staging and for a read with no environment, and not for a read of prod. A condition outcome without a branch key has no record. Once a production run of the environment has been removed, that outcome makes no never-hit claim on any read, with or without a version or a seen-within window, since the removed run may hold its only hit. A reference to a dependency from a method with a recorded hit is live, so that dependency is not unreached on its account. A read that names a version or a seen-within window leaves the record out and answers for the runs it selects.

That read also counts a class that any production run of the service has loaded, in the environments in scope, even when that run's data has since been removed. The server keeps one record of the classes each environment has loaded, and removing runs does not remove it. The record applies to [never loaded](findings#never-loaded), [failed to load](findings#failed-to-load), unclassified classes and the never-loaded methods of the call graph. A dependency listed from the startup classpath that no run in scope loaded a class from reads as stale, not unloaded, when the service's record of that dependency's loads, kept for each environment, says a class loaded from it in the environments in scope. A class-level reference to a dependency still judges each run by what that run loaded. A read that names a version or a seen-within window leaves the record out and answers for the runs it selects.

A count that reads as a number of instances counts the distinct instances that own the in-scope runs. An instance that restarted ten times in scope counts once.

### Runs that are not settled

A run is settled when a delta batch from it has arrived and its newest payload says no counts are pending. A run that has sent only a manifest is not settled, and neither is one whose counts a collector or proxy refused. Its hits still count: a method it hit is hit.

A zero-count claim about a location needs every in-scope run that knows the location to be settled. One unsettled run that knows a method, a condition path, a class, an endpoint, an optional parameter or a dependency holds that claim back, whether or not another run has the zero. A run that does not know the location holds nothing back. [Findings](findings) says which findings this covers. The **Instances** page marks a run that is not settled.

The Instances page and the sidebar's **Instances** count are the exception. They also show an instance whose runs match the scope but all came through a collector older than its agent. No finding counts such an instance.

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

The first payload that reaches the server for a run fixes the run's environment for its whole life. A blank name counts as a name. A later payload of the same run that names another environment is ignored. Changing the collector's environment affects the runs that start afterwards, so restart the process to start a new run in the new environment.

A test run with no other source reports the environment `test`. Test runs are never in scope, so you never pick it.

## Case and spaces

The server trims the spaces around an environment name and lowercases it, both when it stores the name and when it reads `environment`. `Prod`, ` prod ` and `prod` are one environment. Spaces inside a name stay. `prod` and `production` are two environments.

The version is not changed. `1.4.2` and `1.4.2 ` do not match.

## The environment "not named"

A run whose first payload names no environment belongs to the environment `none`. A run that names `none` belongs to the same one. In the web UI the name reads "not named", in muted italics. In the API it is `none`. Pass `environment=none` to select it. An instance's `environment` field reads `none`.

The environment `none` is an environment of its own. It never matches a named environment, and a filter for `prod` leaves it out.

## An environment the service does not know

The picker lists the environments that a production run of the service has reported in. If the address names another, the picker adds it at the end of the list with "(unknown)" after the name. For example, `staging (unknown)`. No run matches it, so every list and count on the page is empty. A misspelled environment, or one that was deleted at your request, looks like this.

The read API answers such a filter with empty results. It does not return an error.

## Set the scope in the web UI

Every page under a service has the **Environment** picker in the top bar. Its first choice is **All environments**. After it come the service's environments in name order, with the environment `none` shown as "not named" and the note "runs that named no environment".

The picker is the only scope control in the web UI. It writes the `environment` parameter into the page's address, and choosing **All environments** removes it. A new choice also returns a paged list to its first page.

The web UI has no control for `version` or `active_within_days`, but it reads both from the address. Add them to the address and every page under the service applies them:

```
https://app.otherlode.dev/services/orders?environment=prod&version=2.4.1&active_within_days=7
```

The sidebar links and the links inside a service carry the scope with them, so it stays as you move between pages. A copied address opens the same scope for a colleague. The web UI drops an `active_within_days` that is not a whole number of 1 or more, and it lowercases and trims `environment` as the server does.

The browser also remembers the environment you last picked for each service. The **Services** page opens a service in that environment when the service still has it. Otherwise it opens the service with every environment.

## Set the scope in the read API

Every per-service route of the read API takes `environment`, `version` and `active_within_days` as query parameters, with the meaning above. For example:

```
GET https://app.otherlode.dev/api/v1/services/orders/instances?environment=prod&version=2.4.1&active_within_days=7
```

The report echoes `version` and `active_within_days` when you set them. [Read API](api) lists the routes and their other parameters.
