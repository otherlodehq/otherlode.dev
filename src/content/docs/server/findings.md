---
title: Findings
description: What each finding in a service's panel claims, what it needs before it can claim anything, what it leaves out, and what its page filters and shows.
order: 90
---

A finding is a claim that some code, route, parameter or dependency looks unused. This page describes each finding: the claim, the runs it reads, what it needs, what it never counts, its filters and its columns.

For why Otherlode judges this way, read [How findings are judged](how-it-works). For the data the agent observes, see [Classes](/docs/agent/classes), [Methods and branches](/docs/agent/methods-and-branches), [Endpoints](/docs/agent/endpoints) and [Dependencies](/docs/agent/dependencies).

## What every finding shares

Every finding follows the same six rules.

- **A finding is a lead, not a verdict.** A zero count means no run you sent has seen the code run. It does not prove nobody needs the code. A service that has reported for less than 30 days shows its watched time in amber in the top bar: code that runs weekly or monthly reads as never hit until it runs. Check a finding against how long the service has been watched. See [Dates](dates).
- **A finding covers judgeable code only.** Otherlode stores code it cannot judge, and shows it, but never counts it in a finding. Inline methods, generated methods, routine outcomes and unread shapes are not judgeable. An endpoint is judgeable unless its framework module switched itself off. A class is judgeable when at least one of its declared methods is not inline, not generated and not an unread shape.
- **A finding reads production runs only.** It reads the runs that pass the page's [scope](scope). It leaves out test runs, which exist to name the tests that call code (see [Unreached clusters](unreached-clusters)). It also leaves out every run sent through a collector older than its agent, since such a collector drops fields Otherlode judges by. The **Instances** list marks that run with the badge **Collector older than agent**, and the top bar's evidence list shows the **Stripped runs** fact. Upgrade the collector to the agent's version so new runs count.
- **A zero-count claim needs every run that knows the code to be settled.** A run is settled when a delta batch from it has arrived and its newest payload says no counts are pending. A run that sent only a manifest is not settled, and neither is one whose counts a collector or proxy refused. When a run in scope that knows a method, a condition path, a class, an endpoint, an optional parameter or a dependency is not settled, the finding makes no zero-count claim about it, since the hits that run has not delivered could be the ones that ran. Code with hits is hit, whichever run counted them, and a run that does not know the code holds nothing back. The claim returns when the run is settled. The **Instances** page and the top bar's evidence list (the **Counts behind** fact) name the runs that are not settled. [Scope](scope#runs-that-are-not-settled) covers it.
- **A zero-count claim needs a run that is evidence.** A run is evidence about a class when it is watched, has no verification failure it could not place, did not fail the class and did not leave the class's static initialiser running. When no run that knows the code is evidence, the finding makes no claim. A class that a run skipped supports no zero-count claim in any run, and a read that names no version and no seen-within window remembers the skip after the run expires. [Without evidence](#without-evidence) covers it.
- **A full read leaves out removed code.** Code, an endpoint or a dependency that every live run of the environment proves absent is on the [Removed](inventory#removed) list and in no finding. See [Removed code](#removed-code).

Code that is stored but not judged still shows where it is useful. The overview counts the methods and condition paths in unread shapes, names the agent versions that sent them, and gives a count for each family of compiler output the agent has not read, such as "Scala case-class plumbing" or "string switch lowering". Routine outcomes are listed on request, as [Never hit](#never-hit) describes.

### Without evidence

A zero count is a claim only when a run that could have seen the code run is evidence for it. Otherlode withholds the claim, and counts the code apart as **without evidence**, in these cases:

- The run's agent could not see the verifier's rejections, so the run shows as unwatched. The verifier may have rejected any class of that run with no hits.
- The run reported a verification failure it could not place in a class. Any class of that run with no hits may be that class.
- The run failed the class, or the class failed to initialise in scope.
- The class's static initialiser is still running in the run: its entry probe counted, and neither its returned probe nor its threw probe did.
- A run in scope skipped the class, or, on a read that names no version and no seen-within window, the environment has ever had a run skip it. The agent reports a skipped class by name and sends no hits for it, and the hits it did not send could be the ones that ran. Every other run's zero count for that class is withheld too, even when that run is evidence. The skip is kept for each environment, so on a read that names no version and no seen-within window it lasts after the run that skipped the class expires. A read that names a version or a seen-within window weighs only the skips of the runs it selects. Deleting the environment or the service clears the record. See [Skipped classes](/docs/agent/classes#skipped-classes).

A claim needs at least one evidence run among the runs that know the code, so one unwatched instance does not silence the others. Hits still stand, and a run that does not know the code is not asked. A run that is not settled holds a claim back as **counts behind**, and that wins over **without evidence**, since its counts may still arrive.

The rule covers every zero-count claim, which means never-hit methods and condition paths, class findings, never-called endpoints, always-supplied optional parameters and dependencies. A skipped class is the exception for endpoints: the agent counts an endpoint's calls apart from its handler class's probes, so a skipped handler class loses no calls and a never-called endpoint stays a claim. A skipped class also withholds the stale hits and the never-supplied parameters of its methods, which no other case does. The report counts the methods, condition paths, endpoints and dependencies it withholds in their `without_evidence` figures. A method, a condition path or an endpoint with no hits reads as possibly run, not as never hit. An endpoint reads **Without evidence** and a dependency reads **Without evidence** where the status they would take rests on such a zero count. The overview states them, such as "4 methods, conditions and endpoints without evidence", and counts the instances behind them, such as "1 instance with the verifier unwatched", "1 instance with an unplaced verification failure" or "1 instance skipped a class". It also counts the skipped classes with code in scope, such as "2 skipped classes". That line counts every such class that has code in scope, including one whose skipping run has expired, and the instance line counts only instances whose skipping run is still in scope. [Troubleshooting](troubleshooting#a-method-or-endpoint-reads-without-evidence) says what to look at.

### Counts in the panel

The counts beside **Never hit**, **Never called**, **Never supplied**, **Never loaded**, **Failed to load**, **Failed to initialise**, **Never initialised**, **Never instantiated**, **Unreached clusters**, **Unused dependencies**, **Dependencies failed to load**, **Dependencies failed to initialise**, **Instances**, **Dependencies**, **Absent references** and **Removed** come from the report. The count beside **Removed** is the sum of the report's four removed counts. For most scopes the report is read from a snapshot, which can trail the data by up to about 20 minutes, or about 6 hours on the free plan. **Never hit**, **Never initialised**, **Never instantiated**, **Unreached clusters** and **Removed** are read from the same snapshot, so their counts match their pages. The Removed list is part of that snapshot, so it agrees with those findings. The other pages are worked out when you open them, so one of their counts can differ from the total on its page. While the report is being prepared, those counts are left out. The counts beside **Stale** and **Classes** are read with each page's scope, and days for **Stale**, the way the page is: from the snapshot when the scope has one, and worked out when you read when it has none. The counts beside **Endpoints** and **Unclassified** are read with each page's scope and are never from a snapshot. See [the report's snapshot](how-it-works#the-report-and-finding-pages-are-read-from-stored-snapshots).

**Failed to load**, **Failed to initialise**, **Dependencies failed to load** and **Dependencies failed to initialise** appear only while their count is above zero. The dependency counts show a trailing `~` while the dependency listing is incomplete, which means the count may change. See [Unused dependencies](#unused-dependencies).

### Removed code

A deploy that deletes code leaves the old runs behind until they expire, 30 days by default. A finding taken over those runs would list the deleted code as unused. So Otherlode keeps removed code out of every finding, the code path graph, the clusters and every total, on a full read. A full read names no version and no seen-within window, and it may name an environment. The code is on the [Removed](inventory#removed) list instead, with the date the last run that held it stopped.

A **live run** is a run that has not ended cleanly and has not been silent for more than three of its flush intervals. The flush interval is the `flush_interval_seconds` the agent sends. A run that sent none stays live until it ends cleanly or expires. When no run of an environment is live, the runs that were live when the last one stopped judge the environment, so a service that is switched off keeps its newest picture.

A live run proves a thing absent in one of these ways. Absence from a probe manifest proves nothing, since a class may not have loaded yet.

| Thing | Removed when |
|---|---|
| A class | Every live run's complete [class listing](/docs/agent/classes#the-class-listing) does not name it, the run's include rules cover it, an earlier listing in the environment, from a run that is not stripped, named it, and a run that is not stripped loaded it or a complete baseline declared it. |
| A method, with its optional parameters, overloads and class findings | Its class is removed, or the run's record of the loaded class lacks the method. |
| A branch outcome | Its method is removed. An outcome with a branch key is also removed when no live record of its method has the key, every live record of the method probes its branches with none keyless, and the outcome is not an inlined copy. |
| An endpoint | Every handler an old run named for it is removed, and no live run reports it. An old run that is not stripped declared it at registration, and no old run found it at dispatch. Every live run has declared a route of each framework that declared it, and of each framework any live run declared. No live run has a disabled endpoint module or reported no route. An endpoint that an old run reported without a handler is never removed. |
| A dependency | Every live run has sent its whole dependency listing, and none names it. A dependency that a run found only when a class loaded from it is never removed. |

These stop a removal:

- **A live run with no complete class listing** blocks every class removal in its environment. That covers a run that has the listing switched off, and one whose listing has not finished arriving.
- **A live stripped run** blocks all removal in its environment. A stripped run makes no claim, and removal is a claim.
- **A live run that shows no endpoints** blocks every endpoint removal in its environment. That covers a run with a disabled endpoint module and a run that has reported no route. The same holds when one live run has declared a route of a framework and another live run has declared none.
- **A route found at dispatch.** An endpoint that any old run found when a request reached it is never removed, even when another run declared it at registration.
- **A limit of the rules.** A class that only a plugin loader or an application server loads is in no listing, so it is never removed. A method of a class that did not load in the new build stays until the old runs expire, because only a loaded class's record or a baseline shows which methods it has. A route of a framework that declares its routes on the first request, and that has not started in any live run, stays on the findings until a request reaches the new build.

A read that names an environment judges removal by that environment's live runs. A read across environments counts a thing as removed only when every environment that knows it has removed it. A version or seen-within read leaves removed code in, because it describes its own runs. See [Scope](scope#a-version-or-seen-within-read-keeps-removed-code).

### Filters that several pages share

- **Class prefix** keeps rows whose class name starts with the text. On **Never called** it matches the endpoint's handler class.
- **Known for at least (days)** keeps rows first known at least that many days ago, so recent code does not crowd out old code. It takes a whole number from 1 to 36500, and an empty field means no filter. [Dates](dates) explains the first known date.
- Every panel link carries the page's scope.

### Rows with capped dates

Some rows have no date kept for the whole service, such as a branch outcome without a branch key. Their dates come from the runs in scope, so a first date can be later than the true one and a last date can be earlier. A row with such dates shows an asterisk after **Known since**, with the tooltip "capped to the instances in scope". A filter that cannot prove a capped row leaves it out and says so, for example "2 branch outcomes were left out because their dates are not known for the whole service." The note shows when you set **Known for at least (days)** on **Never hit**, and whenever a row is left out on **Stale**. It also shows on **Never hit** for a branch outcome without a key in an environment that has lost a production run, with or without the filter.

## Never hit

**Never hit** claims that a method, or one path of a condition, never ran. A method is never hit when its hits, summed over the runs in scope, are zero. A condition has a never-hit path when at least one of its outcomes has zero hits. A read that names no version and no seen-within window also weighs the hits the service has recorded. A method or an outcome that the service has recorded a hit of is not never hit, even when no run in scope holds a hit, and [Stale](#stale) lists it once its last hit is old enough. A condition outcome without a branch key has no such record, so the runs in scope decide it. Once a production run of the environment has been removed, such an outcome makes no claim, because the removed run may hold its only hit. It is not listed here on any read, and it is not counted as never hit. A read that names a version or a seen-within window answers for the runs it selects. The agent records [methods and branches](/docs/agent/methods-and-branches). The panel count adds the method rows and the condition rows.

The page needs no baseline. It does need a run to have loaded the code, since a class that never loads sends no probes. [Never loaded](#never-loaded) covers that case.

The page never counts:

- Inline methods, generated methods and unread shapes, and the conditions inside them.
- A routine outcome. The page lists a condition only through its outcomes that are not routine. A condition whose only never-hit paths are routine is not listed, and the page counts those conditions and lists them on request. A path that only throws is a guard that held, so it is not dead code. See [routine outcomes](/docs/agent/methods-and-branches#routine-outcomes).
- A static initialiser. It is part of a class, so the class findings read it.
- A constructor, unless another constructor of its class ran. Then it is listed as an unused overload, with the Kind **Constructor**.
- A method that can run only through a class that holds a [Never initialised](#never-initialised) or [Never instantiated](#never-instantiated) finding. The class row covers it.
- A lambda body when every method that creates it is itself covered by a row of this list.
- A folded site. A condition inside code that a row of this page already covers has no row of its own, since deleting the covering code deletes the condition. That holds for a condition inside a listed method and for a condition behind a listed untaken outcome.
- An optional-parameter omission. [Never supplied](#never-supplied) reads those.
- A condition outcome with no hits and no branch key, in an environment that has lost a production run. A removed run may hold its only hit, so Otherlode makes no claim. The report counts these sites as `withheld`, and the overview states "N conditions withheld".
- A method or condition path with no hits that no run is evidence about, or whose class a run skipped. The report counts them apart as **without evidence**. See [Without evidence](#without-evidence).
- A method or condition path with no hits that a run not yet settled knows. A class page's count line and the report count them apart as **counts behind**, and the overview states "N methods and conditions not judged yet". An endpoint with no recorded call that a run not yet settled knows is in that count too. When the count holds endpoints, the overview names them, such as "3 methods, conditions and endpoints not judged yet" or "1 endpoint not judged yet". A lambda body that such a run knows does not fold into the method that creates it, and a class finding does not cover a method that such a run knows. Both count as behind too.

### Filters

**Kind** never changes which conditions fold. In the **By class** view, a condition whose method is not in the finding sits under a row that shows only the method's signature.

### What a row shows

| Column | Content |
|---|---|
| **Instances** | How many instances know the code, out of the judged instances in scope, as "2 of 3". This can be lower than the panel's **Instances** count, which also counts instances whose runs all came through a collector older than their agent. |
| **Known since** | When the service first reported the code. |
| **Routes** | The routes whose handler the method is. |
| Last column | A link: **Show on graph**, or **Show class** for a static initialiser's condition. **Show on graph** draws the method on the service overview's graph and opens its panel. It highlights the cluster that holds the code when the graph knows one. See the code path graph's [Filters](unreached-clusters#filters). |

Each outcome line names the code that runs only through that path, for example "only path to `Main.kt:65`". A line that reads "the code after it also runs the other way" guards no code: the check always went one way, so it is not dead code.

The same data is at the `never-hit` route of the [Read API](api).

## Never called

**Never called** claims that an endpoint received no request. The page is **Endpoints** with **Status** set to **Never called**. An endpoint is never called when some run in scope registered it and the calls to it, summed over every run in scope, are zero. A read that names no version and no seen-within window also counts a call the service has recorded, so an endpoint that was called before is not never called, even when no run in scope holds a call. A read that names a version or a seen-within window answers for the runs it selects. An endpoint that the agent found only when a request arrived is never named never called, since the request is what found it. See [Endpoints](/docs/agent/endpoints#declared-and-discovered).

The page never counts an endpoint whose framework module switched itself off. The module stops counting calls, so a route the framework still serves reads as zero. The endpoint reads **Module disabled** on the Endpoints page. The rule needs every run in scope that knows the endpoint to have disabled the module. A run whose module kept working counted every call, so its zero is evidence and the finding stands. See [modules that switch themselves off](/docs/agent/endpoints#modules-that-switch-themselves-off).

The page does not count an endpoint that a run not yet settled knows either, with or without calls elsewhere, and **Stale** leaves it out as well. The endpoint reads **Counts behind** on the Endpoints page, or **Live** when its last call is within **Stale after (days)**. An endpoint that is both switched off and behind reads **Module disabled**.

An endpoint can be an outside route, and the report counts it apart. See [Outside routes](#outside-routes).

The filters are:

- **Stale after (days)**, which sets when a called endpoint reads **Stale**. It defaults to 30.
- **Framework**, an exact match on the framework name.
- **Class prefix**, which matches the handler class.

An endpoint that takes every method reads `ANY`. A handler the agent could not name shows a dash. [Inventory](inventory) describes the endpoint list.

The same data is at the `endpoints` route, with `status=never-called`.

### Outside routes

An outside route is an endpoint whose handler class lies outside the include rules of every run in scope that declares it. Every such run named a handler class and sent its include rules, and the rules do not cover the class. A rule covers a class when an include package covers it and no exclude package does. A framework's own handlers, such as the one that serves static resources or the one behind `/error`, are outside routes when your include rules name only your code.

An outside route keeps its claim and its status. The report's never-called count leaves it out and counts it apart as `endpoints.never_called_outside`. An endpoint is the service's own route, and stays in the main count, when the include rules of any run in scope that declares it cover its handler class. It also stays there when a run named no handler class or sent no include rules, since Otherlode doesn't claim a class lies outside rules it never saw. A run sends its include rules with its class listing or its static baseline, so a run with both turned off sends none, and neither does a payload with an empty include list.

The Endpoints page lists outside routes apart from the service's own routes, under every **Status**, with the same filters and order. The page's total and paging count only the service's own routes. The graph leaves outside routes out.

The `endpoints` route marks each row with `handler_included`, and `outside=only` and `outside=exclude` filter by it.

## Never supplied

**Never supplied** claims that callers always take the default of an optional parameter. The page is **Optional parameters** with **Status** set to **Never supplied**. Otherlode compares two totals, both summed over every run and instance in scope. The omission total counts the calls that left the parameter out. The target hits total counts the calls to the function. A parameter is never supplied when the target was hit at least once and the two totals are equal. One caller that supplies the value anywhere in scope ends the finding. See [optional arguments](/docs/agent/methods-and-branches#optional-arguments).

The finding makes no claim, and the page does not list the parameter under it, when:

- the function can be overridden, since an override's calls spread the counts across methods Otherlode cannot relate;
- the function is inline;
- the function is generated, such as a data class's `copy`, where omitting a parameter is normal use;
- the function is an unread shape;
- a run not yet settled knows the parameter or its function;
- a run in scope skipped the class of the parameter or of its function, or, on a read that names no version and no seen-within window, the environment has ever had a run skip it; or
- the function has no method probe in scope. **Target hits total** then shows a dash with the tooltip "The target function has no method probe in scope."

The **Status** filter also offers **All parameters** and **Always supplied**. A parameter is always supplied when its target was hit at least once and no call omitted it. A read that names no version and no seen-within window also counts an omission the service has recorded, so a parameter whose only omitting run has expired is not always supplied. Always supplied makes the same exceptions, except that an overridable function is allowed. It has no panel item. A parameter that some calls omit and others supply is mixed and matches neither finding. A parameter that an unsettled run knows is neither never nor always supplied until the run is settled, since the calls it has not delivered could supply or omit the parameter. It stays on **All parameters**.

**Parameter** shows the name, or `#` and its index when the class file has no name. **Location** is the line of the default value.

The same data is at the `optional-parameters` route.

## Never loaded

**Never loaded** claims that no instance ever loaded a class. A class that never loads sends nothing, so the claim needs a list of the classes that should exist. That list is a complete static baseline. The agent sends one when you turn on `staticBaselineEnabled`. See [Never loaded](/docs/agent/classes#never-loaded) and [Enable the baseline](/docs/agent/classes#enable-the-baseline).

A class is never loaded when all of these hold:

- A run in scope sent a complete baseline that declares the class. The latest complete scan of each run counts. A scan is complete only when every chunk has arrived.
- No run in scope loaded the class. A class that was skipped, or that a sweep found loaded where no transformer saw it, counts as loaded.
- No run in scope names the class as failed to load. [Failed to load](#failed-to-load) holds that class.
- No in-scope run initialised the class and some in-scope run failed it. [Failed to initialise](#failed-to-initialise) holds that class.
- At least one declared method of the class is not inline, not generated and not an unread shape.

A read that names no version and no seen-within window also counts a class that any production run of the service loaded, in the environments in scope, even when that run's data has since been removed. A read that names a version or a seen-within window answers for the runs it selects.

Without a complete baseline the page lists nothing, and that says nothing about your classes. A class that lives where the baseline scan cannot look, such as a deployed WAR, is never declared, so it is never reported as never loaded.

**Methods** lists the declared method names without the static initialiser, and a method that is an unread shape carries a label naming its family. **Instances declaring** counts the instances with a run whose latest complete scan names the class.

The same data is at the `never-loaded` route.

## Failed to load

**Failed to load** names classes that the agent instrumented and the JVM never defined. A class like this is a deployment to fix, not code to delete. Otherlode keeps it out of [Never loaded](#never-loaded), out of the class findings and out of the clusters, even when a complete baseline declares it. See [Failed to load](/docs/agent/classes#failed-to-load).

A class is listed when some run in scope names it as failed and no run in scope loaded it. A class that any run in scope loaded is loaded, whatever another run says. A read that names no version and no seen-within window also counts a class that any production run of the service loaded, in the environments in scope, even when that run's data has since been removed, and so does not list it. A test run, or a run sent through an older collector, names nothing. The page needs no baseline.

The panel shows the item only while its count is above zero, and the overview states the count, such as "2 classes failed to load".

| Column | Content |
|---|---|
| **Instances naming** | How many instances have a run that names the class. |
| **Failing since** | The date Otherlode first received a manifest naming the class. |
| **Last failed** | The date Otherlode last received one. |

**Failing since** and **Last failed** are arrival times at Otherlode, kept for each environment. With no environment in scope, the page shows the earliest first date and the latest last date across environments. The scope's version and seen-within filters never change them. A class that failed for a long time is evidence that nothing needs it, and so is a dependency that only such a class uses. See [Dependencies failed to load](#dependencies-failed-to-load).

The same data is at the `failed-to-load` route.

## Failed to initialise

**Failed to initialise** names classes that the JVM defined and could not initialise: their verification failed, or their static initialiser threw. A class like this can never run in that JVM, so its methods never being hit says nothing about whether anyone needs them. It is a deployment to fix, not code to delete. Otherlode keeps it out of [Never initialised](#never-initialised), [Never instantiated](#never-instantiated), the never-hit rows and the clusters. Hits it recorded still stand. See [Failed to initialise](/docs/agent/classes#failed-to-initialise).

A class failed in a run when the run names it, or when it is a confirmed class of the run whose supertypes reach a class the run names. A rejection by the verifier reaches every subtype, through the superclass chain and through interfaces. A thrown initialiser reaches every subclass, and a class that implements an interface only when the interface declares a non-abstract instance method. The class is listed when some run in scope failed it and no run in scope initialised it. Otherlode judges a class that some run in scope initialised from the runs that did not fail it, whatever another run says. A class is initialised in a run when its initialiser returned. A class with no initialiser, or from an agent that sends no initialiser counts, is initialised when any of its probes has hits. A read with no version and no seen-within window also counts a returned initialiser that the service has recorded, even when that run's data has since been removed. A test run, or a run sent through an older collector, names nothing.

The panel shows the item only while its count is above zero, and the overview states the count, such as "2 classes failed to initialise". A class on this page is marked **Failed to initialise** on the [Classes](inventory#classes) list and on its class page.

| Column | Content |
|---|---|
| **Reasons** | Why runs named the class: **Static initialiser threw**, **Verifier rejected**, or **Unknown** for a reason a newer agent sent. A dash for a class that fails only because a supertype does. |
| **Carried from** | The supertypes some run named, which the class's failure comes from. A dash when no named supertype carries the failure to the class. |
| **Instances naming** | How many instances have a run that failed the class, named or carried. |
| **Failing since** | The date Otherlode first received a manifest naming the class. |
| **Last failed** | The date Otherlode last received one. |

**Failing since** and **Last failed** are arrival times at Otherlode, kept for each environment, as for [Failed to load](#failed-to-load). A dash shows when no manifest from the scoped environments has named the class itself. The same data is at the `failed-to-initialize` route.

## Never initialised

**Never initialised** claims that nothing used a class's statics and nothing created an instance. A class is never initialised when all of these hold:

- A run in scope loaded the class.
- The class has a static initialiser of its own that the agent probes.
- No run in scope ran that initialiser, and a read that names no version and no seen-within window finds no hit of it recorded for the service.
- Every run in scope that knows the initialiser is settled.
- No run in scope skipped the class, and, on a read that names no version and no seen-within window, no environment in scope has ever had a run skip it.

A class with no static initialiser is never judged here. A Kotlin `object` has one. A class holds at most one of never loaded, never initialised and never instantiated, the first that applies in that order. A never-initialised class covers every method it has, so none of them appears on [Never hit](#never-hit). See [Never initialised and never instantiated](/docs/agent/classes#never-initialised-and-never-instantiated).

**Known for at least (days)** tests the date the initialiser was first known. **Methods** leaves out the static initialiser, and **Known since** is the date of the initialiser.

The same data is at the `never-initialized` route.

## Never instantiated

**Never instantiated** claims that no run in scope created an instance of a class that was loaded. A class is never instantiated when all of these hold:

- A run in scope loaded the class.
- The class is not never initialised.
- The class has a constructor and at least one instance method that the agent probes.
- No constructor ran in any run in scope, and a read that names no version and no seen-within window finds no hit of a constructor recorded for the service.
- Every run in scope that knows the constructors is settled.
- No run in scope skipped the class, and, on a read that names no version and no seen-within window, no environment in scope has ever had a run skip it.

Otherlode never judges an interface, which has no constructor. It never judges a class that has only static methods, and a Kotlin file facade is one. The class row covers the constructors and instance methods. Its static methods can still run, so they stay on [Never hit](#never-hit).

Every constructor must pass the **Known for at least (days)** test. If the days filter hides a never-initialised class, the class does not appear here in its place. **Known since** is the latest date among the constructors.

The same data is at the `never-instantiated` route.

## Unreached clusters

**Unreached clusters** groups never-hit methods under the root that leads to them, so that deleting the root frees all of them. The panel count is the number of clusters. [Unreached clusters and the code path graph](unreached-clusters) describes the roots, the test callers and the graph. The agent's [call graph](/docs/agent/call-graph) page describes how it records the edges.

## Stale

**Stale** claims that code ran once and then stopped. The panel item **Stale** opens the page **Stale hit**. It lists a method or a condition path that some run in scope hit, whose last hit is older than the number of days you set. A read that names no version and no seen-within window also lists code that the service has recorded a hit of when no run in scope holds one. A read that names a version or a seen-within window lists only code that a run it selects hit. The default is 30 days. The panel link carries the days you set. The last hit is a date Otherlode keeps for the whole service in each environment, so removing old runs does not move it. See [Dates](dates).

The page never counts:

- Inline methods, generated methods, unread shapes and static initialisers.
- A routine outcome. A routine outcome is never stale.
- A row with capped dates. A capped last date can be earlier than the true one, so it cannot prove a row stale. The page counts the outcomes left out.
- A method or condition path that a run not yet settled knows. That run could hold a newer hit it has not delivered.
- A method or condition path of a class that a run in scope skipped, or, on a read that names no version and no seen-within window, that the environment has ever had a run skip. The skipped copy's newer hits never arrive.
- A folded site. A condition inside a stale method, or behind a stale untaken outcome, has no row of its own. A class finding folds nothing here.

A constructor is a row like any other method.

### Filters

The filters are those of [Never hit](#never-hit), with **Stale after (days)** in place of **Known for at least (days)**.

### What a row shows

The columns are those of [Never hit](#never-hit), plus **First hit**, **Last hit** and **Hits total**. For a condition, they come from its outcomes in the finding.

An endpoint goes stale by the same rule. The finding has no panel item. Use **Status** on the **Endpoints** page and choose **Stale**. An endpoint is stale when it was called before and its last call is older than **Stale after (days)**. A call the service has recorded counts as a call before on a read that names no version and no seen-within window. A module-disabled endpoint is never stale.

The same data is at the `stale-hit` route, with the optional `days` parameter. It defaults to 30.

## Unused dependencies

**Unused dependencies** claims that a library shows no live use. The page is **Dependencies** with **Status** set to **Unused**. A dependency is one library, merged across instances and versions by its group and artifact. The panel counts four statuses as unused: **Unloaded**, **Unreferenced**, **Unreached** and **No live reference**. See [Dependencies](/docs/agent/dependencies#statuses).

Otherlode decides one status for each dependency, from the runs in scope, and checks the statuses in the order of this table. The first that holds wins, except that **Counts behind** takes the place of four of them, and **Without evidence** of two, as below.

| Status | Meaning | In the unused count |
|---|---|---|
| **Resources only** | Every listing in scope counted no class in the library, and no run in scope loaded a class from it. | No |
| **Stale** | A run in scope listed the library from its startup classpath, and no run in scope loaded a class from it, but the service has recorded a class loading from it before. A read that names a version or a seen-within window never gives this status. | No |
| **Unloaded** | A run in scope listed the library from its startup classpath, and no run the service has recorded in the environments in scope loaded a class from it. On a read with a version or a seen-within window, this reads only the runs in scope. | Yes |
| **Loaded** | A class loaded, but no run that lists the library records references, so nothing more is claimed. | No |
| **Used** | A run that lists the library and records references holds a live reference to it. | No |
| **Failed to load** | A loaded library with no live reference that a class which failed to load references. | No |
| **Failed to initialise** | A loaded library with no live reference and none from a class that failed to load, that a class which failed to initialise references. | No |
| **No live reference** | A loaded library with no live reference, where some run that judged it has no complete baseline, so Otherlode cannot tell unreferenced from unreached. | Yes |
| **Unreferenced** | A loaded library that nothing in your code references. | Yes |
| **Unreached** | A loaded library that your code references only from methods never hit or classes never loaded. | Yes |
| **Counts behind** | A library that would read as **Stale**, **Unloaded**, **No live reference** or **Unreached**, where the zero count behind that status is not settled. | No |
| **Without evidence** | A library that would read as **No live reference** or **Unreached**, where no run that knows a method holding a reference is [evidence](#without-evidence) that the method never ran. | No |

**Counts behind** claims nothing. It replaces **Stale** and **Unloaded** when a run that lists the library is not settled, since a class loaded there would make it loaded. It replaces **No live reference** and **Unreached** when a method that holds a reference has no hits, and a run that knows that method is not settled, since the method may have run. A reference from a method with hits is live whichever run counted the hits, so the library is **Used**. **Unreferenced** reads only manifests and complete scans, so a run that is not settled does not hold it back, and neither does it hold back **Failed to load**. The status shows no sites, and the library returns to its usual status once the run is settled.

**Stale** claims nothing about whether the library can go. It says the library did load, and the **Last loaded** column says when, so a person deciding about the jar sees the date. The service keeps the first and the latest load of each library for each environment, and removing runs does not remove them. A library that no run ever loaded stays **Unloaded**. A run in scope that lists the library and is not settled makes it **Counts behind** first, since a class loaded there would make it loaded.

**Resources only** is checked first and claims nothing. A native library, a jar of web assets or a jar of message bundles has no class that can load, so a load count of zero says nothing about whether the service uses it. A listing whose class count is unknown does not count as zero, so such a library falls through to the other statuses.

A reference from a method is live when the method has hits. A method has hits when any run in scope hit it. On a read with no version and no seen-within window, a method the service has recorded a hit of also has hits. A run's manifest or its static baseline can name the method, and the result is the same. A reference at class level is live when the class has loaded. A class has loaded when a run in scope loaded it, or, on a read with no version and no seen-within window, when the service has recorded it loading. A class that failed to load holds no live reference. A class that failed to initialise holds no live reference at class level, and a method of it holds one only when the method has hits. The page never counts a reference held by an inline method, and it ignores a reference to a class that a run's own mapping assigns to no library it listed. An absent reference is a reference to a class no loader can find. The page links to those as "1 absent reference" or "3 absent references", and [Inventory](inventory) describes that list.

The statuses **Unreferenced** and **Unreached** need a complete static baseline from every run that judged the library. Without one, Otherlode reports **No live reference**, which is true in both cases. A library reached through a service lookup, such as a JDBC driver, can read as unreferenced while the application needs it, so read the status next to the loaded-class count. Each status is a lead, not an instruction to remove the library.

### A listing that has not fully arrived

The agent marks a run's dependency listing complete once its startup listing has fully arrived. Until every run in scope has done so, the page can lack some dependencies, and a library that one run loaded but has not listed can read as unloaded. The page says so: "The dependency listing has not fully arrived from 2 instances." The dependency counts in the panel then carry a `~`, with the tooltip "The dependency listing is incomplete." Two more notes can appear:

- "No in-scope run records references, so a loaded dependency reads as loaded and only unloaded is judged."
- "Unreferenced and unreached are not told apart, because some run that judged a dependency has no complete static baseline. Such a dependency reads as no live reference."

### Filters and columns

**Status** keeps one status, or **Unused** for the four unused statuses. The page has no class prefix filter. Rows sort by status as **Unloaded**, **Unreferenced**, **Unreached**, **No live reference**, **Failed to load**, **Failed to initialise**, **Counts behind**, **Without evidence**, **Stale**, **Used**, **Loaded** and **Resources only**.

**Loaded classes** reads "12 of 340", or "12" when the library's class count is unknown. **Sites** counts the places in your code that hold the references, for **Unreached**, **No live reference**, **Failed to load** and **Failed to initialise** rows.

The same data is at the `dependencies` route, with `status=unused`.

## Dependencies failed to load

**Dependencies failed to load** claims that only a class that failed to load references a library. The page is **Dependencies** with **Status** set to **Failed to load**. The panel shows the item only while its count is above zero. A library has this status when it is loaded, has no live reference, and some run that judged it references it from a class that reads as [failed to load](#failed-to-load). The class counts as failed across every run in scope. Only a reference that a run's latest complete baseline holds can come from such a class, so the status needs the baseline.

A live reference still wins, so a library that another class uses live is **Used**. The status takes the place of **No live reference**, **Unreferenced** and **Unreached**, and it is not in the **Unused** count. It claims no removal, so review the library before you remove it: the class may fail because of the classpath the library is on, and a library that only a long-failing class uses may not be needed.

The filter and the columns are those of [Unused dependencies](#unused-dependencies). The expanded sites of a failed library mark each failed class "failed to load since" with its date from [Failed to load](#failed-to-load), and the class links to that page. The listing notes and the `~` on the panel count apply here too.

The same data is at the `dependencies` route, with `status=failed-to-load`.

## Dependencies failed to initialise

**Dependencies failed to initialise** claims that only a class that failed to initialise references a library. The page is **Dependencies** with **Status** set to **Failed to initialise**. The panel shows the item only while its count is above zero. A library has this status when it is loaded, has no live reference, no judging run references it from a class that failed to load, and some run that judged it references it from a class that reads as [failed to initialise](#failed-to-initialise). A live reference still wins, so a library that another class uses live is **Used**. A reference from such a class is live only when the method that holds it has hits.

The status takes the place of **No live reference**, **Unreferenced** and **Unreached**, and it is not in the **Unused** count. It claims no removal, so review the library before you remove it: the class may fail because of the library, or the library may be needed once the class is fixed.

The filter and the columns are those of [Unused dependencies](#unused-dependencies). The expanded sites of such a library mark each failed class "failed to initialise", and the class links to [Failed to initialise](#failed-to-initialise). The listing notes and the `~` on the panel count apply here too.

The same data is at the `dependencies` route, with `status=failed-to-initialize`.
