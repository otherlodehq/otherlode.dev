---
title: Dates
description: What each date in the web UI and the read API means, which clock sets it, which scope changes it, and when a date is capped.
order: 80
---

Findings about unused code depend on dates, such as how long code has been known and when it last ran. This page lists every date the server shows, the name each one has for methods, endpoints, optional parameters, dependencies and failed classes, and the rules that move it. For the filters that choose which runs a read covers, see [Scope and environments](scope).

## Dates come from the server's clock

Every date about your code comes from the server's own clock, at the moment a payload reaches it. It never shows a date from your agent's clock. Agent clocks differ from host to host, and dates taken from many of them could not be put in order. With one clock, the service-wide dates of an item always order as first known, then first hit, then last hit.

A date therefore trails the event. The agent sends counts at its flush interval, and a collector that buffers or retries delivers them later still. Treat a date as accurate to a flush interval or more. The dates can tell you how long code has gone unused. They are not an audit record.

The API writes every date as a UTC time in ISO 8601 form with a `Z` suffix, such as `2026-09-22T23:19:31Z`.

Two times are not arrival times. `as_of`, shown on the overview and on the finding pages read from a snapshot as **As of**, is the time the server computed the result: the time its stored snapshot was computed, or the time of a live read. `last_failed_at`, shown while a snapshot is being prepared, is the time the server last failed to compute it. A day filter on a page read from a snapshot, such as **Stale after (days)**, counts back from `as_of`. See [the snapshots](how-it-works#the-report-and-finding-pages-are-read-from-stored-snapshots).

## Service-wide dates

The server keeps one set of dates for each method, branch outcome, endpoint, optional parameter and dependency of a service, in each environment. These are the service-wide dates. They belong to the service, not to an instance or a run.

| Date | What it is |
|---|---|
| First known | The arrival of the first manifest that named the item. |
| First hit | The arrival of the first delta batch that showed a count above zero for the item. |
| Last hit | The arrival of the latest delta batch in which the item's count grew, to within an hour. |

A last hit, a last called date and a last omitted date move only when the stored date is more than an hour old. A batch in which the count grew while the stored date is newer than that leaves it as it was. So a last hit can trail the true one by up to an hour. A first hit and a first called date are exact: the first batch with a count above zero writes them at once.

An item that no run has hit has no first hit and no last hit. The API sends `null` for them. The agent's own timestamps are never used for these dates.

### Names for each kind of item

First hit and last hit change name with the item. The table gives the API field and the column or label in the web UI.

| Item | First known | First hit | Last hit |
|---|---|---|---|
| Method or branch outcome | `first_known_at`, **Known since** | `first_hit_at`, **First hit** | `last_hit_at`, **Last hit** |
| Endpoint | `first_known_at`, **First known** | `first_called_at`, **First called** | `last_called_at`, **Last called** |
| Optional parameter | `first_known_at`, **Known since** | `first_omitted_at`, **First omitted** | `last_omitted_at`, **Last omitted** |
| Dependency | `first_known_at`, **Known since** | `first_loaded_at`, **First loaded** | `last_loaded_at`, **Last loaded** |

A dependency's last loaded date is the arrival time of the latest delta batch that raised a loaded-class total above zero. The total stops rising soon after startup, and a new run loads the same classes again, so the date follows restarts. The server writes it at most once an hour. It dates the latest load of a class from the library, not its last use. It is `null` for a dependency never loaded. The [stale](findings#unused-dependencies) status shows it.

The **Never initialised** and **Never instantiated** pages show **Known since** for a class. It is the first known date of the method that decides the finding. See [Findings](findings).

The [Instances](inventory) page shows **First seen** and **Last seen** for each instance. Those are not service-wide dates. They cover the instance's runs in scope, and they change with scope, with expiry and with pruning.

### Failure dates

A class that failed to load has its own pair of dates, kept for each environment. See [Classes](/docs/agent/classes#failed-to-load) for how the agent decides a class failed.

| Date | API field | UI |
|---|---|---|
| The arrival of the first manifest that named the class as failed | `first_failed_at` | **Failing since** on the **Failed to load** page, shown as a date and a day count, such as "1 Jun 2026 (122 days)" |
| The arrival of the latest manifest that named it | `last_failed_at` | **Last failed** |

`failing_for_days` is the number of whole days from `first_failed_at` to the time of the read. All three are `null` when no environment in scope has a failure date for the class.

The failure dates are history. A class reads as failed to load only while no in-scope run loaded it, whatever its dates say. A test run or a stripped run writes no failure date.

A dependency that only a failed class references has the status `failed-to-load`. Its sites carry `failed_since`, the failing class's `first_failed_at`, and the UI labels each such site "failed to load since" and the date.

### Rules that move a date

- A first date moves only earlier, and a last date moves only later. A manifest sent twice, a restart, or a new instance cannot move a date the wrong way.
- Counts can reach the server before the manifest that names them. The first known date is then no later than the earliest of those counts.
- A test run and a stripped run write no date. A stripped run is one that carried `fields_stripped`.
- Scope never changes a date, except through its environment. `version` and `active_within_days` choose which rows a read lists and what their counts add up. They do not change the dates of those rows. A scope on one weekly release still says a method has been known for three years.
- Expiry never moves a date, and neither does pruning or any other removal of runs. The dates outlive every instance and every run.
- An operator deletes a service or one of its environments on request. The dates go with it. Only an operator's deletion removes them.

## Dates are kept for each environment

Each environment of a service has its own dates. A smoke test in staging that calls a method once a day keeps its staging dates fresh and leaves its production dates alone. Name an environment in the scope, and every date on the page comes from that environment's rows. Names ignore case and surrounding spaces. Runs that name no environment share the environment `none`, which the UI shows as "not named".

With no environment filter, a read combines every environment. It shows the earliest first date and the latest last date across them. In that view, a call in staging moves the last called date of an endpoint that production never calls. The environment picker in the top bar chooses between one environment and **All environments**.

An environment that the service has never reported has no dates, and its `watched_since` is `null`.

## Capped dates

An item is capped only when it has no service-wide dates. In practice that is a branch outcome with no branch key. The agent leaves out a branch key when two sites in one method share a fingerprint, or when it cannot fingerprint a site. See [Methods and branches](/docs/agent/methods-and-branches) for the key. An outcome with a key has service-wide dates like a method does. A change that alters the key, such as an edit to the outcome's condition, starts its dates over.

A keyless outcome has no service-wide row. Its dates come from the runs in scope instead, and its row carries `dates_capped: true`. These dates are capped, and the scope, expiry and pruning can move them. Once a production run of the environment has been removed, such an outcome makes no never-hit claim, because the removed run may hold the only hit. A removed test run does not count, since a test run is never in scope. It is the environment that counts. In a read that names no environment, a removed production run of any environment of the service has that effect. The server keeps the date of the first removal for each environment, and only an operator's deletion of the environment clears it. A new run does not.

- A capped first date can be later than the true one. It is a lower bound on age.
- A capped last date can be earlier than the true one. It cannot prove the outcome stale.

A row with service-wide dates has `dates_capped: false`. The UI marks a capped **Known since** with an asterisk. Its tooltip reads "capped to the instances in scope".

### How a filter treats a capped row

A filter that cannot prove a capped row leaves it out and counts it in `capped_hidden`. The count appears in the response of `never-hit` and `stale-hit`. A keyless outcome of an environment that has lost a production run is left out and counted in `capped_hidden` on every `never-hit` request, with no filter set.

| Filter | Capped row |
|---|---|
| `known_for_days` on `never-hit`, **Known for at least (days)** | Kept when its capped first known date is at least that many days ago, since the true date is older still. Left out and counted in `capped_hidden` when it fails. |
| `days` on `stale-hit`, **Stale after (days)** | Always left out when it would otherwise be listed, and counted in `capped_hidden`. |

Without `known_for_days`, `never-hit` lists capped rows like any other, except the keyless outcomes of an environment that has lost a production run, and `capped_hidden` counts only those. It applies every other filter of the request, such as the class prefix and the kind, and it counts across every page, like `total`. The UI shows it under the table. For one outcome it reads "1 branch outcome was left out because its dates are not known for the whole service." For more it reads "N branch outcomes were left out because their dates are not known for the whole service."

### Filters that read a date

| Filter | Where | Keeps |
|---|---|---|
| `known_for_days` | `never-hit`, `never-initialized`, `never-instantiated`, `unreached-clusters` | Items whose first known date is at least that many days ago. |
| `days` | `stale-hit` | Items whose last hit is older than that many days. Required, 1 or more. |
| `status=stale` with `days` | `endpoints` | Endpoints that were called before, and whose last called date is older than that many days. |

Each value is a whole number of 1 or more. On the web pages the fields are **Known for at least (days)** and **Stale after (days)**. **Stale after (days)** starts at 30.

Only `never-hit` and `stale-hit` list capped rows. The other filters in this table read methods, classes and endpoints, which always have service-wide dates.

## Watched since

Watched since is when the service first reported in an environment. It is the arrival of the first payload of the environment's first production run. A test run never sets it, so an environment that only test runs have reached has no watched since and no entry in the service list. With no environment filter, watched since is the earliest across the service's environments.

The API gives it as `watched_since` on each service and each of its environments in `GET /api/v1/services`, and on the responses of `never-hit`, `stale-hit`, `probes`, `never-initialized`, `never-instantiated`, `endpoints`, `optional-parameters` and `dependencies`. It is `null` when the service or the named environment has none.

Read a finding's age against watched since. No date can be older than it, and code can only look unused for as long as the service has been watched. A method that was last hit 90 days ago means one thing in a service watched for three years and another in one watched for 90 days. Code that runs weekly or monthly reads as never hit until it runs.

The web UI shows it in three places:

- Under the title of the **Never hit**, **Stale hit**, **Never initialised**, **Never instantiated**, **Endpoints**, **Optional parameters** and **Dependencies** pages, as "Watched for 3 days, since 22 Sep 2026".
- On the overview, under **What this is based on**, as **Watched for** and a value such as "3 days, since 22 Sep 2026". When the service has been watched for under 30 days, the overview adds a notice: "This service has been watched for 3 days. Code that runs weekly or monthly reads as never hit until it runs."
- In the service list, in the **Watched for** column, as a length of time alone.

## How the UI shows a date

Most dates read as how long ago they were, with the exact UTC time in a tooltip, such as "2026-09-22 23:19:31 UTC".

| Age | Reads as |
|---|---|
| Under a minute, or a time in the future | "just now" |
| Under an hour | "5 minutes ago" |
| Under a day | "3 hours ago" |
| Under 60 days | "12 days ago" |
| Under a year | "2 months ago", counting a month as 30 days |
| A year or more | "1 year ago" |

Each figure rounds down. A date that does not exist reads "never" in most columns, such as a call that has not happened, and a dash in the rest.

Watched since and failing since read as a UTC calendar date, such as "22 Sep 2026", with the exact time in the tooltip. A length of time, such as "3 days" in a watched-for text, uses the same units without "ago" and reads "less than an hour" under an hour.
