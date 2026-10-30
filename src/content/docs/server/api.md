---
title: Read API
description: Every route of the read API, with its authentication, parameters, paging, response fields and errors.
order: 120
---

The read API returns what the web app shows, as JSON. Use it to pull findings into a script, a dashboard, or a CI check. Every route answers `GET` and returns `application/json`.

Admin actions and the audit log are in the web app only. Their routes answer an admin's browser session and never an API key, so this page does not list them. See [Audit log](audit-log).

## Authenticate with a read key

The base URL is `https://app.otherlode.dev/api/v1`. The API answers only on that host. The host `ingest.otherlode.dev` is for collectors, and it answers `404` for every API path.

Send a `read` key as a bearer token:

```bash
curl -H "Authorization: Bearer $OTHERLODE_READ_KEY" https://app.otherlode.dev/api/v1/me
```

An admin creates the key in the web app. See [Manage API keys](api-keys). A key has one scope. An `ingest` key, the kind a collector holds, gets `403` on every API route and reads nothing.

The web app calls the same routes with the session cookie of a signed-in user. A request that carries an `Authorization` header is judged on the key alone, even when it also carries a valid cookie, and an empty header counts as present. The read API has no rate limit.

## Errors

Every error has a JSON body with one field, `error`.

```json
{"error": "service not found"}
```

