---
title: Inventory
description: The service list and the seven Inventory pages of a service, with what each lists, its columns and filters, and how Otherlode reads class, handler and namespace names.
order: 110
---

The Inventory pages list what Otherlode holds for a service, in the [scope](scope) you picked. They make no claim about dead code. Each finding has its own page in the Findings group, described in [findings](findings), and the pages here are the data those findings read.

The service list is the first page of `https://app.otherlode.dev` after sign-in. A service opens on its Overview, and the panel on every service page lists the Inventory pages.

## The service list

The service list shows every service of your tenant, across all environments. It's not filtered by scope. A service past your tenant's [service cap](scope#your-plan-tracks-a-fixed-number-of-services) is not tracked, and it has no findings to open.

A service appears once a production run has reached Otherlode. A service that only [test runs](/docs/agent/test-runs) reached never appears. A service is known by its namespace and its name together, so two services with the same name in two namespaces are two rows with separate data. Namespace and name keep their case, so `Shop` and `shop` are two namespaces.

| Column | What it shows |
|---|---|
| **Service** | The service name. It opens the service's Overview in the environment you last picked for this service in this browser, if the service still has it, and otherwise in every environment. A service that isn't tracked doesn't open. |
| **Environments** | The service's watched environments. The environment `none` reads "not named". A count such as "2 not tracked" gives the environments past the service's [environment cap](scope#a-service-watches-at-most-10-environments), and its tooltip names them. |
| **Instances** | The number of distinct instances with a production run, in any environment. |
| **Last seen** | How long ago any production run of the service last reported. A service whose runs have all expired reads "never". |
| **Watched for** | How long since the service first reported, counted from its earliest environment. See [dates](dates) for how Otherlode sets that date. |

### Namespaces

When the services come from more than one namespace, the list groups them by namespace. Services with no namespace come last, under "not named".

For an admin, the service list says when ingest refused payloads in the last 24 hours because your tenant [requires redacted payloads](require-redaction), and links to the **Redaction** page. Viewers never see it.

The service switcher in the top bar lists the tracked services, grouped the same way when they span more than one namespace. Services that aren't tracked don't appear.

A service in a named namespace opens at `/namespaces/{namespace}/services/{service}`. A service with no namespace opens at `/services/{service}`. Every Inventory page is a path under one of those two prefixes.

### Services with no name

A service whose name starts with `unknown_service` shows a **Name not set** badge. Several services with no name in one namespace report under the same name and merge into one service. To name it, see [The service is listed under another name](troubleshooting#the-service-is-listed-under-another-name) and the agent's [configuration options](/docs/agent/configuration) for `serviceName` and `serviceNamespace`.

## The Inventory group

The panel's Inventory group has seven items, each with a count.

| Item | Count | Page |
|---|---|---|
| **Instances** | The instances the Instances page lists, including those whose runs all came through a collector older than their agent | [Instances](#instances) |
| **Classes** | Classes in the list | [Classes](#classes) |
| **Endpoints** | Endpoints in the list, with the status filter on **All endpoints** | [Endpoints](#endpoints) |
| **Dependencies** | Every dependency known in scope | [Dependencies](#dependencies) |
| **Absent references** | Absent references in scope | [Absent references](#absent-references) |
| **Unclassified** | Classes in the list | [Unclassified classes](#unclassified-classes) |
| **Removed** | Rows in the list | [Removed](#removed) |

Every panel link carries the page's scope. While a service's dependency listing is incomplete, the **Dependencies** and **Absent references** counts end in a tilde.

### The class prefix filter

Classes, Endpoints, Unclassified classes and Removed have a **Class prefix** box. It keeps the rows whose class name starts with the text, matching the JVM name such as `com.acme.shop.` and not the label Otherlode shows. On Endpoints the prefix is matched against the handler's class, so an endpoint with no known handler never matches a prefix. On Removed it matches the class of a class row or a method row, so a prefix hides every endpoint and dependency row.

## Instances

The Instances page lists each instance that has a run in scope, most recently seen first. An instance is one instance ID, and each process start under it is another run. The agent's [configuration options](/docs/agent/configuration) say how it sets the instance ID.

One row describes an instance's latest run, which is the in-scope run that started last. Other columns cover all of the instance's in-scope runs.

| Column | What it shows |
|---|---|
| **Instance** | The instance ID. The badge **Collector older than agent** appears when the latest run came through a collector older than its agent, which dropped fields it did not know. Otherlode keeps such a run out of every finding. Runs that start after the collector is upgraded count. See [An instance is kept out of every finding](troubleshooting#an-instance-is-kept-out-of-every-finding). |
| **Runs** | The number of in-scope runs. |
| **Version** | The latest run's service version, or a dash when it reported none. |
| **Environment** | The latest run's environment. |
| **First seen** | When Otherlode first saw the instance, whatever the scope. |
| **Last seen** | The latest report from any in-scope run. |
| **Baseline** | `complete` when some in-scope run holds a complete [static baseline](/docs/agent/classes#never-loaded). `incomplete` when some run has a scan and none is complete. `none` when no run has a scan. |
| **Dependencies** | `listed` when every in-scope run has sent its whole dependency listing. Otherwise `incomplete`. |
| **Ended cleanly** | `yes` when the latest run's agent sent its shutdown flush, `no` otherwise. A process that is still running reads `no`. |

An earlier run's complete baseline still counts after a later run starts, so **Baseline** can read `complete` while the later run has not scanned yet.

## Classes

The Classes page lists each class that has probes in scope, sorted by class name. A class that never loaded has no probes and is not here. The agent [leaves out](/docs/agent/classes#classes-the-agent-leaves-out) proxies and other generated classes, so they never appear.

| Column | What it shows |
|---|---|
| **Class** | The class label, as a link to the [class page](#the-class-page). See [how names read](#how-names-read). |
| **Methods** | The methods the report counts for the class. Inline methods, generated methods, methods of an unread shape and static initialisers are left out, so a class made only of those shows 0. |
| **Never ran** | The methods that never ran and that [Never hit](findings) lists. A method covered by the class's own finding is not counted here. |
| **Conditions** | The conditions the report counts for the class, one per site. |
| **With a path that never ran** | The conditions with at least one outcome that never ran. |
| **Routed** | `yes` when any method of the class is the handler of an endpoint in scope, `no` otherwise. |
| **Finding** | `never initialised` or `never instantiated`, `failed to initialise` for a class on the [Failed to initialise](findings#failed-to-initialise) list, or a dash when the class has none of them. |

For most scopes the list is read from the same [stored snapshot](how-it-works#the-report-and-finding-pages-are-read-from-stored-snapshots) as the report, so its rows add up to the report's counts when both come from it. **As of** says when the snapshot was computed. While the snapshot is being computed, the page says "Computing…" and lists no rows.

### The class page

A class label links to `/services/{service}/classes/{class}`, or the same path under a namespace prefix. The path holds the JVM class name.

A class that never loaded has no row in the list, and its page names its finding **never loaded**. The page's counts are the class's row from the list.

[Unreached clusters and the code path graph](unreached-clusters) describes the class's code path graph.

## Endpoints

The Endpoints page lists every endpoint the agent found, with its status and its calls in scope. The agent's [endpoints page](/docs/agent/endpoints) says what it counts and how it names an endpoint. Otherlode merges the endpoint across every in-scope instance and run. Two rows never share a verb, route template and template kind. [Outside routes](findings#outside-routes) are listed apart, and the page's total and paging count only the service's own routes. A route template the agent marks as a regular expression or a servlet pattern is a different endpoint from a path that reads the same. The page sorts rows by status, with never called first. The **Status** header reverses the order. Within a status, never called rows run from the earliest first known, stale rows from the oldest last call, and live rows from the newest last call. In both orders the statuses that claim nothing come last: **Module disabled**, then **Counts behind** and **Without evidence**, then **Not judged**. Rows with the same status and date, and the statuses that claim nothing, sort by verb, then route template, then template kind.

| Column | What it shows |
|---|---|
| **Status** | One of the seven statuses below. |
| **Endpoint** | The HTTP method, such as `GET`, and the route template in the agent's normal form, such as `/orders/{id}`. An endpoint that takes every method reads `ANY`. A template that is a regular expression shows as the framework wrote it, followed by the label **Regular expression**. A servlet extension mapping such as `*.do`, or the default mapping `/`, shows as written with the label **Servlet pattern**. Each is judged like any other endpoint. |
| **Handler** | The handler's class and method, as [names](#how-names-read) read. A dash means no instance could name the handler. |
| **Calls** | The calls summed over every in-scope run. |
| **Last called** | When the endpoint was last called, or "never". |
| **Instances** | The number of in-scope instances that reported the endpoint. |

Each endpoint has one status.

| Status | Meaning |
|---|---|
| **Module disabled** | The framework module switched itself off in every in-scope run that knows the endpoint, so its calls were not counted. |
| **Live** | The endpoint was called, and its last call is within **Stale after (days)**. |
| **Counts behind** | A run that knows the endpoint has counts that have not all arrived, and the endpoint is not live. |
| **Without evidence** | The endpoint would read **Never called**, but no run that reports it is [evidence](findings#without-evidence) about it. |
| **Never called** | Some run registered the endpoint, and it has no calls and no call on record, and some run that reports it is evidence about it. |
| **Stale** | The endpoint was called, and its last call is older than **Stale after (days)**. |
| **Not judged** | The data cannot say. An endpoint found only by dispatch whose count was lost reads this way, and so does a called endpoint with no last-called date or with a capped last date older than the cutoff. |

A star after a row's first known date means the date is capped to the runs in scope.

Framework, discovery source and handler come from the in-scope instance that reported the endpoint most recently.

When any in-scope run switched an endpoint module off, the page lists each module with its kind and the agent's reason. A module whose hook matched no method reads "A hook matched no method on the framework class it hooks", followed by the agent's detail. A module that hit a framework release it was not built for reads "The framework release differs from the one the module was built for" and the error, such as `java.lang.NoSuchMethodError: ...`. The kind and reason come from the newest in-scope run that disabled the module. A module the agent's configuration kept off reads "The agent's configuration kept the module off". That is your setting, not a failure. A Micronaut module on a runtime it cannot count requests on reads "The runtime has no dispatch point the module counts requests at" and declares no endpoint. Without a kind, the notice reads "The agent did not say why"; for a kind Otherlode does not name, it says a newer agent sent it.

When any in-scope run reported a framework marker, a notice titled "Routes not counted" lists each marker by Otherlode's label and says the endpoint list leaves those routes out. See [Routing whose routes are not counted](#routing-whose-routes-are-not-counted).

The page has three filters besides **Class prefix**.

| Filter | Values |
|---|---|
| **Status** | One status, or **All endpoints**. |
| **Stale after (days)** | The number of days after which a called endpoint reads **Stale** and not **Live**. It defaults to 30. |
| **Framework** | The framework name, matched exactly. |

**Never called** and **Stale** show findings. [Findings](findings) describes what each claims and leaves out, and the **Never called** item in the Findings group opens this page with that status.

### Routing whose routes are not counted

A framework the agent has no module for reports no endpoint, which reads the same as a service that serves none. The agent's [endpoints page](/docs/agent/endpoints#frameworks-with-no-module) describes the markers it reports for this. A marker is an observation: the agent saw one framework's routing set up. Otherlode decides whether an agent version counts that routing's routes. It lists a marker only when no module of the run's agent version counts them.

The notice words each marker as the claim the agent observed and no wider. The labels are:

| Label | What the agent saw |
|---|---|
| A grpc-java server started | A grpc-java server started, an in-process server included. |
| An Armeria server started | An Armeria server started. |
| Undertow's own RoutingHandler configured | Undertow's own `RoutingHandler` configured, whether or not the server started. |
| Javalin 5's own Jetty server started | Javalin 5's own Jetty server started. |
| A Spring WebFlux router turned into a handler without a DispatcherHandler | A Spring WebFlux router turned into a handler by `RouterFunctions.toHttpHandler` or `toWebHandler`, not through a `DispatcherHandler`, whether or not it was served. |
| A Play server started | A Play server started. |
| A Helidon 4 web server serving its HttpRouting started | A Helidon 4 `WebServer` started, which serves Helidon's own `HttpRouting`. Helidon MP starts the same server for its JAX-RS resources. |
| Struts 2's dispatcher started | Struts 2's dispatcher started. |
| Grails' dispatcher servlet configured to serve | Grails created the dispatcher servlet that serves its URL-mapped controllers, in a servlet web server context or a WAR deployment, whether or not requests are accepted. |

A marker id Otherlode does not name reads "A newer agent reported marker" and the id. The marker is kept per run and goes when the run does. The report's [`framework_markers`](api#get-servicesservicereport) field serves the same list.

For a service with no endpoint or entry method to draw, the graph area lists the same labels with its fact. See [the code path graph](unreached-clusters#the-code-path-graph).

## Dependencies

The Dependencies page lists each library that an in-scope run found, merged by identity, with its status. The agent's [dependencies page](/docs/agent/dependencies) says what counts as a dependency and how the agent identifies one. The page sorts rows by status in the order of the filter below, then by identity.

| Column | What it shows |
|---|---|
| **Dependency** | Its `group:artifact` and versions. A shaded jar shows several lines, since it's one dependency with several identities. |
| **Status** | The status, with its meaning as a tooltip. |
| **Loaded classes** | `12 of 340` when the jar's class count is known, and `12` when it is not. The loaded figure is the largest any in-scope run reported. |
| **Discovery** | `startup classpath`, `class load`, or both. |
| **Known since** | When Otherlode first learned of the dependency. A star means the date is capped to the runs in scope. |
| **First loaded** | When Otherlode first saw a class load from it, or "never". |
| **Last loaded** | When a batch last raised a loaded-class total for it, or "never". Otherlode writes it at most once an hour. |
| **Sites** | The number of places in your code that reference the dependency, for the statuses **Unreached**, **No live reference**, **Failed to load** and **Failed to initialise**. A dash for any other status. |

**Unused** is the four statuses **Unloaded**, **Unreferenced**, **Unreached** and **No live reference** together. **Used** means some run that judged the dependency holds a live reference, from a method with hits or a loaded class. **Loaded** means no run that lists the dependency records references, so Otherlode says nothing more. **Failed to initialise** means a class that failed to initialise holds the only references, as [Findings](findings#dependencies-failed-to-initialise) describes. **Counts behind** means the status the dependency would take rests on counts that a run not yet settled has not delivered. **Without evidence** means it rests on zero counts that no settled run is [evidence](findings#without-evidence) for. Both claim nothing. **Stale** means the jar was listed from the startup classpath, no run in scope loaded a class from it, and the service has recorded a load before. It claims nothing about removal. **Resources only** means every in-scope listing counted no class in the jar, and no run loaded a class from it, as with a native library or web assets. It claims nothing. [Findings](findings) describes the other statuses, and the **Unused dependencies**, **Dependencies failed to load** and **Dependencies failed to initialise** items in the Findings group open this page with that status.

- **Site** names the class, and the method when the reference sits in one. A reference that sits in no single method reads "(class level)". A loaded class links to its class page.
- **Class** reads "loaded", "never loaded", "counts behind", "failed to initialise", or "failed to load since 1 Jun 2026". "Counts behind" marks a class that no run loaded and that a run not yet settled could have loaded. A class that never loaded, or reads counts behind, has no probes, so its name is not a link. A class that failed to load links to the failed-to-load list, filtered to that class, and a class that failed to initialise links to the failed-to-initialise list, filtered the same way.

## Absent references

The Absent references page lists classes your code references that no class loader could find. Such a reference is often guarded by a check for an optional library. The class belongs to no dependency, so the Dependencies page leaves it out. The agent's [dependencies page](/docs/agent/dependencies#absent-references) describes how the agent finds one.

## Unclassified classes

The Unclassified page, titled **Unclassified classes**, lists classes a static scan found and Otherlode cannot call dead. No in-scope run loaded these classes, nor, on a read with no version or "seen within" filter, any production run of the service in the environments in scope. A class that a live run not yet settled could have loaded is left out until that run delivers its counts or stops. Otherlode never counts them in a dead-code claim. The page needs a complete static baseline. See [Classes](/docs/agent/classes#never-loaded) in the agent's docs for the scan.

| Column | What it shows |
|---|---|
| **Bucket** | `unreadable` when the scan found the class file and could not read or resolve it. `unprobed` when the class has nothing to probe, such as an interface with only abstract methods. |
| **Reason** | The agent's own text for why the scan put the class in that bucket. |

## Removed

The Removed page lists code that every live run of the environment proves absent: classes, methods, endpoints and dependencies. A deploy that deletes code leaves it here, and the findings leave it out. See [Removed code](findings#removed-code) for what a live run is and what proves a thing absent.

The page lists only what a full read finds. For most scopes it is read from the same snapshot as the report and the findings, so it agrees with them. A read that names a version or a seen-within window answers for the runs it selects, which held the code, so the page is empty for it. The Overview's removed counts and the panel's count follow the same rule. See [Scope and environments](scope#a-version-or-seen-within-read-keeps-removed-code).

| Column | What it shows |
|---|---|
| **Kind** | `Class`, `Method`, `Constructor` for a constructor, `Endpoint` or `Dependency`. |
| **Name** | A class reads as in [How names read](#how-names-read). A method reads as its class does, with its signature, as the Never hit page shows it, and a lambda body reads as in [Handlers](#handlers), such as "`Runnable` lambda in `main` at line 59". An endpoint reads as its verb and route template, with `ANY` for a route that takes every verb, and a regular expression template is followed by **Regular expression** in brackets, a servlet pattern template by **Servlet pattern**. A dependency reads one line per identity, as `group:artifact` with its versions, and a jar with no group shows the artifact alone. |
| **Stopped** | How long ago the last run that held the thing was last seen. |

The page sorts rows by kind, then by the identifiers Otherlode stores, byte by byte. So endpoints that take every verb, stored as `*`, come first, and dependencies follow their identity key, not the names shown. See [the removed route](api#get-servicesserviceremoved). A method of a removed class has no row of its own, because its class stands for it, and a removed class counts once, whatever its methods. The panel's and the Overview's removed counts come from the report, so they follow its snapshot. See [the report](api#get-servicesservicereport).

A row leaves the list when the runs that held it expire, since Otherlode keeps no record of a removal. See [How long data is kept](data-kept). Code that comes back in a later run leaves the list at once. It keeps the dates it had, so restored code that was never hit reads as never hit since the service first knew it.

## How names read

Otherlode shows names the way your source wrote them, from facts it sends. It never decodes a compiler name itself, so a name it has no facts for reads as it is.

### Classes

| Class | How it reads |
|---|---|
| An ordinary class | Its simple name, with its package. The tooltip holds the full name. |
| A Kotlin file facade, such as `CheckoutServerKt` | The source file, such as `CheckoutServer.kt`. The tooltip holds the class name. |
| One file's part of a multi-file facade | The source file, the same way. |
| A multi-file facade | Its simple name, then "multi-file facade". |
| An anonymous class or an object expression | "`HttpHandler` anonymous class in `main`", or "object expression in `main`". It leads with its single interface, or with its superclass when it has no interface. A body class whose creator Otherlode cannot find reads as its simple name. |
| A local class | "`Local`, a local class in `main`". |

A body class that shares its creator with others is numbered, as "second `HttpHandler` anonymous class in `main`". The numbers run "first" to "tenth". After that, the number follows the noun, as in "anonymous class 11 in `main`".

### Handlers

An endpoint's handler reads as its class and its method, such as `OrderController.checkout`. Three forms differ.

- A handler in a file facade is a top-level function. It reads with no class, then its file, such as `handleCheckout in CheckoutServer.kt`, with its package.
- A handler that is a lambda reads as its class, then the lambda by its interface, its creating method and its own line: "`HttpHandler` lambda in `main` at line 59". The lambda's declared parameters follow, such as `(exchange: HttpExchange)`. Kotlin function types, such as `Function1`, say nothing, so a lambda with only one reads "lambda in `main` at line 59".
- Two lambdas that share a creator and a line are numbered, such as "first `Runnable` lambda in `main` at line 12" and "second `Runnable` lambda in `main` at line 12".
- A lambda whose creator Otherlode cannot find reads by its compiler name.

### Signatures

A lambda handler's parameters read in the language of its source file. A class whose source file ends in `.kt` reads in Kotlin, and any other class reads in Java.

| Source | Example |
|---|---|
| Kotlin | `(total: Double, currency: String, decimals: Int): String` |
| Java | `(double total, String currency, int decimals): String` |

Parameter names come from the class file. A class built without debug information shows types only. The Kotlin form maps JVM types to Kotlin's, such as `int` to `Int` and `java.lang.Object` to `Any`, and leaves out a `Unit` return. It shows no `?`, since the class file records nullability for public and protected members only. A lambda leaves out the values it captures, which its source never declared. The findings pages show full method signatures, including `suspend`, extension receivers and type parameters.

### Verbs and environments

The agent sends `*` for an endpoint that takes every method, and the read API returns `*`. The web app reads it `ANY`, because `*` also marks a wildcard inside a route template. Wherever an environment shows, the environment `none` reads "not named". A namespace that was never set reads "not named" in the service list's headers and in the service switcher.
