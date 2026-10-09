---
title: Inventory
description: The service list and the six Inventory pages of a service, with what each lists, its columns and filters, and how the UI reads class, handler and namespace names.
order: 110
---

The Inventory pages list what the server holds for a service, in the [scope](scope) you picked. They make no claim about dead code. Each finding has its own page in the Findings group, described in [findings](findings), and the pages here are the data those findings read.

The service list is the first page of `https://app.otherlode.dev` after sign-in. A service opens on its Overview, and the sidebar on every service page lists the Inventory pages.

## The service list

The service list shows every service of your tenant, whatever its environment. It is not filtered by scope.

A service appears once a production run has reached the server. A service that only [test runs](/docs/agent/test-runs) reached never appears. A service is known by its namespace and its name together, so two services with the same name in two namespaces are two rows with separate data. Namespace and name keep their case, so `Shop` and `shop` are two namespaces.

| Column | What it shows |
|---|---|
| **Service** | The service name, as a link to its Overview. The link opens the environment you last picked for this service in this browser, if the service still has it. Otherwise it opens every environment. |
| **Environments** | The environments a production run reached, in name order. The environment `none` reads "not named". A service with no environment shows a dash. |
| **Instances** | The number of distinct instances with a production run, in any environment. |
| **Last seen** | How long ago any production run of the service last reported, such as "3 days ago". The tooltip holds the exact UTC time. A service with no runs left reads "never". |
| **Watched for** | How long since the service first reported, counted from its earliest environment, such as "12 days". See [dates](dates) for how the server sets that date. |

### Namespaces

When the services come from more than one namespace, the list groups them. Each group has a header row with the namespace and "1 service" or "N services". Named namespaces come first, in alphabetical order. Services with no namespace come last, under the header "not named". When all services share one namespace, the list has no headers. The headers do not appear or disappear while you type in the filter.

The **Filter** box above the table matches a namespace or a service name. The match is a substring, ignores case and ignores spaces at either end. A filter that matches nothing shows "No service matches the filter." An empty tenant shows "No service has reported yet."

The service switcher in the top bar lists the same services, grouped the same way. When more than one namespace exists, it also shows the current service's namespace before its name.

A service in a named namespace opens at `/namespaces/{namespace}/services/{service}`. A service with no namespace opens at `/services/{service}`. Every Inventory page is a path under one of those two prefixes.

### Services with no name

A service whose name starts with `unknown_service` shows a **name not set** badge. The agent reports that name when it was given no service name. Several services with no name in one namespace report under the same name and merge into one service. See [configuration options](/docs/agent/configuration) for the agent's `serviceName` and `serviceNamespace`.

## The Inventory group

The sidebar's Inventory group has six items, each with a count beside it.

