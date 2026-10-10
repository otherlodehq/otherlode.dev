---
title: Findings
description: What each finding in a service's sidebar claims, what it needs before it can claim anything, what it leaves out, and what its page filters and shows.
order: 90
---

A finding is a claim that some code, route, parameter or dependency looks unused. The sidebar of a service lists the findings under **Findings**, in the order of this page, with a count beside each. This page describes each finding: the claim, the runs it reads, what it needs, what it never counts, its filters and its columns.

For why the server judges this way, read [How findings are judged](how-it-works). For the data the agent observes, see [Classes](/docs/agent/classes), [Methods and branches](/docs/agent/methods-and-branches), [Endpoints](/docs/agent/endpoints) and [Dependencies](/docs/agent/dependencies).

## What every finding shares

Every finding follows the same four rules.

- **A finding is a lead, not a verdict.** A zero count means no run you sent has seen the code run. It does not prove nobody needs the code. A service that has reported for less than 30 days shows a caution on its overview: code that runs weekly or monthly reads as never hit until it runs. Check a finding against how long the service has been watched. See [Dates](dates).
- **A finding covers judgeable code only.** The server stores code it cannot judge, and shows it, but never counts it in a finding. Inline methods, generated methods, routine outcomes and unread shapes are not judgeable. An endpoint is judgeable unless its framework module switched itself off. A class is judgeable when at least one of its declared methods is not inline, not generated and not an unread shape.
- **A finding reads production runs only.** It reads the runs that pass the page's [scope](scope). It leaves out test runs, which exist to name the tests that call code (see [Unreached clusters](unreached-clusters)). It also leaves out every run sent through a collector older than its agent, since such a collector drops fields the server judges by. The **Instances** list marks that run with the badge **Collector older than agent**, and the overview lists **Stripped runs**. Upgrade the collector to the agent's version so new runs count.
- **A zero-count claim needs every run that knows the code to be settled.** A run is settled when a delta batch from it has arrived and its newest payload says no counts are pending. A run that sent only a manifest is not settled, and neither is one whose counts a collector or proxy refused. When a run in scope that knows a method, a condition path, a class, an endpoint, an optional parameter or a dependency is not settled, the finding makes no zero-count claim about it, since the hits that run has not delivered could be the ones that ran. Code with hits is hit, whichever run counted them, and a run that does not know the code holds nothing back. The claim returns when the run is settled. The **Instances** page and the overview name the runs that are not settled. [Scope](scope#runs-that-are-not-settled) covers it.

Code that is stored but not judged still shows where it is useful. The overview has an **Unread shapes** card. It counts the methods and conditions in each family of compiler output the agent has not read, such as "Scala case-class plumbing" or "string switch lowering", and it names the agent versions that sent them. Routine outcomes are listed on request, as [Never hit](#never-hit) describes.

### Counts in the sidebar

The counts beside **Never hit**, **Never called**, **Never supplied**, **Never loaded**, **Failed to load**, **Never initialised**, **Never instantiated**, **Unreached clusters**, **Unused dependencies**, **Dependencies failed to load**, **Instances**, **Dependencies** and **Absent references** come from the report. For most scopes the report is read from a snapshot, which can trail the data by up to about 20 minutes. **Never hit**, **Never initialised**, **Never instantiated** and **Unreached clusters** are read from the same snapshot, so their counts match their pages. The other pages are worked out when you open them, so one of their counts can differ from the total on its page. While the report is being prepared, those counts are left out. The count beside **Stale** is read with the page's scope and days, the way its page is: from the snapshot when the scope has one, and worked out when you read when it has none. The counts beside **Classes**, **Endpoints** and **Unclassified** are read with each page's scope and are never from a snapshot. See [the report's snapshot](how-it-works#the-report-and-finding-pages-are-read-from-stored-snapshots).

A count above zero shows in heavier type. **Failed to load** and **Dependencies failed to load** appear only while their count is above zero. The dependency counts show a trailing `~` while the dependency listing is incomplete, which means the count may change. See [Unused dependencies](#unused-dependencies).

### Filters that several pages share

- **Class prefix** keeps rows whose class name starts with the text. On **Never called** it matches the endpoint's handler class.
- **Known for at least (days)** keeps rows first known at least that many days ago, so recent code does not crowd out old code. It takes a whole number of 1 or more, and an empty field means no filter. [Dates](dates) explains the first known date.
- A table shows 100 rows per page. The footer reads, for example, "1-100 of 250", with **Previous** and **Next** buttons.
- Every sidebar link carries the page's scope.

### Rows with capped dates

Some rows have no date kept for the whole service, such as a branch outcome without a branch key. Their dates come from the runs in scope, so a first date can be later than the true one and a last date can be earlier. A row with such dates shows an asterisk after **Known since**, with the tooltip "capped to the instances in scope". A filter that cannot prove a capped row leaves it out and says so above the table, for example "2 branch outcomes were left out because their dates are not known for the whole service." The note shows when you set **Known for at least (days)** on **Never hit**, and whenever a row is left out on **Stale**. It also shows on **Never hit** for a branch outcome without a key in an environment that has lost a production run, with or without the filter.

## Never hit

**Never hit** claims that a method, or one path of a condition, never ran. A method is never hit when its hits, summed over the runs in scope, are zero. A condition has a never-hit path when at least one of its outcomes has zero hits. A read that names no version and no seen-within window also weighs the hits the service has recorded. A method or an outcome that the service has recorded a hit of is not never hit, even when no run in scope holds a hit, and [Stale](#stale) lists it once its last hit is old enough. A condition outcome without a branch key has no such record, so the runs in scope decide it. Once a production run of the environment has been removed, such an outcome makes no claim, because the removed run may hold its only hit. It is not listed here on any read, and it is not counted as never hit. A read that names a version or a seen-within window answers for the runs it selects. The agent records [methods and branches](/docs/agent/methods-and-branches). The sidebar count adds the method rows and the condition rows.

The page needs no baseline. It does need a run to have loaded the code, since a class that never loads sends no probes. [Never loaded](#never-loaded) covers that case.

The page never counts:

- Inline methods, generated methods and unread shapes, and the conditions inside them.
- A routine outcome. The page lists a condition only through its outcomes that are not routine. A condition whose only never-hit paths are routine is not listed, and a line under the table counts those conditions, for example "2 conditions not listed, since their untaken paths are routine". The link **Show them** lists them, and **Hide them** returns. A routine outcome carries a badge: "default never used", "only throws" or "finally copy". See [routine outcomes](/docs/agent/methods-and-branches#routine-outcomes).
- A static initialiser. It is part of a class, so the class findings read it.
- A constructor, unless another constructor of its class ran. Then it is listed as an unused overload, with the Kind **Constructor**.
- A method that can run only through a class that holds a [Never initialised](#never-initialised) or [Never instantiated](#never-instantiated) finding. The class row covers it.
- A lambda body when every method that creates it is itself covered by a row of this list.
- A folded site. A condition inside code that a row of this page already covers has no row of its own, since deleting the covering code deletes the condition. That holds for a condition inside a listed method and for a condition behind a listed untaken outcome.
- An optional-parameter omission. [Never supplied](#never-supplied) reads those.
- A condition outcome with no hits and no branch key, in an environment that has lost a production run. A removed run may hold its only hit, so the server makes no claim. The report counts these sites as `withheld`, and the overview headline says how many conditions make no claim.
- A method or condition path with no hits that a run not yet settled knows. A class page's count line and the report count them apart as **counts behind**, and the overview headline says how many are not judged yet. A lambda body that such a run knows does not fold into the method that creates it, and a class finding does not cover a method that such a run knows. Both count as behind too.

### Filters

- **Class prefix**.
- **Kind**: **All kinds**, **Methods** or **Conditions**. The filter never changes which conditions fold.
- **Known for at least (days)**.
- **View**: **By class** groups the rows under a header for each class, and **Flat** adds a **Class** column. A class header counts its rows, for example "1 method, 6 conditions". A class that continues on another page adds "on this page".

### What a row shows

| Column | Content |
|---|---|
| **Class** | The class. Flat view only. |
| **Method** | The method. A condition row also shows the condition and one line for each outcome in the finding. |
| **Kind** | **Method**, **Constructor** or **Condition**. |
| **Location** | The source file and line. |
| **Instances** | How many instances know the code, out of the judged instances in scope, as "2 of 3". This can be lower than the sidebar's **Instances** count, which also counts instances whose runs all came through a collector older than their agent. |
| **Known since** | When the service first reported the code. |
| **Routes** | The routes whose handler the method is. |
| Last column | A link: **Show on graph**, or **Show class** for a static initialiser's condition. **Show on graph** draws the method on the service overview's graph and opens its sheet. It highlights the cluster that holds the code when the graph knows one. See the code path graph's [Filters](unreached-clusters#filters). |

A condition reads its outcomes as "was never true", "was never false", "never took" followed by a case, "never took the default", or "never ran". When both sides are in the finding, the condition reads "was never reached", and each line says "when true" or "when false". Each line then names the code that runs only through that path, for example "only path to `Main.kt:65`". A line that guards no code reads "the code after it also runs the other way", which says the check always went one way and is not dead code.

The same data is at the `never-hit` route of the [Read API](api).

## Never called

**Never called** claims that an endpoint received no request. The page is **Endpoints** with **Status** set to **Never called**. An endpoint is never called when some run in scope registered it and the calls to it, summed over every run in scope, are zero. A read that names no version and no seen-within window also counts a call the service has recorded, so an endpoint that was called before is not never called, even when no run in scope holds a call. A read that names a version or a seen-within window answers for the runs it selects. An endpoint that the agent found only when a request arrived counts as called, since the request is what found it. See [Endpoints](/docs/agent/endpoints#declared-and-discovered).

The page never counts an endpoint whose framework module switched itself off. The module stops counting calls, so a route the framework still serves reads as zero. The endpoint stays on the **All endpoints** list with a **module disabled** badge. The rule needs every run in scope that knows the endpoint to have disabled the module. A run whose module kept working counted every call, so its zero is evidence and the finding stands. See [modules that switch themselves off](/docs/agent/endpoints#modules-that-switch-themselves-off).

The page does not count an endpoint that a run not yet settled knows either, with or without calls elsewhere, and **Stale** leaves it out as well. The endpoint stays on the **All endpoints** list. One with no calls carries a **counts behind** badge; one with calls carries none, since it is not named never called anyway. An endpoint that is both switched off and behind carries only **module disabled**.

The filters are:

- **Status**: **All endpoints**, **Never called** or **Stale**.
- **Stale after (days)**, shown with **Stale**. It defaults to 30.
- **Framework**, an exact match on the framework name.
- **Class prefix**, which matches the handler class.

The columns are **Verb**, **Route template**, **Framework**, **Discovery source**, **Handler**, **Instances known**, **First known**, **First called**, **Calls total** and **Last called**. A verb of `ANY` means the framework takes every method. A handler the agent could not name shows a dash. [Inventory](inventory) describes the endpoint list.

The same data is at the `endpoints` route, with `status=never-called`.

## Never supplied

**Never supplied** claims that callers always take the default of an optional parameter. The page is **Optional parameters** with **Status** set to **Never supplied**. The server compares two totals, both summed over every run and instance in scope. The omission total counts the calls that left the parameter out. The target hits total counts the calls to the function. A parameter is never supplied when the target was hit at least once and the two totals are equal. One caller that supplies the value anywhere in scope ends the finding. See [optional arguments](/docs/agent/methods-and-branches#optional-arguments).

The finding makes no claim, and the page does not list the parameter under it, when:

- the function can be overridden, since an override's calls spread the counts across methods the server cannot relate;
- the function is inline;
- the function is generated, such as a data class's `copy`, where omitting a parameter is normal use;
- the function is an unread shape;
- a run not yet settled knows the parameter or its function; or
- the function has no method probe in scope. **Target hits total** then shows a dash with the tooltip "The target function has no method probe in scope."

The **Status** filter also offers **All parameters** and **Always supplied**. A parameter is always supplied when its target was hit at least once and no call omitted it. Always supplied makes the same exceptions, except that an overridable function is allowed. It has no sidebar item. A parameter that some calls omit and others supply is mixed and matches neither finding. A parameter that an unsettled run knows is neither never nor always supplied until the run is settled, since the calls it has not delivered could supply or omit the parameter. It stays on **All parameters**. The other filter is **Class prefix**.

The columns are **Class**, **Method**, **Parameter**, **Location**, **Inline**, **Overridable**, **Instances known**, **Known since**, **Omissions total**, **Target hits total**, **First omitted** and **Last omitted**. **Parameter** shows the name, or `#` and its index when the class file has no name. **Location** is the line of the default value.

The same data is at the `optional-parameters` route.

## Never loaded

**Never loaded** claims that no instance ever loaded a class. A class that never loads sends nothing, so the claim needs a list of the classes that should exist. That list is a complete static baseline. The agent sends one when you turn on `staticBaselineEnabled`. See [Never loaded](/docs/agent/classes#never-loaded) and [Enable the baseline](/docs/agent/classes#enable-the-baseline).

A class is never loaded when all of these hold:

- A run in scope sent a complete baseline that declares the class. The latest complete scan of each run counts. A scan is complete only when every chunk has arrived.
- No run in scope loaded the class. A class that was skipped, or that a sweep found loaded where no transformer saw it, counts as loaded.
- No run in scope names the class as failed to load. [Failed to load](#failed-to-load) holds that class.
- At least one declared method of the class is not inline, not generated and not an unread shape.

A read that names no version and no seen-within window also counts a class that any production run of the service loaded, in the environments in scope, even when that run's data has since been removed. A read that names a version or a seen-within window answers for the runs it selects.

Without a complete baseline the page lists nothing, and that says nothing about your classes. A class that lives where the baseline scan cannot look, such as a deployed WAR, is never declared, so it is never reported as never loaded.

The only filter is **Class prefix**. The columns are **Class**, **Methods** and **Instances declaring**. **Methods** lists the declared method names without the static initialiser, and a method that is an unread shape carries a label naming its family. **Instances declaring** counts the instances with a run whose latest complete scan names the class.

The same data is at the `never-loaded` route.

## Failed to load

**Failed to load** names classes that the agent instrumented and the JVM never defined. A class like this is a deployment to fix, not code to delete. The server keeps it out of [Never loaded](#never-loaded), out of the class findings and out of the clusters, even when a complete baseline declares it. See [Failed to load](/docs/agent/classes#failed-to-load).

A class is listed when some run in scope names it as failed and no run in scope loaded it. A class that any run in scope loaded is loaded, whatever another run says. A read that names no version and no seen-within window also counts a class that any production run of the service loaded, in the environments in scope, even when that run's data has since been removed, and so does not list it. A test run, or a run sent through an older collector, names nothing. The page needs no baseline.

The sidebar shows the item only while its count is above zero, and the page reads "No class failed to load in this scope." when the list is empty. The only filter is **Class prefix**.

| Column | Content |
|---|---|
| **Class** | The class name. |
| **Instances naming** | How many instances have a run that names the class. |
| **Failing since** | The date the server first received a manifest naming the class, with the days since, for example "1 Jun 2026 (122 days)". |
| **Last failed** | The date the server last received one. |

**Failing since** and **Last failed** are server arrival times, kept for each environment. With no environment in scope, the page shows the earliest first date and the latest last date across environments. The scope's version and seen-within filters never change them. A class that failed for a long time is evidence that nothing needs it, and so is a dependency that only such a class uses. See [Dependencies failed to load](#dependencies-failed-to-load).

The same data is at the `failed-to-load` route.

## Never initialised

**Never initialised** claims that nothing used a class's statics and nothing created an instance. A class is never initialised when all of these hold:

- A run in scope loaded the class.
- The class has a static initialiser of its own that the agent probes.
- No run in scope ran that initialiser, and a read that names no version and no seen-within window finds no hit of it recorded for the service.
- Every run in scope that knows the initialiser is settled.

A class with no static initialiser is never judged here. A Kotlin `object` has one. A class holds at most one of never loaded, never initialised and never instantiated, the first that applies in that order. A never-initialised class covers every method it has, so none of them appears on [Never hit](#never-hit). See [Never initialised and never instantiated](/docs/agent/classes#never-initialised-and-never-instantiated).

The filters are **Class prefix** and **Known for at least (days)**. The days test the date the initialiser was first known. The columns are:

- **Class**.
- **Methods**, without the static initialiser. A constructor reads `constructor`.
- **Instances loading**, the instances that loaded the class.
- **Known since**, the date of the initialiser.

The same data is at the `never-initialized` route.

## Never instantiated

**Never instantiated** claims that no run in scope created an instance of a class that was loaded. A class is never instantiated when all of these hold:

- A run in scope loaded the class.
- The class is not never initialised.
- The class has a constructor and at least one instance method that the agent probes.
- No constructor ran in any run in scope, and a read that names no version and no seen-within window finds no hit of a constructor recorded for the service.
- Every run in scope that knows the constructors is settled.

The server never judges an interface, which has no constructor. It never judges a class that has only static methods, and a Kotlin file facade is one. The class row covers the constructors and instance methods. Its static methods can still run, so they stay on [Never hit](#never-hit).

The filters are **Class prefix** and **Known for at least (days)**. Every constructor must pass the days test. If the days filter hides a never-initialised class, the class does not appear here in its place. The columns are the same as on [Never initialised](#never-initialised), and **Known since** is the latest date among the constructors.

The same data is at the `never-instantiated` route.

## Unreached clusters

**Unreached clusters** groups never-hit methods under the root that leads to them, so that deleting the root frees all of them. The sidebar count is the number of clusters. The page has the filters **Class prefix** and **Known for at least (days)**. [Unreached clusters and the code path graph](unreached-clusters) describes the roots, the test callers and the graph. The agent's [call graph](/docs/agent/call-graph) page describes how it records the edges.

## Stale

**Stale** claims that code ran once and then stopped. The sidebar item **Stale** opens the page **Stale hit**. It lists a method or a condition path that some run in scope hit, whose last hit is older than the number of days you set. A read that names no version and no seen-within window also lists code that the service has recorded a hit of when no run in scope holds one. A read that names a version or a seen-within window lists only code that a run it selects hit. The default is 30 days. The sidebar link carries the days you set. The last hit is a date the server keeps for the whole service in each environment, so removing old runs does not move it. See [Dates](dates).

The page never counts:

- Inline methods, generated methods, unread shapes and static initialisers.
- A routine outcome. A routine outcome is never stale.
- A row with capped dates. A capped last date can be earlier than the true one, so it cannot prove a row stale. The note above the table counts the outcomes left out.
- A method or condition path that a run not yet settled knows. That run could hold a newer hit it has not delivered.
- A folded site. A condition inside a stale method, or behind a stale untaken outcome, has no row of its own. A class finding folds nothing here.

A constructor is a row like any other method.

### Filters

- **Class prefix**.
- **Kind**: **All kinds**, **Methods** or **Conditions**.
- **Stale after (days)**.
- **View**: **By class** or **Flat**. A class header counts its rows, for example "2 stale methods".

### What a row shows

The columns are those of [Never hit](#never-hit), with three more after **Known since**: **First hit**, **Last hit** and **Hits total**. For a condition, they come from its outcomes in the finding. A condition outcome reads "last true", "last false", "last took" followed by a case, "last took the default" or "last ran", each followed by a relative time such as "3 days ago", with the exact time in the tooltip. A condition with both sides in the finding reads "last reached" and the time.

An endpoint goes stale by the same rule. The finding has no sidebar item. Use **Status** on the **Endpoints** page and choose **Stale**. An endpoint is stale when it was called before and its last call is older than **Stale after (days)**. A call the service has recorded counts as a call before on a read that names no version and no seen-within window. A module-disabled endpoint is never stale.

The same data is at the `stale-hit` route, with the required `days` parameter.

## Unused dependencies

**Unused dependencies** claims that a library shows no live use. The page is **Dependencies** with **Status** set to **Unused**. A dependency is one library, merged across instances and versions by its group and artifact. The sidebar counts four statuses as unused: **Unloaded**, **Unreferenced**, **Unreached** and **No live reference**. See [Dependencies](/docs/agent/dependencies#statuses).

The server decides one status for each dependency, from the runs in scope, and checks the statuses in the order of this table. The first that holds wins, except that **Counts behind** takes the place of four of them, as below.

| Status | Meaning | In the unused count |
|---|---|---|
| **Resources only** | Every listing in scope counted no class in the library, and no run in scope loaded a class from it. | No |
| **Stale** | A run in scope listed the library from its startup classpath, and no run in scope loaded a class from it, but the service has recorded a class loading from it before. A read that names a version or a seen-within window never gives this status. | No |
| **Unloaded** | A run in scope listed the library from its startup classpath, and no run the service has recorded in the environments in scope loaded a class from it. On a read with a version or a seen-within window, this reads only the runs in scope. | Yes |
| **Loaded** | A class loaded, but no run that lists the library records references, so nothing more is claimed. | No |
| **Used** | A run that lists the library and records references holds a live reference to it. | No |
| **Failed to load** | A loaded library with no live reference that a class which failed to load references. | No |
| **No live reference** | A loaded library with no live reference, where some run that judged it has no complete baseline, so the server cannot tell unreferenced from unreached. | Yes |
| **Unreferenced** | A loaded library that nothing in your code references. | Yes |
| **Unreached** | A loaded library that your code references only from methods never hit or classes never loaded. | Yes |
| **Counts behind** | A library that would read as **Stale**, **Unloaded**, **No live reference** or **Unreached**, where the zero count behind that status is not settled. | No |

**Counts behind** claims nothing. It replaces **Stale** and **Unloaded** when a run that lists the library is not settled, since a class loaded there would make it loaded. It replaces **No live reference** and **Unreached** when a method that holds a reference has no hits, and a run that knows that method is not settled, since the method may have run. A reference from a method with hits is live whichever run counted the hits, so the library is **Used**. **Unreferenced** reads only manifests and complete scans, so a run that is not settled does not hold it back, and neither does it hold back **Failed to load**. The tooltip reads "A run that knows it has not sent all its counts, so it is not called unloaded, unreached or without a live reference yet." The status shows no sites, and the library returns to its usual status once the run is settled.

**Stale** claims nothing about whether the library can go. It says the library did load, and the **Last loaded** column says when, so a person deciding about the jar sees the date. The service keeps the first and the latest load of each library for each environment, and removing runs does not remove them. A library that no run ever loaded stays **Unloaded**. A run in scope that lists the library and is not settled makes it **Counts behind** first, since a class loaded there would make it loaded. The tooltip reads "Listed on the startup classpath, and no retained run loaded a class from it, though one loaded before. Nothing is claimed about removal."

**Resources only** is checked first and claims nothing. A native library, a jar of web assets or a jar of message bundles has no class that can load, so a load count of zero says nothing about whether the service uses it. A listing whose class count is unknown does not count as zero, so such a library falls through to the other statuses. The tooltip reads "No class in it can load, such as a native library or web assets. Nothing is claimed."

A reference is live when a method with hits holds it, or a class that loaded holds it at class level. On a read with no version and no seen-within window, a method the service has recorded a hit of counts as having hits, even when no run in scope hit it. A reference that only a static baseline holds is never live. The page never counts a reference held by an inline method, and it ignores a reference to a class that a run's own mapping assigns to no library it listed. An absent reference is a reference to a class no loader can find. The page links to those as "1 absent reference" or "3 absent references", and [Inventory](inventory) describes that list.

The statuses **Unreferenced** and **Unreached** need a complete static baseline from every run that judged the library. Without one, the server reports **No live reference**, which is true in both cases. A library reached through a service lookup, such as a JDBC driver, can read as unreferenced while the application needs it, so read the status next to the loaded-class count. Each status is a lead, not an instruction to remove the library.

### A listing that has not fully arrived

The agent marks a run's dependency listing complete once its startup listing has fully arrived. Until every run in scope has done so, the page can lack some dependencies, and a library that one run loaded but has not listed can read as unloaded. The page says so above the table: "The dependency listing has not fully arrived from 2 instances, so this list may be missing entries." The dependency counts in the sidebar then carry a `~`, with the tooltip "The dependency listing is incomplete, so this count may change." Two more notes can appear above the table:

- "No in-scope run records references, so a loaded dependency reads as loaded and only unloaded is judged."
- "Unreferenced and unreached are not told apart, because some run that judged a dependency has no complete static baseline. Such a dependency reads as no live reference."

### Filters and columns

The one filter is **Status**. It offers **All dependencies**, **Unused**, then each status above, with the count after each name. The page has no class prefix filter. Rows sort by status as **Unloaded**, **Unreferenced**, **Unreached**, **No live reference**, **Failed to load**, **Counts behind**, **Stale**, **Used**, **Loaded** and **Resources only**.

The columns are:

- **Dependency**, as `group:artifact` with every version seen.
- **Status**, with a tooltip that explains it.
- **Loaded classes**, as "12 of 340", or "12" when the library's class count is unknown.
- **Discovery**, which is "startup classpath", "class load" or both.
- **Known since**, **First loaded** and **Last loaded**.
- **Sites**, the number of places in your code that hold the references. It shows for **Unreached**, **No live reference** and **Failed to load** rows, and a dash for the others.

Click a row with sites to expand them. Each site shows its class and method, and whether the class is "loaded" or "never loaded". A row lists at most 50 sites and then reads "Showing 50 of 63 sites."

The same data is at the `dependencies` route, with `status=unused`.

## Dependencies failed to load

**Dependencies failed to load** claims that only a class that failed to load references a library. The page is **Dependencies** with **Status** set to **Failed to load**. The sidebar shows the item only while its count is above zero. A library has this status when it is loaded, has no live reference, and some run that judged it references it from a class that reads as [failed to load](#failed-to-load). The class counts as failed across every run in scope. Only a reference that a run's latest complete baseline holds can come from such a class, so the status needs the baseline.

A live reference still wins, so a library that another class uses live is **Used**. The status takes the place of **No live reference**, **Unreferenced** and **Unreached**, and it is not in the **Unused** count. It asks for review and claims no removal: the class may fail because of the classpath the library is on, and a library that only a long-failing class uses may not be needed. The tooltip reads "Only classes that failed to load reference it. Review it, do not remove it blind."

The filter and the columns are those of [Unused dependencies](#unused-dependencies). The expanded sites of a failed library mark each failed class "failed to load since" with its date from [Failed to load](#failed-to-load), and the class links to that page. The listing notes above the table and the `~` on the sidebar count apply here too.

The same data is at the `dependencies` route, with `status=failed-to-load`.