| Status | `error` | Cause |
|---|---|---|
| `400` | A sentence naming the parameter, such as "limit must be between 1 and 5000" | A parameter is missing or has a value the route refuses. The route tables below list the values. |
| `401` | "unauthorized" | The header is missing, is not a bearer header, or holds an unknown or revoked key. |
| `403` | "this route needs a read key" | The key is valid and has the `ingest` scope. |
| `404` | "service not found" | The tenant has no such service. See [name a service in the path](#name-a-service-in-the-path). |
| `500` | "internal error" | Otherlode failed. The body never names the cause. |
| `503` | "unavailable" | Otherlode could not check the key. The key may still be valid, so retry. |

A route checks the service before it checks the other parameters. A request for an unknown service gets `404` even when its `limit` is also wrong.

## Name a service in the path

A service is known by its namespace and its name together. The same name in two namespaces is two services. Every per-service route has two shapes:

| Service | Path prefix |
|---|---|
| In the unspecified namespace | `/api/v1/services/{service}/` |
| In a named namespace | `/api/v1/namespaces/{namespace}/services/{service}/` |

Both shapes take the same parameters and return the same fields. The rest of this page writes routes as `/services/{service}/...` and lists no second shape.

- **Both values come from `/services`.** The `namespace` and `name` fields of [`/services`](#get-services) give both values for the path. A `namespace` of `null` means the first shape.
- **A slash is escaped.** Write a `/` in a namespace or a name as `%2F`, as in `/api/v1/namespaces/team%2Fa/services/checkout/report`.
- **Case is kept.** Otherlode trims spaces around either value and keeps the case. `Shop` and `shop` are two namespaces.
- **The unspecified namespace stands alone.** It never matches a named one, even one called `none`. A blank or unknown namespace in the second shape gets `404` and never falls back to the first shape.

A service that only [test runs](/docs/agent/test-runs) reached is missing from `/services`, but its own routes answer.

## Identifiers are the agent's

The API names things the way the agent does and never returns a database row id. A class is its dotted binary name, such as `com.acme.OrderService` or `com.acme.Outer$Inner`. A method is its class, its name and its JVM descriptor, such as `(Ljava/lang/String;I)V`. An endpoint is its `verb`, its `route_template` and its `template_kind`. A dependency is its `identity_key`, the sorted `group:artifact` pairs of its identities joined with commas. An instance is its `instance_id`, and a run is its `run_id`. See the agent's [classes](/docs/agent/classes), [endpoints](/docs/agent/endpoints) and [dependencies](/docs/agent/dependencies) pages for how each name is formed.

## Read the shared parameters and fields

### Scope parameters

Every per-service route takes these three parameters. They choose which runs a route reads. See [Scope and environments](scope) for what they mean.

| Parameter | Value | Effect |
|---|---|---|
| `environment` | A name | Keeps only runs in that environment. Otherlode trims the name and lowercases it, so `PROD` and `prod` match. `none` selects the runs that named no environment. A blank value means every environment. This is the one scope parameter that also picks which [dates](dates) a route shows. |
| `version` | A string | Keeps only runs that reported exactly that version. An unset value means every version. |
| `active_within_days` | A whole number, 1 to 36500 | Keeps only runs last seen within that many days. Another value gets `400` with "active_within_days must be a whole number from 1 to 36500". |

An environment or a version the service never reported is not an error. The route answers `200` with empty lists and zero counts.

### Paging

Every list route takes `limit` and `offset`. The routes without them are `/me`, `/services`, `/instances` and `/report`.

| Parameter | Default | Range | Error |
|---|---|---|---|
| `limit` | 500 | 1 to 5000 | "limit must be between 1 and 5000" |
| `offset` | 0 | 0 or more | "offset must be 0 or greater" |

Each list response carries `total`, the number of matching rows across every page. Otherlode computes it with the same filters and before `limit` and `offset` apply. To read everything, request pages until `offset` reaches `total`. Rows come in a fixed order. A page counts the unit the route lists. On `/never-hit` a site is one row, however many outcomes it has, and on `/unreached-clusters` a cluster is one row, however many members it has.

### Filters shared by list routes

| Parameter | Routes | Effect |
|---|---|---|
| `class_prefix` | Every list route except `/dependencies` and `/absent-references` | Keeps rows whose class name starts with the prefix. On `/endpoints` it matches the handler class, on `/unreached-clusters` the root's class, on `/call-edges` the caller's class, and on `/removed` the class of a class row or a method row, so a prefix drops every endpoint and dependency row. |
| `known_for_days` | `/never-hit`, `/never-initialized`, `/never-instantiated`, `/unreached-clusters` | Keeps only code known for at least that many days. A whole number from 1 to 36500, else `400` with "known_for_days must be a whole number from 1 to 36500". |

A route ignores a parameter it does not read.

### Fields every response uses

- **Timestamps** are RFC 3339 in UTC, such as `2026-09-24T21:40:10Z`. Every date is the time Otherlode received the data, except `as_of` and `last_failed_at`, which are times it computed or tried to compute a result. See [Dates](dates).
- **`as_of` and `from_snapshot`** are on every `200` of the [routes read from a snapshot](#routes-read-from-a-snapshot). `as_of` is when Otherlode read the data. `from_snapshot` is `true` when a stored snapshot gave the answer and `false` when Otherlode read it live.
- **Absent values** are `null`. A list with nothing in it is `[]`, never `null`.
- **`watched_since`** is the time the service first reported in the scoped environment. With no `environment`, it is the earliest across the environments. It is `null` when nothing matches. A finding's age means something only against it. The routes that carry it say so.
- **`first_known_at`, `first_hit_at`, `last_hit_at`** and their endpoint names (`first_called_at`, `last_called_at`), optional-parameter names (`first_omitted_at`, `last_omitted_at`) and dependency names (`first_loaded_at`, `last_loaded_at`) are the dates Otherlode keeps for each location. Each last date can trail the true one by up to an hour, since it moves only when the stored date is more than an hour old. See [Dates](dates).
- **`dates_capped`** is `true` when the row has no service-wide dates, so its dates come from the runs in scope. A capped first date can be later than the true one, and a capped last date earlier.
- **`instances_known`** is the number of distinct instances with an in-scope run that knows the location.

### Routes read from a snapshot

`/report`, `/never-hit`, `/stale-hit`, `/never-initialized`, `/never-instantiated`, `/unreached-clusters`, `/probes`, `/classes` and `/removed` read a stored snapshot for these scopes, when the request has no `active_within_days`:

- no `environment` and no `version`;
- an `environment` and no `version`;
- an `environment` and one of the 3 newest versions in it. A version is newer when its newest production run in that environment started later.

A snapshot holds the scope's report and every row of the other eight routes. The route applies the request's other parameters to those rows when the request arrives, as a live read applies them: `class_prefix`, `class`, `kind`, `routed`, `routine`, `order`, `include_generated`, `include_unread`, `limit` and `offset`, `days` on `/stale-hit`, and `known_for_days` on `/never-initialized` and `/never-instantiated`. A day parameter counts back from the snapshot's `as_of`, not from the time of the request. `known_for_days` on `/never-hit` and `/unreached-clusters` changes which code folds into another row or cluster, so a request to either route with it is computed live.

Otherlode refreshes a snapshot when something its findings read has changed in the runs it covers, at most once every 15 minutes, and at least once every 2 hours with nothing changed. On the free plan both are 6 hours. A batch that only raises counts on code hit within the last day changes nothing, unless they are counts of an optional parameter or the method it belongs to, which the report's `optional_parameters` counts read. A version's snapshot covers that version's runs. It counts test runs and runs from a collector older than their agent only while one of the version's other runs is still reporting. A change that can take findings away refreshes without the wait, on every plan: a run that ends, passes its live deadline or falls behind, and a class listing or static baseline that completes. [How findings are judged](how-it-works#the-report-and-finding-pages-are-read-from-stored-snapshots) says which snapshots each refreshes. A snapshot's findings can trail the data by up to about 20 minutes, the interval plus the 5-minute period of the refresh job, and more while the refresh has a backlog. Counts and dates on it, such as `hits_total` and last-hit times, can trail by up to about 2 hours. On the free plan both can trail by up to about 6 hours. The nine routes trail together, so a count in the report matches the `total` of a route read from the same snapshot, and can differ from a route computed live by what arrived in that time. Every other request is computed live when it arrives: a `version` outside the 3 newest, a `version` with no `environment`, any `active_within_days`, `known_for_days` on `/never-hit` or `/unreached-clusters`, a service or environment that only test runs have reached, and an environment the service does not track. Every route not named above is computed live. See [How findings are judged](how-it-works#the-report-and-finding-pages-are-read-from-stored-snapshots).

Every `200` of the nine routes carries `as_of`, the time Otherlode read the data, and `from_snapshot`. For a snapshot, `from_snapshot` is `true` and `as_of` is the time the snapshot was computed. For a live read, `from_snapshot` is `false` and `as_of` is the time the read started.

A refresh can replace a snapshot while you page through a route, and the pages of two snapshots do not fit together. When a later page has another `as_of` than the first and either page has `from_snapshot` `true`, start again from the first page. Two live pages always differ in `as_of`, since each is read when it arrives, so do not start again for them.

A snapshot scope with no snapshot yet answers `202` with no rows or counts and a `Retry-After: 60` header:

```json
{"status": "computing", "last_failed_at": null}
```

A new service, environment or version has none until the next refresh computes it, and neither has any scope after Otherlode changes how findings are judged. The refresh runs every 5 minutes. It computes your missing snapshots before your other snapshots, and among them every scope with no `version` before any scope with one. The `202` is not an error. Repeat the request a minute or two later. A route never computes a snapshot scope live in its place.

`last_failed_at` is the time the last refresh of the scope failed, or `null` when none has failed since its last snapshot. A refresh that stopped without a result, such as one that ran out of memory, counts as failed at the time it started, once it is more than 6 minutes old. A failed refresh holds back every scope of its service for an hour, so a scope can wait with `last_failed_at` `null` while another scope of its service failed. The refresh then tries the other scopes first and the failed one after them. The `202` never says why a refresh failed.

## `GET /me`

Names the tenant of the credential.

```json
{"tenant": "acme", "user": null}
```

| Field | Type | Meaning |
|---|---|---|
| `tenant` | string | The tenant's name. |
| `user` | object or null | The signed-in user, `{"email", "role"}` with `role` `admin` or `viewer`. A request made with a key carries no user, so the field is `null`. |

A call to `/me` is the quickest check that a key works.

## `GET /services`

Lists every tracked service that a production run has reported, ordered by namespace and then name. The unspecified namespace comes first. A service past your tenant's service cap is not tracked and appears in `not_tracked_services` instead.

```json
{
  "services": [
    {
      "namespace": null,
      "name": "checkout",
      "instances": 3,
      "last_seen_at": "2026-10-06T14:02:51Z",
      "watched_since": "2026-08-19T08:30:12Z",
      "environments": [
        {"name": "prod", "watched_since": "2026-08-19T08:30:12Z"},
        {"name": "staging", "watched_since": "2026-09-02T11:47:30Z"}
      ],
      "not_tracked_environments": []
    }
  ],
  "not_tracked_services": [
    {
      "namespace": null,
      "name": "reports",
      "instances": 1,
      "last_seen_at": "2026-10-06T13:40:02Z"
    }
  ]
}
```

| Field | Type | Meaning |
|---|---|---|
| `namespace` | string or null | The service's namespace. `null` is the unspecified namespace. |
| `name` | string | The service's name. |
| `instances` | integer | Distinct instances with a production run. It counts instances, not runs. |
| `last_seen_at` | timestamp or null | The latest time any production run was seen. `null` when no instance is left. |
| `watched_since` | timestamp or null | The earliest `watched_since` of the environments. |
| `environments` | array | Each watched environment, ordered by name. Each is `{"name", "watched_since"}`. |
| `not_tracked_environments` | array | The names of the environments a production run reported in after the service reached its environment cap, ordered by name. No dead-code claim counts their runs. `instances` and `last_seen_at` do. See [Scope and environments](scope#a-service-watches-at-most-10-environments). |

Each entry of `not_tracked_services` is a service that a production run has reached and that holds no slot of your tenant's service cap. Its runs are stored, and no dead-code claim counts them. The array is empty when there is none.

| Field | Type | Meaning |
|---|---|---|
| `namespace` | string or null | As in `services`. |
| `name` | string | The service's name. |
| `instances` | integer | Distinct instances with a production run, counted as in `services`. |
| `last_seen_at` | timestamp or null | The latest time any production run was seen, as in `services`. |

Every route under `/services/{service}/` for a service that is not tracked answers `404` with `{"error":"service not tracked"}`. A service that does not exist answers `{"error":"service not found"}`. See [Scope and environments](scope#your-plan-tracks-a-fixed-number-of-services) for how a service gets a slot.

A test run counts toward none of these figures. See [Inventory](inventory) for the same list in the web app.

## Read a service

Every route below starts with `/services/{service}/` and takes the [scope parameters](#scope-parameters). The tables list each route's own parameters and fields.

### `GET /services/{service}/instances`

One row per instance with at least one in-scope run. The rows come newest first by `last_seen_at`. The route has no paging and no `total`.

The response is `{"instances": [...]}`. `run_id`, `version` and `environment` come from the instance's latest in-scope run, the one that started last.

| Field | Type | Meaning |
|---|---|---|
| `instance_id` | string | The agent's instance ID. |
| `run_id` | string | The latest run's ID. |
| `runs` | integer | The number of in-scope runs of the instance. |
| `version` | string or null | The latest run's version. |
| `environment` | string | The latest run's environment. `none` when the run named none. |
| `first_seen_at` | timestamp | When Otherlode first heard from the instance. |
| `last_seen_at` | timestamp | The latest time any in-scope run was seen. |
| `baseline` | string | `complete` when any in-scope run holds a complete [static baseline](/docs/agent/classes#never-loaded), `incomplete` when one holds a scan that is not complete, else `none`. |
| `ended_cleanly` | boolean | `true` once the latest run's shutdown flush arrived. |
| `dependencies_listed` | boolean | `true` when every in-scope run sent its whole dependency listing. |
| `agent_version` | string | The agent version of the latest run. |
| `fields_stripped` | boolean | `true` when the latest run is a stripped run. The list shows it, and no finding counts it. |
| `deltas_received` | boolean | `true` once a delta batch of the latest run has arrived. A run that sent only a manifest reads `false`. |
| `earlier_run_unsettled` | boolean | `true` when an in-scope run of the instance other than the latest has received no delta batch or has counts that are behind. The report's `unsettled` counts the instance for it. |
| `counts_behind_since` | timestamp or null | When Otherlode received the first payload that said some hits the latest run recorded had not reached it. `null` when the run's newest payload says none are missing. |

### `GET /services/{service}/report`

The counts behind the overview page. It has no paging. Every count covers the in-scope runs, except `instances.listed`, which also counts runs that match the scope but came through a collector older than their agent. The meaning of each finding is in [Findings](findings), [Inventory](inventory) and [Unreached clusters](unreached-clusters).

The route is [read from a snapshot](#routes-read-from-a-snapshot) for most scopes, and answers `202` while the snapshot is computing. It reads no parameter other than the three scope parameters.

| Field | Type | Meaning |
|---|---|---|
| `namespace`, `service` | string or null, string | The service. |
| `version` | string or null | The `version` filter, `null` when unset. |
| `active_within_days` | integer or null | The `active_within_days` filter, `null` when unset. |
| `as_of` | timestamp | When Otherlode read the data. See [routes read from a snapshot](#routes-read-from-a-snapshot). |
| `from_snapshot` | boolean | `true` when a stored snapshot gave the report, `false` for a live read. |
| `instances` | object | `total`, `listed`, `with_complete_baseline`, `ended_cleanly`, `silent_without_final_flush`, `unsettled`, `verifier_unwatched`, `unplaced_verification` and `with_skipped_class`. Each counts distinct instances. `unsettled` counts the instances with an in-scope run that has received no delta batch or whose counts are behind. `total` counts the instances with a run a finding can judge. `listed` counts every instance the `/instances` route lists, so it also counts an instance whose every run that matches the scope came through a collector older than its agent. It is never below `total`. `ended_cleanly` and `silent_without_final_flush` judge an instance by its latest run. `unsettled` counts an instance once when any of its in-scope runs is unsettled, so the instance list shows the same instance with a badge for its latest run or with `earlier_run_unsettled`. A run is silent when it has not ended cleanly and was not seen for over an hour. `verifier_unwatched` counts the instances with an in-scope run whose agent could not see the verifier's rejections. `unplaced_verification` counts the instances with an in-scope run that reported a verification failure it could not place in a class. Neither kind of run supports a zero-count claim. `with_skipped_class` counts the instances with an in-scope run whose manifest named a skipped class. A skipped class supports no zero-count claim in any run, and a skip kept from a run that has expired is not counted. See [Findings](findings#without-evidence). |
| `methods` | object | `known` is the sum of `hit`, `never_hit`, `in_class_findings`, `in_never_hit_code`, `unjudged_constructors`, `counts_behind` and `without_evidence`. It counts judgeable methods and leaves out static initialisers. A method the service has recorded a hit of counts in `hit` when the request names no `version` and no `active_within_days`, even when no run in scope holds a hit. `counts_behind` counts the methods with no hits that a run not yet settled knows. They make no zero-count claim. `without_evidence` counts the other methods with no hits that no run is [evidence](findings#without-evidence) about. They make no zero-count claim either. |
| `branch_sites` | object | `known`, `all_outcomes_hit`, `with_never_hit_outcome`, `in_never_hit_code`, `routine`, `counts_behind`, `withheld` and `without_evidence`. A site that folds into code a finding already lists counts in `in_never_hit_code`. `routine` counts sites whose only never-hit outcomes are routine. `counts_behind` counts sites whose judgeable outcomes with no hits are all in locations a run not yet settled knows. `withheld` counts the other sites with an outcome with no hits and no branch key, in an environment that has lost a production run. `without_evidence` counts the other sites with a never-hit outcome that no run is evidence about. They make no claim. The first three leave the other five out. |
| `probes` | object | `inline` and `generated` count the probes the counts above leave out. `no_debug_info` counts judgeable probes in classes that carry no line numbers. |
| `classes` | object | `declared`, `loaded`, `never_loaded`, `never_initialized`, `never_instantiated`, `all_inline_or_generated`, `unreported`, `failed_to_load`, `failed_to_initialize` and `skipped`. `unreported` counts classes a sweep found loaded that the agent reported nowhere else. They count as loaded. A class that failed to load is in none of `declared`, `loaded` or `never_loaded`. `failed_to_initialize` counts the classes that [failed to initialise](findings#failed-to-initialise). The JVM defined them, so they stay in `declared` and `loaded`, and they are in no class finding. `skipped` counts the classes with code in scope that a run skipped. A skipped class supports no claim that rests on missing hits. A read that names no `version` and no `active_within_days` also counts the classes with code in scope that the environment's record names, so the count outlives the run that skipped them. |
| `endpoints` | object | `known`, `called`, `never_called`, `never_called_outside`, `module_disabled`, `counts_behind` and `without_evidence`. An endpoint whose module switched itself off counts only in `module_disabled`. An endpoint with no calls that a run not yet settled knows counts only in `counts_behind`. `without_evidence` counts the endpoints that would be `never-called` but have no run that is [evidence](findings#without-evidence) about them. `never_called` counts the endpoints whose `status` is `never-called`, except the [outside routes](findings#outside-routes). `never_called_outside` counts the outside routes whose `status` is `never-called`. `known` is not `called` plus `never_called`: the difference is the endpoints found only by dispatch that show no call, which read `not-judged`, the `without_evidence` endpoints, and the outside routes in `never_called_outside`. |
| `optional_parameters` | object | `known`, `never_supplied` and `always_supplied`. |
| `disabled_endpoint_modules` | array | `{"module", "kind", "kind_label", "reason", "instances"}` for each endpoint module that switched itself off or that the agent's configuration kept off. The `kind` and `reason` are the ones the newest in-scope run gave. `kind` is `linkage_error` (the framework release differs from the one the module was built for), `advice_failed` (the module's advice threw), `transform_failed` (the module's transform threw, or a framework class it hooks failed to weave), `route_walk_failed` (walking the framework's route objects threw), `hook_unmatched` (a hook matched no method on the framework class it hooks), `configured_off` (the agent's configuration kept the module off), `routes_not_counted` (the runtime has no dispatch point the module counts requests at, so it declared no route), `unspecified` when the agent gave none, or `unknown` for a kind Otherlode does not name, which a newer agent sent. `kind_label` is Otherlode's text for the kind. |
| `framework_markers` | array | `{"id", "kind", "label", "classes", "instances"}` for each framework marker some in-scope run reported and Otherlode does not judge covered for that run's agent version, ordered by `id`. A marker is the agent's observation that one framework's routing was set up, so the endpoint list leaves its routes out. `kind` is `started` or `configured`, the claim the agent observed, or `unknown` for an id Otherlode does not name. `label` is Otherlode's text for the claim. For an unknown id it says a newer agent reported the marker. `classes` are the class names that proved it, from the newest in-scope run that reported it and is not judged covered. `instances` counts the instances with such a run. |
| `unreached_clusters` | object | `count`, `methods_attributed`, `called_only_by_tests`, `test_only_unconfirmed`, `called_from_outside_scope`, and `largest`. `largest` is `{"root", "members_total"}` for the biggest cluster, or `null`. `root` has the shape of a [cluster root](#get-servicesserviceunreached-clusters). |
| `dependencies` | object | `known`, one count for each status (`unloaded`, `unreferenced`, `unreached`, `no_live_reference`, `failed_to_load`, `failed_to_initialize`, `counts_behind`, `without_evidence`, `stale`, `used`, `loaded`, `resources_only`), `absent_references`, and four more fields. `failed_to_initialize` counts the loaded dependencies with no live reference that only a class that failed to initialise references, and claims no removal. `without_evidence` counts the dependencies whose `unreached` or `no-live-reference` status would rest on zero counts that no settled run is evidence for. It claims nothing, and no other count includes those dependencies. `counts_behind` counts the dependencies whose status would rest on counts that a run not yet settled has not delivered. It claims nothing, and no other count includes those dependencies. `stale` counts the startup dependencies that no run in scope loaded a class from, though the service has recorded a load. It claims no removal, and the read must name no `version` and no `active_within_days`. `references_recorded` is `true` when some run records references. `split_available` is `true` when some dependency was judged on its references and every such dependency was judged only by runs with a complete baseline. `listing_complete` and `instances_awaiting_listing` say whether every dependency listing arrived. A zero in `unreferenced` or `unreached` means none only when `split_available` and `listing_complete` are both `true`. |
| `removed` | object | `classes`, `methods`, `endpoints` and `dependencies`, the count of each kind on the [`/removed`](#get-servicesserviceremoved) list. A method of a removed class is not counted. No other count in the report includes removed code. Each count is `0` for a read that names a `version` or an `active_within_days`. |
| `test_runs` | object | `count` and `last_seen_at` of the service's test runs in every environment and version. No other figure counts them. |
| `stripped_runs` | integer | The service's stripped production runs in every environment and version. |
| `unread_shapes` | object | `methods` and `outcomes` map each unread-shape family to a count, and `agent_versions` lists the agent versions that sent any. A family Otherlode does not name adds up under `unknown`. |

### `GET /services/{service}/never-hit`

The never-hit finding as `rows`. A row is a method row or a site row. See [Site rows](#site-rows) for the second kind. The route is [read from a snapshot](#routes-read-from-a-snapshot) for most scopes when the request has no `known_for_days`, and answers `202` while the snapshot is computing. A request with `known_for_days` is computed live.

| Parameter | Value | Effect |
|---|---|---|
| `kind` | `method` or `branch` | Keeps only method rows or only site rows. Another value gets `400` with `kind must be "method" or "branch"`. `optional_argument` gets its own `400`, which names `/optional-parameters`. |
| `routine` | `exclude` or `include` | `exclude`, the default, leaves routine outcomes out of the finding. `include` lists them too. Another value gets `400` with `routine must be "exclude" or "include"`. |

The route also takes `class_prefix` and `known_for_days`. Rows come in order of class, method and descriptor, with a method row before its site rows. `total` counts rows.

A method row has these fields, plus the [method naming fields](#method-naming-fields):

| Field | Type | Meaning |
|---|---|---|
| `kind` | string | Always `method`. |
| `class_name`, `method_name`, `method_descriptor` | string | The method. |
| `line` | integer | The method's line. `-1` when the class carries no line numbers. |
| `branch_index`, `branch_key` | null | Always `null` on a method row. |
| `instances_known`, `first_known_at`, `dates_capped` | | See [shared fields](#fields-every-response-uses). |
| `generated_by` | string | The method's generated mark. See [generated methods](/docs/agent/methods-and-branches#generated-methods). |
| `unread_shape` | string | Always `none`, since the finding lists no unread method. |
| `inlined_from_class_name` | string or null | The class an inlined copy came from. |
| `routes` | array | The endpoints this method handles, as `{"verb", "route_template", "template_kind", "template_kind_label"}`, sorted by verb, then template, then kind. `verb` is `*` when the framework takes any method. See `template_kind` under [the endpoints route](#get-servicesserviceendpoints). |

The response is `{"rows", "total", "capped_hidden", "watched_since", "as_of", "from_snapshot"}`. `capped_hidden` counts the capped outcomes that `known_for_days` left out, and the outcomes with no branch key that an environment of the read lost a run for. Without `known_for_days` it counts only the second kind. See [Dates](dates).

### `GET /services/{service}/stale-hit`

The stale-hit finding: code that some run hit, but not within the last `days` days. When the request names no `version` and no `active_within_days`, code that the service has recorded a hit of counts as hit by some run, so a row can have `hits_total` `0`. It returns the same two row kinds as `/never-hit`. The route is [read from a snapshot](#routes-read-from-a-snapshot) for most scopes, with every parameter applied to the snapshot, and answers `202` while the snapshot is computing. `days` then counts back from `as_of`.

| Parameter | Value | Effect |
|---|---|---|
| `days` | A whole number, 1 to 36500 | The cutoff in days. The default is 30. Another value gets `400` with "days must be a whole number from 1 to 36500". |
| `kind` | `method` or `branch` | As on `/never-hit`. |
| `order` | `last_hit` or `class` | `last_hit`, the default, puts the stalest row first. `class` keeps the rows of one class together, in the order of `/never-hit`. Another value gets `400` with `order must be "last_hit" or "class"`. |

The route also takes `class_prefix`. A method row has the fields of a `/never-hit` method row, with these differences: it adds `first_hit_at` (timestamp or null), `hits_total` (integer) and `last_hit_at` (timestamp, never `null`), and it has no `known_for_days` filter. The response carries the same six fields as `/never-hit`, and `days`, the value it used.

### Site rows

A site row stands for one branch site, a conditional jump or a switch, with at least one outcome that is in the finding. It lists every outcome of the site. `in_finding` marks the outcomes that put the site on the list. `/never-hit` and `/stale-hit` return site rows, and so does the `site` field of an [`untaken_outcome` cluster root](#get-servicesserviceunreached-clusters).

| Field | Type | Meaning |
|---|---|---|
| `kind` | string | Always `branch`. |
| `class_name`, `method_name`, `method_descriptor`, `line` | | The method that holds the site, and the site's line. |
| `site_key` | string or null | The agent's key for the site. |
| `condition` | array | The condition as parts, `{"kind", "text"}`. `kind` is `code`, `string_literal` or `placeholder`. Show the parts one after the other with nothing between them. |
| `guard` | integer or null | The branch index of the innermost outcome that the site sits behind. A site behind a finding folds into that outcome's row. |
| `instances_known`, `inlined_from_class_name`, `routes` | | As on a method row. |
| `outcomes` | array | The outcomes of the site, described next. |

Each outcome has these fields:

| Field | Type | Meaning |
|---|---|---|
| `branch_index` | integer | The agent's index for the outcome. |
| `branch_key` | string or null | The agent's key. An outcome with a key has service-wide dates. |
| `role` | string or null | `taken`, `fall_through`, `case` or `default`. |
| `case_key`, `case_label` | integer or null, array | For a switch case. `case_label` has the shape of `condition`. |
| `hits_total` | integer | Hits across the in-scope runs. |
| `first_known_at`, `first_hit_at`, `last_hit_at`, `dates_capped` | | See [shared fields](#fields-every-response-uses). The last two are `null` for an outcome never hit. |
| `guarded_lines`, `partly_guarded_lines` | array | Lines that run only through this outcome, and lines that also hold code reached another way. Each is `{"source_file", "first_line", "last_line"}`. |
| `routine` | string | `none`, `null_default`, `throw_only` or `finally_copy`. See [routine outcomes](/docs/agent/methods-and-branches#routine-outcomes). |
| `unread_shape` | string | The outcome's unread-shape family, or `none`. See [unread shapes](/docs/agent/methods-and-branches#unread-shapes). An unread outcome is never `in_finding`. |
| `in_finding` | boolean | `true` when this outcome puts the site on the list. |

A site row also carries the [method naming fields](#method-naming-fields).

### `GET /services/{service}/probes`

Every known probe location, merged across the in-scope runs, with its hit count, whatever the kind. It shows the raw evidence behind a finding.

| Parameter | Value | Effect |
|---|---|---|
| `kind` | `method`, `branch` or `optional_argument` | Keeps one kind. Another value gets `400` with `kind must be "method", "branch", or "optional_argument"`. |
| `class` | A class name | Keeps one class, matched exactly. It combines with `class_prefix`. |
| `routed` | `true` or `false` | `true` keeps probes whose method handles an in-scope endpoint, and `false` keeps the rest. Another value gets `400` with `routed must be "true" or "false"`. |
| `include_generated` | `true` or `false` | `false`, the default, leaves out generated probes. |
| `include_unread` | `true` or `false` | `false`, the default, leaves out probes with an unread shape. |

The response is `{"probes", "total", "watched_since", "as_of", "from_snapshot"}`. Rows come in order of class, method, descriptor and kind. The route is [read from a snapshot](#routes-read-from-a-snapshot) for most scopes, with every parameter applied to the snapshot, and answers `202` while the snapshot is computing. `hits_total` is then the count when the snapshot was computed. A probe has the [method naming fields](#method-naming-fields) and these fields:

| Field | Type | Meaning |
|---|---|---|
| `class_name`, `method_name`, `method_descriptor`, `line` | | The location. On a branch row, `line` is the site's line. |
| `kind` | string | `method`, `branch` or `optional_argument`. |
| `branch_index`, `branch_key` | integer or null, string or null | Set on a branch row. |
| `instances_known`, `first_known_at`, `first_hit_at`, `last_hit_at`, `dates_capped` | | See [shared fields](#fields-every-response-uses). |
| `hits_total` | integer | Hits across the in-scope runs. For an optional-argument probe, the calls that left the parameter out. |
| `counts_behind` | boolean | `true` when an in-scope run that knows the location is not settled. With `hits_total` `0` no finding claims the location never ran. The hits of that run still count. |
| `without_evidence` | boolean | `true` when every run that knows the location is settled and none is [evidence](findings#without-evidence) about it. With `hits_total` `0` no finding claims the location never ran, as with `counts_behind`. It is `false` where `counts_behind` is `true`. |
| `recorded_hit` | boolean | `true` when the request names no `version` and no `active_within_days`, the service has recorded a hit of the location, and the location's dates are not capped. `hits_total` stays the in-scope count, so a location with `recorded_hit` can show `0` hits. Such a location counts as hit. A client that draws a hit status reads `hits_total` above `0` or `recorded_hit`. |
| `claim_withheld` | boolean | `true` on a branch row with no `branch_key` when an environment of the read has lost a production run. With `hits_total` `0` the outcome is neither hit nor never hit, since a removed run may have hit it. `false` on every other row. A client must not draw such an outcome as never hit. |
| `inline` | boolean | `true` for a probe inside a Kotlin inline function. |
| `generated_by`, `unread_shape` | string | The probe's marks. A probe with either mark is stored and shown, and never judged. `generated_by` is `none`, `enum`, `data_class`, `default_impls`, `record`, `jvm_overloads`, `multifile_facade`, `case_class`, `static_forwarder`, `scala_object`, `value_class`, `kotlinx_serialization`, or `unknown` for a value Otherlode does not name, which a newer agent sent. |
| `inlined_from_class_name` | string or null | The class an inlined branch copy came from. |
| `routes` | array | As on a never-hit row. |
| `parameter_index`, `parameter_name`, `overridable`, `target_class_name` | integer or null, string or null, boolean, string or null | For an optional-argument probe. `target_class_name` is set only for a Scala constructor default. |
| `site_index`, `site_key`, `condition`, `guard` | | The site of a branch row. Otherwise `null`. |
| `role`, `case_key`, `case_label`, `guarded_lines`, `partly_guarded_lines` | | The outcome of a branch row, as in [site rows](#site-rows). Otherwise `null`. |
| `in_never_hit_code` | boolean or null | On a branch row, `true` when the site folds into a never-hit method. Otherwise `null`. |
| `routine` | string or null | On a branch row, the outcome's routine kind. Otherwise `null`. |
| `outside_caller` | object or null | On a method row, why code outside the scope may call it: `{"kind", "type_name"}`. `kind` is `overrides_method` or `callback_annotation`. |

### `GET /services/{service}/classes`

One row per class with probes in scope. The rows of every class add up to the [report](#get-servicesservicereport).

| Parameter | Value | Effect |
|---|---|---|
| `class` | A class name | Keeps one class, matched exactly. |
| `routed` | `true` or `false` | `true` keeps classes with a method that handles an in-scope endpoint, and `false` keeps the rest. Another value gets `400`. |

The response is `{"classes", "total", "as_of", "from_snapshot"}`, ordered by class name. The route is [read from a snapshot](#routes-read-from-a-snapshot) for most scopes, with every parameter applied to the snapshot, and answers `202` while the snapshot is computing. A row has the [class naming fields](#class-naming-fields) and these fields:

| Field | Type | Meaning |
|---|---|---|
| `class_name` | string | The class. |
| `methods` | object | The report's `methods` counts for this class. |
| `branch_sites` | object | The report's `branch_sites` counts for this class. |
| `routed` | boolean | `true` when any method of the class handles an in-scope endpoint. |
| `finding` | string or null | `never_initialized`, `never_instantiated` or `null`. |
| `failed_to_initialize` | boolean | `true` when the class is on [`/failed-to-initialize`](#class-finding-routes). Such a class has `finding` `null`. |

No filter changes a row's counts.

### Class finding routes

Four routes list classes by one finding each. All four take `class_prefix`, and the response is `{"classes", "total"}`, ordered by class name.

| Route | Lists | Extra parameters |
|---|---|---|
| `/never-loaded` | Classes a complete static baseline declared that no in-scope run loaded. A class that failed to load is left out. | None |
| `/never-initialized` | Loaded classes whose static initialiser never ran. | `known_for_days` |
| `/never-instantiated` | Loaded classes with a constructor and an instance method, where no constructor ran. | `known_for_days` |
| `/failed-to-load` | Classes the agent wove that the JVM never defined. Each is a deployment problem and never dead code. | None |
| `/failed-to-initialize` | Classes the JVM defined whose verification or static initialiser failed, and the subtypes that fail with them. Each is a deployment problem and never dead code. | None |

`/never-initialized` and `/never-instantiated` also return `watched_since`, `as_of` and `from_snapshot`. Their `known_for_days` keeps a class only when its `first_known_at` is at least that many days old. Both are [read from a snapshot](#routes-read-from-a-snapshot) for most scopes, with every parameter applied to the snapshot, and answer `202` while the snapshot is computing. `known_for_days` then counts back from `as_of`. See [Findings](findings).

`/never-loaded`, `/never-initialized` and `/never-instantiated` rows have the [class naming fields](#class-naming-fields) and these fields:

| Field | Type | Meaning |
|---|---|---|
| `class_name` | string | The class. |
| `methods` | array of strings | The class's method names. A static initialiser is not listed. |
| `methods_generated_by`, `methods_unread_shape` | array of strings | One value for each entry of `methods`, in the same order. |
| `instances_declaring` | integer | `/never-loaded` only. Instances whose baseline declares the class. |
| `instances_loading` | integer | The other two routes. Instances that loaded the class. |
| `first_known_at` | timestamp | The other two routes. The date of the probe that decides the finding. |

A `/failed-to-load` row has no probes, so it has no naming fields:

```json
{
  "classes": [
    {
      "class_name": "com.acme.pay.LegacyGateway",
      "instances_naming": 2,
      "first_failed_at": "2026-09-30T06:13:02Z",
      "last_failed_at": "2026-10-06T14:02:51Z",
      "failing_for_days": 6
    }
  ],
  "total": 1
}
```

| Field | Type | Meaning |
|---|---|---|
| `class_name` | string | The class. |
| `instances_naming` | integer | Instances whose in-scope runs name the class as failed. |
| `first_failed_at`, `last_failed_at` | timestamp or null | When the first and the latest manifest named the class. With no `environment`, they are the earliest first and the latest last across environments. `null` when no environment in scope has a row. |
| `failing_for_days` | integer or null | Whole days from `first_failed_at` to the read. |

`/failed-to-initialize` is worked out when the request arrives and never read from a snapshot. Its rows carry no naming fields:

```json
{
  "classes": [
    {
      "class_name": "com.acme.pay.Gateway",
      "reasons": ["static-initializer-threw"],
      "carried_from": [],
      "instances_naming": 2,
      "first_failed_at": "2026-09-30T06:13:02Z",
      "last_failed_at": "2026-10-06T14:02:51Z",
      "failing_for_days": 6
    },
    {
      "class_name": "com.acme.pay.GatewayClient",
      "reasons": [],
      "carried_from": ["com.acme.pay.Gateway"],
      "instances_naming": 2,
      "first_failed_at": null,
      "last_failed_at": null,
      "failing_for_days": null
    }
  ],
  "total": 2
}
```

| Field | Type | Meaning |
|---|---|---|
| `class_name` | string | The class. |
| `reasons` | array of strings | The reasons in-scope runs named the class with, sorted: `static-initializer-threw`, `verifier-rejected`, or `unknown` for a reason a newer agent sent. Empty for a class that fails only because a supertype does. |
| `carried_from` | array of strings | The supertypes that some in-scope run named and that the class's failure carries from, sorted. Empty when no named supertype carries the failure to the class. |
| `instances_naming` | integer | Instances with an in-scope run that failed the class, named or carried. |
| `first_failed_at`, `last_failed_at` | timestamp or null | As on `/failed-to-load`, from the manifests that named the class itself. `null` when no manifest from the scoped environments has named the class itself. |
| `failing_for_days` | integer or null | Whole days from `first_failed_at` to the read. |

### `GET /services/{service}/unclassified`

Classes a scan found but could not read or probe. It takes `class_prefix`, and the response is `{"classes", "total"}`, ordered by class name and then bucket. Each row has `class_name`, `bucket` (`unreadable` or `unprobed`) and `reason` (string). See [Inventory](inventory).

### `GET /services/{service}/removed`

Classes, methods, endpoints and dependencies that every live run of the environment proves absent. See [Removed](inventory#removed) for what proves it. The route takes `class_prefix`, and the response is `{"rows", "total", "as_of", "from_snapshot"}`. The route is [read from a snapshot](#routes-read-from-a-snapshot) for most scopes, and answers `202` while the snapshot is computing. So without a `class_prefix` its `total` equals the sum of the report's `removed` counts, and a class on this list is in none of the findings that the same snapshot holds. A request that names a `version` or an `active_within_days` lists no rows, and its `total` is 0.

Rows come in this order: by kind (`class`, `method`, `endpoint`, `dependency`), and then within a kind by the identifiers as Otherlode stores them, compared byte by byte. A class row goes by `class_name`. A method row goes by `class_name`, `method_name` and `method_descriptor`. An endpoint row goes by `verb`, then `route_template`, then `template_kind`, so the stored verb `*`, which stands for any verb, comes before every named verb. A dependency row goes by `identity_key`, which is its `group:artifact` pairs sorted and joined with commas, so a dependency whose first identity has no group comes before one that has a group, and the order is not that of the names a page shows.

A row has the fields of its kind and no others:

| Field | Kinds | Meaning |
|---|---|---|
| `kind` | every row | `class`, `method`, `endpoint` or `dependency`. |
| `class_name` | `class`, `method` | The class, as the agent names it. |
| `method_name`, `method_descriptor` | `method` | The method, as the agent names it. |
| `line` | `method` | A lambda body's own line, which its label reads. `0` for any other method, or when no line is known. |
| `verb`, `route_template`, `template_kind`, `template_kind_label` | `endpoint` | The endpoint, as an `/endpoints` row carries it. The verb `*` stands for any verb. |
| `identity_key` | `dependency` | The dependency's cross-run name. |
| `identities` | `dependency` | `{"group_id", "artifact_id", "versions"}` for each identity, as `/dependencies` shows them. |
| `stopped_at` | every row | The latest time Otherlode received a payload from a run that held the thing. |

A class row also carries the [class naming fields](#class-naming-fields), and a method row the [method naming fields](#method-naming-fields), which already describe the method's class. They come from the same facts as any other row of that class or method, so a client names a removed row as it names the rest. The row has no name field: a client builds the text it shows from these fields.

### `GET /services/{service}/endpoints`

Endpoints merged across the in-scope runs and identified by `verb`, `route_template` and `template_kind`. A regular expression, a servlet pattern and a path with the same text are two endpoints. The response is `{"endpoints", "total", "days", "watched_since"}`. `days` is the value the request used. The rows follow `order`.

| Parameter | Value | Effect |
|---|---|---|
| `status` | `all` or a row `status` | `all` is the default. Any other value keeps the endpoints with that status. Another value gets `400` with `status must be "all", "module-disabled", "live", "counts-behind", "without-evidence", "never-called", "stale", or "not-judged"`. |
| `days` | A whole number, 1 to 36500 | The cutoff between `live` and `stale`. The default is 30. Every status accepts it, and `module-disabled` and `never-called` ignore it. Another value gets `400` with "days must be a whole number from 1 to 36500". |
| `order` | `route`, `never_called_first` or `live_first` | `route`, the default, sorts by verb, then route template, then template kind. A client that pages with `offset` should keep it, since a status order moves rows between pages as calls arrive. `never_called_first` sorts `never-called`, then `stale`, then `live`. `live_first` sorts `live`, then `stale`, then `never-called`. Within a status the strongest case comes first: the earliest `first_known_at` for `never-called`, the oldest `last_called_at` for `stale` and the newest for `live`. Then come `module-disabled`, then `counts-behind` and `without-evidence` together, then `not-judged`, each by verb, route template and template kind. The order applies to the rows `status` keeps. Another value gets `400` with `order must be "route", "never_called_first", or "live_first"`. |
| `framework` | A module name | Keeps endpoints from that framework module, matched exactly. |
| `outside` | `exclude` or `only` | Without it every endpoint is listed. `exclude` keeps the endpoints whose `handler_included` is not `false`, which are the service's own routes and the ones with no answer. `only` keeps the [outside routes](findings#outside-routes), the endpoints whose `handler_included` is `false`. `total` counts the rows it keeps. Another value gets `400` with `outside must be "exclude" or "only"`. |

`class_prefix` matches the handler class. A row has these fields:

| Field | Type | Meaning |
|---|---|---|
| `verb` | string | The HTTP method, upper case. `*` when the framework takes any method. |
| `route_template` | string | The agent's normalised template. For a `regex` template it is the framework's regular expression as written. For a `servlet_pattern` template it is the servlet mapping as written, such as `*.do` or `/`. |
| `template_kind` | string | `path` for a path template, `regex` for a regular expression, `servlet_pattern` for a servlet extension mapping or default mapping, or `unknown` for a kind Otherlode does not name. An agent that predates the field reads as `path`. A `regex` or `servlet_pattern` template is never a path: no filter or label reads it as one. |
| `template_kind_label` | string | The text Otherlode writes for the kind: `Path`, `Regular expression`, `Servlet pattern`, or for `unknown` a label saying a newer agent sent it. |
| `verbatim_template` | string | The framework's own spelling of the template. |
| `framework` | string | The endpoint module that reported it. |
| `discovery_source` | string | `registration` when a framework hook declared it, `dispatch` when the first request found it. |
| `handler_class`, `handler_method`, `handler_descriptor` | string or null | The handler, when the agent could join the endpoint to one. |
| `handler_included` | boolean, or absent | `false` for an [outside route](findings#outside-routes): every in-scope run that declares the endpoint named a handler class and sent include rules that do not cover it. `true` when the include rules of some in-scope run cover a handler class that run named. The key is absent when no run covers the handler class and some run named no handler class or sent no rules. It changes no `status`. |
| `instances_known`, `first_known_at`, `first_called_at`, `last_called_at`, `dates_capped` | | See [shared fields](#fields-every-response-uses). |
| `calls_total` | integer | Calls across the in-scope runs. It never includes a call that only the service's record holds, so on a request that names no `version` and no `active_within_days` a stale endpoint can show `0`. |
| `status` | string | The one status of the endpoint. `module-disabled`: every in-scope run that knows it had its module switched off. `live`: it was called and its last call is on or after the cutoff. `counts-behind`: a run that knows it is not settled, and it is not live. `never-called`: it was registered, has no calls and no call on record, no run that knows it is unsettled, and some settled run that reports it is [evidence](findings#without-evidence) about it. `without-evidence`: it would be `never-called`, but no run that reports it is evidence about it. `stale`: it was called, its last call is before the cutoff, and its dates are not capped. `not-judged`: none of these, for example an endpoint found only by dispatch whose count was lost, or a called endpoint whose capped last call is before the cutoff. The checks run in this order and the first match wins. |
| `module_disabled` | boolean | `true` when every in-scope run that knows the endpoint had its module switched off. Its counts stopped where the module stopped. |
| `call_recorded` | boolean | `true` when the request names no `version` and no `active_within_days`, the service has recorded a call of the endpoint, and its dates are not capped. `calls_total` stays the in-scope count. An endpoint with `call_recorded` counts as called. |
| `counts_behind` | boolean | `true` when the endpoint has no calls, an in-scope run that knows it is not settled, and the module is not switched off. On a request that names no `version` and no `active_within_days`, an endpoint with a call the service has recorded is called, so it is never `true`. The calls that run has not delivered could make the endpoint called. The `counts-behind` status is wider: it also holds a called endpoint that such a run knows, when that endpoint is not `live`. |

Each row also describes its handler with `handler_`-prefixed copies of the [method naming fields](#method-naming-fields) (`handler_created_in`, `handler_lambda_body`, `handler_captured_count`, `handler_lambda_interface`, `handler_creation_ordinal`, `handler_parameter_names`, `handler_generic_signature`, `handler_extension_receiver`) and of the [class naming fields](#class-naming-fields) (`handler_source_file`, `handler_body_kind`, `handler_source_name`, `handler_kotlin_kind`, `handler_body_interface`). `handler_line` is the line of a lambda-body handler, else `0`. Without a known handler class the fields hold `null`, `false`, `0`, `[]`, `""`, `none`, in the type each field has.

### `GET /services/{service}/optional-parameters`

Optional-parameter probes merged across the in-scope runs, with the [method naming fields](#method-naming-fields) of the target function. The response is `{"optional_parameters", "total", "watched_since"}`, ordered by class, method, descriptor and parameter index.

| Parameter | Value | Effect |
|---|---|---|
| `status` | `all`, `never-supplied` or `always-supplied` | `all` is the default. Another value gets `400` with `status must be "all", "never-supplied", or "always-supplied"`. |

| Field | Type | Meaning |
|---|---|---|
| `class_name`, `method_name`, `method_descriptor`, `line` | | The target function. |
| `parameter_index` | integer | The zero-based index of the optional parameter. |
| `parameter_name` | string or null | The name, when the class carries debug information. |
| `inline`, `overridable` | boolean | The function is inline, or can be overridden. |
| `generated_by`, `unread_shape` | string | The probe's marks. |
| `instances_known`, `first_known_at`, `first_omitted_at`, `last_omitted_at` | | See [shared fields](#fields-every-response-uses). |
| `omissions_total` | integer | Calls that left the parameter out. |
| `target_hits_total` | integer or null | Hits of the target function. `null` when it has no method probe in scope. |

### `GET /services/{service}/unreached-clusters`

Unreached clusters, largest first and then by root. The route takes `class_prefix` and `known_for_days`, and a page counts clusters. The response is `{"clusters", "total", "as_of", "from_snapshot"}`. See [Unreached clusters](unreached-clusters) for what a cluster is. The route is [read from a snapshot](#routes-read-from-a-snapshot) for most scopes when the request has no `known_for_days`, and answers `202` while the snapshot is computing. A request with `known_for_days` is computed live.

| Field | Type | Meaning |
|---|---|---|
| `root` | object | The cluster's root. |
| `members_total` | integer | The true count of methods in the cluster, whole classes included. |
| `never_loaded_classes` | integer | Members that are classes only a complete baseline knows. |
| `whole_classes` | array | Classes the cluster holds in full: `class_name`, `finding`, `methods_total`, and the [class naming fields](#class-naming-fields). `finding` is `never_loaded`, `never_initialized`, `never_instantiated` or `null`. |
| `members` | array | The other methods, as graph nodes. |
| `test_callers` | array | Calls from tests into the cluster's methods: `caller` (`class_name`, `method_name`, `method_descriptor`, `line`) and `callee` (a graph node). The root's own come first. |
| `test_callers_total` | integer | The true count of test callers. |
| `test_only_unconfirmed` | boolean | `true` on an `uncalled` root that a test calls while no complete baseline of production is in scope. |

`members` and `test_callers` each hold at most 200 entries. The totals are always true counts.

A graph node has `class_name`, `method_name`, `method_descriptor`, `line`, `hits_total`, `never_loaded`, `generated_by`, `unread_shape`, `counts_behind`, `without_evidence`, `recorded_hit` and the [method naming fields](#method-naming-fields). `never_loaded` is `true` for a method only a complete baseline knows, and its `line` is `0`. `counts_behind` is `true` when a run that knows the method is not settled and, on a request that names no `version` and no `active_within_days`, the service has recorded no hit of it. With `hits_total` `0` the method may have run, and the cluster rules treat it as neither hit nor never hit. `without_evidence` is `true` when every run that knows the method is settled and none is [evidence](findings#without-evidence) about its class. The cluster rules treat it as `counts_behind`, and it is `false` where `counts_behind` is `true`. `recorded_hit` is `true` when the service has recorded a hit of the method, on a request that names no `version` and no `active_within_days`. `hits_total` stays the in-scope count, and the method counts as hit. Both fields are `false` for a method only a baseline knows and on a `class_finding` root. A graph node is never generated or unread, so both marks read `none`.

The root is a graph node with these extra fields:

| Field | Type | Meaning |
|---|---|---|
| `root_kind` | string | `reached_from_hit`, `uncalled`, `called_only_by_tests`, `called_from_outside_scope`, `untaken_outcome` or `class_finding`. |
| `finding` | string or null | On a `class_finding` root, `never_loaded`, `never_initialized` or `never_instantiated`. Otherwise `null`. |
| `routes` | array | The endpoints the root method handles. `[]` on a `class_finding` root. |
| `site` | object or null | On an `untaken_outcome` root, the [site row](#site-rows) of the outcome, with `in_finding` set only on the root outcome. Otherwise `null`. |
| `reached_from` | array | Graph nodes that ran (hits in scope or, on a request that names no `version` and no `active_within_days`, a hit the service has recorded) and call a `reached_from_hit` or `class_finding` root. Such a node can show `hits_total` `0`. `[]` for every other kind. |
| `outside_caller` | object or null | `{"kind", "type_name"}` when a type outside the scope may call the method. See [outside callers](/docs/agent/call-graph#outside-callers). `null` on `class_finding` and `untaken_outcome` roots. |

On a `class_finding` root, `class_name` and the [class naming fields](#class-naming-fields) name the class, `method_name` and `method_descriptor` are `""`, and `line` and `hits_total` are `0`. On an `untaken_outcome` root, the method fields name the method that holds the outcome, and that method ran.

### `GET /services/{service}/call-edges`

The resolved call graph. It takes `class_prefix`, which matches the caller's class. The response is `{"edges", "total"}`. Rows come in order of caller, callee, `kind`, `virtual`, `captured_count` and `guard`, with a `null` guard first. See [call graph](/docs/agent/call-graph).

| Field | Type | Meaning |
|---|---|---|
| `caller`, `callee` | object | Graph nodes, as under [unreached clusters](#get-servicesserviceunreached-clusters). |
| `kind` | string | `call` or `creates`. |
| `virtual` | boolean | `true` for a virtual call, which Otherlode already widened to every override in scope. |
| `captured_count` | integer | For a `creates` edge from `invokedynamic`, how many leading parameters the edge captures. Otherwise `0`. |
| `guard` | integer or null | The branch index, in the caller's class, of the innermost outcome that must run before the call. |
| `declared_owner` | string | The callee's class as the caller's bytecode named it. It differs from `callee.class_name` for an inherited or overridden method. |

One pair of methods can have several rows, for example a call and a creation.

### `GET /services/{service}/dependencies`

Every dependency some in-scope run listed, merged across runs by `identity_key`. Rows come in status order (`unloaded`, `unreferenced`, `unreached`, `no-live-reference`, `failed-to-load`, `failed-to-initialize`, `counts-behind`, `without-evidence`, `stale`, `used`, `loaded`, `resources-only`) and then by `identity_key`. The route does not take `class_prefix`.

| Parameter | Value | Effect |
|---|---|---|
| `status` | `all`, `unused`, or one status name | `all` is the default. `unused` keeps `unloaded`, `unreferenced`, `unreached` and `no-live-reference`. `failed-to-load`, `failed-to-initialize`, `counts-behind`, `without-evidence`, `stale` and `resources-only` claim no removal, so `unused` leaves them out. Another value gets `400` that lists every accepted value. |

The response is `{"dependencies", "total", "watched_since", "listing_complete", "instances_awaiting_listing"}`. When `listing_complete` is `false`, every row shown is right, but the list can be missing dependencies. See [Inventory](inventory) for what each status means.

| Field | Type | Meaning |
|---|---|---|
| `identity_key` | string | The dependency's identity. |
| `identities` | array | Each `{"group_id", "artifact_id", "versions"}`. `versions` lists every version seen. A shaded jar carries several identities. |
| `status` | string | One of the twelve statuses above. `stale` means the dependency was listed from the startup classpath, no run in scope loaded a class from it, and the service has recorded a load, dated by `last_loaded_at`. A request with `version` or `active_within_days` never gets `stale`, and answers `unloaded` instead. `counts-behind` means the status the dependency would take (`stale`, `unloaded`, `unreached` or `no-live-reference`) rests on counts that a run not yet settled has not delivered, and it claims nothing. `resources-only` means every in-scope listing counted no class in the jar and no run loaded a class from it. `failed-to-initialize` means the dependency is loaded, has no live reference, and some run that judged it references it from a class that reads as [failed to initialise](findings#failed-to-initialise). `without-evidence` means the status it would take (`unreached` or `no-live-reference`) rests on zero counts that no settled run is evidence for. Both claim nothing. |
| `loaded_classes_total` | integer | The largest count of loaded classes any in-scope run reported. |
| `class_count` | integer or null | Classes in the jar, when a run reported it. |
| `discovery_sources` | array of strings | How the agent learned of it: `startup_classpath`, `load`, or `unspecified`. |
| `first_known_at`, `first_loaded_at`, `last_loaded_at`, `dates_capped` | | See [shared fields](#fields-every-response-uses). `first_loaded_at` and `last_loaded_at` are `null` for a dependency never loaded, and `last_loaded_at` is `null` when `dates_capped` is `true`. `last_loaded_at` is the arrival time of the latest batch that raised a loaded-class total, and can trail the true one by up to an hour. |
| `sites` | array | The places in your code that reference the dependency. Filled only for `unreached`, `no-live-reference`, `failed-to-load` and `failed-to-initialize`. Every other status, `counts-behind` and `without-evidence` included, has `[]`. At most 50 entries. |
| `sites_total` | integer | The true count of sites. |

A site is `{"class_name", "method_name", "method_descriptor", "never_loaded", "failed_to_load", "failed_to_initialize", "failed_since", "line"}` plus the [method naming fields](#method-naming-fields). `method_name` and `method_descriptor` are `null` on a class-level site, which then names the class in the naming fields. `never_loaded` is `true` for a site only a static baseline knows, in a class that reads as [never loaded](findings#never-loaded): no run in scope loaded it, and on a read with no `version` and no `active_within_days` the service has no record of it loading. `failed_to_load` is `true` when that class failed to load, and `failed_since` is then the class's `first_failed_at`, or `null` when no environment in scope has a row for it. `failed_to_initialize` is `true` when the site is in a class that reads as failed to initialise.

### `GET /services/{service}/absent-references`

Classes that your code references and that no class loader could find on some in-scope run that records references, such as code guarded by a check for an optional library. The route does not take `class_prefix`. The response is `{"absent_references", "total", "listing_complete", "instances_awaiting_listing"}`, ordered by class name. Each row has `class_name`, `sites` and `sites_total`, in the shape that `/dependencies` uses.

## Shared row fields

### Method naming fields

Every row that names a method carries these fields, so a client can show hidden code, such as a lambda body, in its source language. They come from the newest in-scope run that knows the method.

| Field | Type | Meaning |
|---|---|---|
| `created_in` | object or null | `{"class_name", "method_name"}` of the method that creates this lambda body or body class. `null` for any other method, or when no creator is in scope. |
| `lambda_body` | boolean | `true` for a lambda body. |
| `captured_count` | integer | How many leading parameters of a lambda body are captured values. |
| `source_file` | string | The source file, as stored. On an inlined branch copy it is the file of the class the code came from. |
| `class_source_file` | string | The source file of the row's own class. |
| `body_kind` | string | The kind of the method's class: `none`, `anonymous_class`, `object_expression`, `local_class` or `lambda_class`. |
| `source_name` | string | The class's name in source. |
| `kotlin_kind` | string | `none`, `kotlin_class`, `file_facade`, `synthetic_class`, `multifile_facade` or `multifile_part`. |
| `lambda_interface` | string or null | The interface a lambda body implements. |
| `body_interface` | string or null | The interface or superclass an anonymous class or object expression leads with. |
| `creation_ordinal` | integer or null | The body's number among those of one creator, when the creator alone does not tell them apart. |
| `parameter_names` | array of strings | The declared parameter names in order. `[]` when the class file holds none. |
| `generic_signature` | string | The method's generic signature as written. `""` when it has none. |
| `extension_receiver` | boolean | `true` when the first parameter is a Kotlin extension receiver. |

### Class naming fields

A class row carries `created_in`, `body_kind`, `source_name`, `source_file`, `kotlin_kind`, `body_interface` and `creation_ordinal`, with the meanings above. `created_in` is set only for a body class.

## Example

This script lists the never-hit methods of one service in production, a page at a time.

```bash
BASE=https://app.otherlode.dev/api/v1/services/checkout
curl -s -H "Authorization: Bearer $OTHERLODE_READ_KEY" \
  "$BASE/never-hit?environment=prod&kind=method&known_for_days=30&limit=100&offset=0"
```

The response has `rows`, `total`, `capped_hidden` and `watched_since`. To read the next page, repeat the call with `offset=100`, and stop when `offset` reaches `total`.