| Item | Count | Page |
|---|---|---|
| **Instances** | The instances the Instances page lists, including those whose runs all came through a collector older than their agent | [Instances](#instances) |
| **Classes** | Classes in the list | [Classes](#classes) |
| **Endpoints** | Endpoints in the list, with the status filter on **All endpoints** | [Endpoints](#endpoints) |
| **Dependencies** | Every dependency known in scope | [Dependencies](#dependencies) |
| **Absent references** | Absent references in scope | [Absent references](#absent-references) |
| **Unclassified** | Classes in the list | [Unclassified classes](#unclassified-classes) |

Every sidebar link carries the page's scope. While a service's dependency listing is incomplete, the **Dependencies** and **Absent references** counts end in a tilde, and their tooltip says "The dependency listing is incomplete, so this count may change."

### Lists, paging and the class prefix filter

Classes, Endpoints, Dependencies, Absent references and Unclassified classes show 100 rows a page. A footer below the table reads `1-100 of 250` and has **Previous** and **Next** buttons. Instances has no paging, since it lists every instance at once.

Classes, Endpoints and Unclassified classes have a **Class prefix** box. It keeps the rows whose class name starts with the text, matching the JVM name such as `com.acme.shop.` and not the label the UI shows. The box applies a moment after you stop typing. On Endpoints the prefix is matched against the handler's class, so an endpoint with no known handler never matches a prefix.

## Instances

The Instances page lists each instance that has a run in scope, most recently seen first. An instance is one instance ID, and each process start under it is another run. The agent's [configuration options](/docs/agent/configuration) say how it sets the instance ID.

One row describes an instance's latest run, which is the in-scope run that started last. Other columns cover all of the instance's in-scope runs.

| Column | What it shows |
|---|---|
| **Instance** | The instance ID. The badge **Collector older than agent** appears when the latest run came through a collector older than its agent, which dropped fields it did not know. The server keeps such a run out of every finding until the collector matches the agent's version. |
| **Latest run** | The run ID of the latest run. |
| **Runs** | The number of in-scope runs. |
| **Version** | The latest run's service version, or a dash when it reported none. |
| **Environment** | The latest run's environment. |
| **First seen** | When the server first saw the instance, whatever the scope. |
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
| **Methods** | The methods the Overview counts for the class. Inline methods, generated methods, methods of an unread shape and static initialisers are left out, so a class made only of those shows 0. |
| **Never ran** | The methods that never ran and that [Never hit](findings) lists. A method covered by the class's own finding is not counted here. |
| **Conditions** | The conditions the Overview counts for the class, one per site. |
| **With a path that never ran** | The conditions with at least one outcome that never ran. |
| **Routed** | `yes` when any method of the class is the handler of an endpoint in scope, `no` otherwise. |
| **Finding** | `never initialised` or `never instantiated`, or a dash when the class has neither. |

The **Routed** filter has three options, **All classes**, **Routed only** and **Unrouted only**. Summed over every class, the rows equal the Overview's counts, since both use the same rules. The filters change which classes are listed and never a class's counts or finding.

### The class page

A class label links to `/services/{service}/classes/{class}`, or the same path under a namespace prefix. The path holds the JVM class name. The **Classes** sidebar item stays selected on this page.

The heading is the class label, with the full class name as a tooltip. A badge beside it names the class's finding. Under the heading, a muted line shows the package. A class that reads as a file adds its class name after the package, because the heading shows the file. A count line follows, such as "3 methods, 0 never ran, 3 in its class finding · 2 conditions, 1 with a path that never ran". The numbers are the class's row from the list.

Below the count line is the class's code path graph. [Unreached clusters and the code path graph](unreached-clusters) describes it. A class with no probes in scope shows "No probes in scope for this class."

## Endpoints

The Endpoints page lists every endpoint the agent found, with its calls in scope. The agent's [endpoints page](/docs/agent/endpoints) says what it counts and how it names an endpoint. The server merges the endpoint across every in-scope instance and run. Two rows never share a verb and route template. The page sorts rows by verb, then route template.

Under the title, a line reads "Watched for 12 days, since 22 Sep 2026" for the scoped environment, or for every environment when none is scoped. See [dates](dates).

| Column | What it shows |
|---|---|
| **Verb** | The HTTP method, such as `GET`. An endpoint that takes every method reads `ANY`. |
| **Route template** | The template in the agent's normal form, such as `/orders/{id}`. |
| **Framework** | The endpoint module that found it, such as `spring-webmvc`. The badge **module disabled** appears when every in-scope run that reported the endpoint had that module switch itself off. Its tooltip says "This module switched itself off, so its endpoints stopped being counted." The badge **counts behind** appears on an endpoint with no calls when a run that reported it is not settled. Its tooltip says "A run of this endpoint has counts that have not all arrived, so it is never named never called or stale." |
| **Discovery source** | `registration` when a framework registered the endpoint. `dispatch` when the agent found the endpoint only because a request matched it. |
| **Handler** | The handler's class and method, as [names](#how-names-read) read. A dash means no instance could name the handler. |
| **Instances known** | The number of in-scope instances that reported the endpoint. |
| **First known** | When the server first learned of the endpoint. A star after the date means the date is capped to the instances in scope. |
| **First called** | When the server first saw a call, or "never". |
| **Calls total** | The calls summed over every in-scope run. |
| **Last called** | When the server last saw a call, or "never". |

Framework, discovery source and handler come from the in-scope instance that reported the endpoint most recently.

When any in-scope run switched an endpoint module off, a notice above the table lists each module with the kind of failure and the agent's reason. A module whose hook matched no method reads, for example, "spring-webmvc: A hook matched no method on the framework class it hooks. hook HandleMatchAdvice (name(equals(handleMatch)) and hasParameters(...)) matches no method ByteBuddy can weave on org.springframework.web.servlet.mvc.method.RequestMappingInfoHandlerMapping". A module that hit a framework release it was not built for reads "The framework release differs from the one the module was built for" and the error, such as `java.lang.NoSuchMethodError: ...`. The kind and reason come from the newest in-scope run that disabled the module. Without a kind, the notice reads "The agent did not say why"; for a kind this server does not name, it says a newer agent sent it.

The page has three filters besides **Class prefix**.

| Filter | Values |
|---|---|
| **Status** | **All endpoints**, **Never called** and **Stale**. |
| **Stale after (days)** | Appears only with **Stale**. |
| **Framework** | The framework name, matched exactly. |

**Never called** and **Stale** show findings. [Findings](findings) describes what each claims and leaves out, and the **Never called** item in the Findings group opens this page with that status. The **Endpoints** item in the Inventory group is not selected while that status is on.

## Dependencies

The Dependencies page lists each library that an in-scope run found, merged by identity, with its status. The agent's [dependencies page](/docs/agent/dependencies) says what counts as a dependency and how the agent identifies one. The page sorts rows by status in the order of the filter below, then by identity.

Under the title, the same "Watched for" line as on Endpoints appears. Notes follow it when they apply. If the listing is not complete, a note reads "The dependency listing has not fully arrived from 2 instances, so this list may be missing entries." If no in-scope run records references, a note reads "No in-scope run records references, so a loaded dependency reads as loaded and only unloaded is judged." If some judging run has no complete baseline, a note says unreferenced and unreached are not told apart. When absent references exist, a link such as "3 absent references" opens that page.

| Column | What it shows |
|---|---|
| **Dependency** | One line per identity, as `group:artifact` with its versions in muted text. A jar with no group shows the artifact alone. A shaded jar shows several lines, since it is one dependency with several identities. |
| **Status** | The status, with its meaning as a tooltip. |
| **Loaded classes** | `12 of 340` when the jar's class count is known, and `12` when it is not. The loaded figure is the largest any in-scope run reported. |
| **Discovery** | `startup classpath`, `class load`, or both. |
| **Known since** | When the server first learned of the dependency. A star means the date is capped to the instances in scope. |
| **First loaded** | When the server first saw a class load from it, or "never". |
| **Last loaded** | When a batch last raised a loaded-class total for it, or "never". The server writes it at most once an hour. |
| **Sites** | The number of places in your code that reference the dependency, for the statuses **Unreached**, **No live reference** and **Failed to load**. A dash for any other status. |

The **Status** filter lists each option with its count. The options are **All dependencies**, **Unused**, **Unloaded**, **Unreferenced**, **Unreached**, **No live reference**, **Failed to load**, **Counts behind**, **Stale**, **Used**, **Loaded** and **Resources only**. **Unused** is the four statuses **Unloaded**, **Unreferenced**, **Unreached** and **No live reference** together. **Used** means some run that judged the dependency holds a live reference, from a method with hits or a loaded class. **Loaded** means no run that lists the dependency records references, so the server says nothing more. **Counts behind** means the status the dependency would take rests on counts that a run not yet settled has not delivered. It claims nothing. **Stale** means the jar was listed from the startup classpath, no run in scope loaded a class from it, and the service has recorded a load before. It claims nothing about removal. **Resources only** means every in-scope listing counted no class in the jar, and no run loaded a class from it, as with a native library or web assets. It claims nothing. [Findings](findings) describes the other statuses, and the **Unused dependencies** and **Dependencies failed to load** items in the Findings group open this page with that status. The **Dependencies** item in the Inventory group is not selected while either status is on.

A row with sites expands when you select it. The expanded table has two columns, **Site** and **Class**.

- **Site** names the class, and the method when the reference sits in one. A reference that sits in no single method reads "(class level)". A loaded class links to its class page.
- **Class** reads "loaded", "never loaded", or "failed to load since 1 Jun 2026". A class that never loaded has no probes, so its name is not a link. A class that failed to load links to the failed-to-load list, filtered to that class.

A table shows at most 50 sites for one dependency, and a line reads "Showing 50 of 120 sites." when more exist.

## Absent references

The Absent references page lists classes your code references that no class loader could find. Such a reference is often guarded by a check for an optional library. The class belongs to no dependency, so the Dependencies page leaves it out. The agent's [dependencies page](/docs/agent/dependencies#absent-references) describes how the agent finds one.

The table has two columns, **Class** and **Sites**. The page sorts rows by class name. Selecting a row expands the same site table as on Dependencies, with the same 50-site limit. The page shows the same listing note as Dependencies when the listing is incomplete.

## Unclassified classes

The Unclassified page, titled **Unclassified classes**, lists classes a static scan found and the server cannot call dead. No in-scope run loaded these classes, nor, on a read with no version or "seen within" filter, any production run of the service in the environments in scope. The server never counts them in a dead-code claim. The page needs a complete static baseline. See [Classes](/docs/agent/classes#never-loaded) in the agent's docs for the scan.

| Column | What it shows |
|---|---|
| **Class** | The class name, with its package below. |
| **Bucket** | `unreadable` when the scan found the class file and could not read or resolve it. `unprobed` when the class has nothing to probe, such as an interface with only abstract methods. |
| **Reason** | The agent's own text for why the scan put the class in that bucket. |

The page sorts rows by class name, then bucket, and has the **Class prefix** filter.

## How names read

The UI shows names the way your source wrote them, from facts the server sends. It never decodes a compiler name itself, so a name the server has no facts for reads as it is.

### Classes

| Class | How it reads |
|---|---|
| An ordinary class | Its simple name, with the package in muted text below. The tooltip holds the full name. |
| A Kotlin file facade, such as `CheckoutServerKt` | The source file, such as `CheckoutServer.kt`. The tooltip holds the class name. |
| One file's part of a multi-file facade | The source file, the same way. |
| A multi-file facade | Its simple name, then a muted "multi-file facade". |
| An anonymous class or an object expression | "`HttpHandler` anonymous class in `main`", or "object expression in `main`". It leads with its single interface, or with its superclass when it has no interface. A body class whose creator the server cannot find reads as its simple name. |
| A local class | "`Local`, a local class in `main`". |

A body class that shares its creator with others is numbered, as "second `HttpHandler` anonymous class in `main`". The numbers run "first" to "tenth". After that, the number follows the noun, as in "anonymous class 11 in `main`".

### Handlers

An endpoint's handler reads as its class and its method, such as `OrderController.checkout`. Three forms differ.

- A handler in a file facade is a top-level function. It reads with no class, then its file in muted text, such as `handleCheckout in CheckoutServer.kt`. The package shows below.
- A handler that is a lambda reads as its class, then the lambda by its interface, its creating method and its own line: "`HttpHandler` lambda in `main` at line 59". The lambda's declared parameters follow in muted text, such as `(exchange: HttpExchange)`. Kotlin function types, such as `Function1`, say nothing, so a lambda with only one reads "lambda in `main` at line 59".
- Two lambdas that share a creator and a line are numbered, such as "first `Runnable` lambda in `main` at line 12" and "second `Runnable` lambda in `main` at line 12".
- A lambda whose creator the server cannot find reads by its compiler name.

### Signatures

A lambda handler's parameters read in the language of its source file. A class whose source file ends in `.kt` reads in Kotlin, and any other class reads in Java.

| Source | Example |
|---|---|
| Kotlin | `(total: Double, currency: String, decimals: Int): String` |
| Java | `(double total, String currency, int decimals): String` |

Parameter names come from the class file. A class built without debug information shows types only. The Kotlin form maps JVM types to Kotlin's, such as `int` to `Int` and `java.lang.Object` to `Any`, and leaves out a `Unit` return. It shows no `?`, since the class file records nullability for public and protected members only. A lambda leaves out the values it captures, which its source never declared. The findings pages show full method signatures, including `suspend`, extension receivers and type parameters.

### Verbs and environments

The agent sends `*` for an endpoint that takes every method, and the read API returns `*`. The UI reads it `ANY`, because `*` also marks a wildcard inside a route template. Wherever an environment shows, the environment `none` reads "not named". A namespace that was never set reads "not named" in the service list's headers and in the service switcher.
