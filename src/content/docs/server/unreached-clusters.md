---
title: Unreached clusters and the code path graph
description: What the Unreached clusters page lists and leaves out, how the server labels each cluster root, and how to read the code path graph on the service overview and class pages.
order: 100
---

An unreached cluster groups never-hit methods under the one root whose deletion removes them all. The agent sends the call edges and the server builds the clusters across your runs. The agent's [call graph page](/docs/agent/call-graph) defines a call edge, how a cluster forms and the kinds of root. This page covers how the server shows them: the **Unreached clusters** page in the Findings group, and the code path graph on the service overview and on each class page.

The server computes clusters over the runs in the [scope](scope) you have selected. Changing the environment, the version or the seen-within part of the scope can change a cluster's root and members. For the scopes people open most, the server computes them in the background with the report, and the page and the graph read the stored result, with the page's **As of** saying when it was computed. **Known for at least (days)** changes the clusters themselves, so with it set the page computes them when you open it. Any other scope is computed when you open it too. The code path graph draws the stored clusters and class findings together with endpoints, probes and calls read when you open it, so for up to about 20 minutes after new data arrives a node's hits can be newer than its cluster. See [the snapshots](how-it-works#the-report-and-finding-pages-are-read-from-stored-snapshots).

## What a row on the Unreached clusters page shows

The table lists the largest cluster first, then orders equal sizes by root. It shows 100 clusters per page. Each row has these columns.

| Column | What it shows |
|---|---|
| **Root** | The method, branch or class that starts the cluster, and the callers that lead to it. |
| **Root kind** | Why the root starts a cluster. See [Root kinds](#root-kinds). |
| **Routes** | The endpoints whose handler is the root, as `ANY /checkout`. Empty for a root that is no handler. |
| **Members total** | The number of methods in the cluster, the root included when it is a method. |
| **Never-loaded classes** | The number of distinct classes in the cluster that never loaded. |
| **Show on graph** | A link to the service overview with the cluster highlighted. |

Click a row to expand it. The expanded row lists the cluster's members and the tests that call them.

### The root cell

The root cell reads by the kind of root.

- A method root shows the class and method. A lambda body reads as its class and then a label such as "`Runnable` lambda in `main` at line 60", and a top-level function reads as `handleCheckout in CheckoutServer.kt`. A constructor reads `constructor`. Each class name links to the class page, which [Inventory](inventory) describes.
- A branch that never ran reads as the [Never hit](findings) list reads its condition, then "in" the method that holds it and the condition's location. The method has hits, so the cluster does not list it as a member.
- A class finding root reads as the class and its finding, such as "AuditLog, never initialised".
- A root that a method with hits calls adds "called from" and those methods. A caller that the compiler generated carries a label such as "(Kotlin data-class method)".
- A method root that tests call adds "called by tests" and the first three test methods, then "and N more".

When tests call an uncalled root but no complete static baseline rules out another caller, the cell adds this line: "Only tests call it, as far as the server can tell. No run in scope has a complete static baseline, so a class that never loaded may call it too."

### Root kinds

The **Root kind** column uses these labels. A second line gives the outside caller when the root's method has one.

| Label | What the server means | Agent page |
|---|---|---|
| uncalled | A method that nothing in scope calls and that has no outside caller. | [Root kinds](/docs/agent/call-graph#root-kinds) |
| reached from hit | A method that a method with hits calls, with the call not behind a branch that never ran. | [Root kinds](/docs/agent/call-graph#root-kinds) |
| branch never taken | A branch outcome that never ran, in a method that has hits. | [An untaken outcome roots the cluster behind it](/docs/agent/call-graph#an-untaken-outcome-roots-the-cluster-behind-it) |
| class never loaded, class never initialised, class never instantiated | A class that holds that class finding. | [Classes](/docs/agent/classes) |
| called from outside scope | A method that nothing in scope calls, with an outside caller. | [Outside callers](/docs/agent/call-graph#outside-callers) |
| called only by tests | A method that nothing in scope calls and a test calls. | [Test runs](/docs/agent/test-runs) |

The outside caller reads "overrides a method of HttpHandler" or "annotated @EventListener". The full type name is in the tooltip. The label changes only the root's kind. The method stays never hit and still joins the cluster of a never-hit caller. The server reports an outside caller on method roots only, never on a branch or class root.

A root is called only by tests when all of these hold.

- No in-scope production run calls the method.
- At least one test calls it.
- The method has no outside caller.
- At least one in-scope run sent a complete static baseline, which rules out a caller in a production class that never loaded. See [Enable the baseline](/docs/agent/classes#enable-the-baseline).

Without that baseline the root stays uncalled and keeps its test callers. A root with an outside caller keeps that kind even when tests call it, and still names those tests.

### Test callers

A test caller is a method of a test class that has a call edge to production code. A test class is a class that no production run of the service names, in any environment, and that no production run ever loaded, even one whose data has since been removed. So a class that loads only in production is never a test class. The tests come from your [test runs](/docs/agent/test-runs). The scope selector does not apply to them, and they never change which methods are roots or what a cluster holds.

The server names a test as `PayTest.refunds`, with "(line 31)" added when it knows the line. A lambda or anonymous class in a test reads as the test method that creates it. A test body that a constructor creates, as in a Kotest spec, reads as its class alone with its line, such as `SpecTest (line 18)`. A test that only reads a static field of a class the cluster holds whole is named as a caller of that class.

### The expanded row

The expanded row has up to two tables.

The members table has the columns **Member**, **Location** and **Never loaded**. It lists the classes the cluster holds whole first, such as "LegacyRates, never loaded, 1 method". It then lists every other method. **Location** is the file and line, such as `CheckoutServer.kt:48`. **Never loaded** reads "yes" or "no". The server lists a class whole when the cluster holds every judgeable method of it, and never lists a class's static initialiser as a member. It also leaves out the constructor of a class that nothing constructed, such as a utility class's private constructor.

The test table has the columns **Test** and **Calls**, one row for each test and the cluster method it calls. The root's own test callers come first.

The expanded row shows at most 200 members, 200 whole classes and 200 test calls. **Members total** keeps the true count. When tests call more than the table shows, a line reads "N more test calls not shown".

## Filters on the Unreached clusters page

The page applies the selected scope, then these two filters.

**Class prefix** keeps the clusters whose root's class name starts with the text you type. It does not remove members from a cluster it keeps.

**Known for at least (days)** sets the `known_for_days` parameter, a whole number of 1 or more. A method counts as never hit only when its first known date is at least that many days old, so a recently added method is neither a root nor a member. A branch outcome follows the same rule, and so does a class finding. A never-loaded method always counts, whatever the number. Leave the field empty for no window. See [Dates](dates) for first known and for dates that a filter cannot prove.

The count beside **Unreached clusters** in the sidebar, and the cluster line on the service overview, use no window. With **Known for at least (days)** set, the table can list fewer clusters than the sidebar counts. The [Read API](api) takes the same parameter on its unreached-clusters route, and answers a bad value with the error "known_for_days must be a whole number of 1 or more".

## What the clusters leave out

The server judges clusters over production runs only, and only for code it can judge.

- **Test runs.** A test run adds test callers and nothing else. Every method count, hit and cluster reads production runs.
- **Stripped runs.** A run that carried `fields_stripped` makes no claim, so no cluster reads it. See [How findings are judged](how-it-works).
- **Inline, generated and unread-shape methods.** They are stored and shown, but never a root or a member. A call that passes through a generated method continues along that method's own calls, and a generated method with hits counts as a caller that ran.
- **Routine outcomes.** A routine branch outcome never roots a cluster. A call it guards starts at its method.
- **A class that failed to load.** It is a deployment to fix, not dead code. No cluster holds it, even when a complete baseline declares it. See [Findings](findings).
- **A method with a caller the server cannot judge.** A caller in a class the agent skipped or never reported has no hit count, so the methods it calls are not roots.
- **Code a run not yet settled knows.** A method, a branch outcome or a generated method with no hits that a run not yet settled knows may have run, in counts that run has not delivered. It is neither hit nor never hit. It is no root and joins no cluster, and the code only it reaches is not claimed either. A call that such an outcome guards roots nothing. The graph draws it as not judged, and its hits still count if it has any. [Scope](scope#runs-that-are-not-settled) covers settled runs.
- **Code the service has recorded a hit of.** On a read that names no version and no seen-within window, a method, a branch outcome or a generated method with no hits in scope that the service has recorded a hit of counts as hit. It is no root and joins no cluster, and the never-hit code it calls can root a cluster as the callee of hit code. The sheet still shows its hits in scope. A read that names a version or a seen-within window leaves the record out.
- **A branch outcome the server withholds.** A keyless outcome with no hits, in an environment that has lost a production run, makes no claim, since the removed run may hold its only hit. It is no root and joins no cluster, and a call it guards roots nothing. The graph draws it as not judged, and its tooltip gives the reason.
- **A method called from two clusters.** It belongs to neither, since deleting one root would leave it called. It stays on the Never hit list.
- **A cycle of never-hit methods with no outside caller.** It has no root, so no cluster lists it.
- **A branch or class root that holds only itself.** The Never hit list or the class finding already says everything there, so the page lists no cluster.

## The code path graph

The graph draws what code runs from each entry into your service. It appears in two places: the **Code paths** card on the service overview, and under the heading of each class page. Both read the in-scope production runs. The graph's clusters use no `known_for_days` window. The page address holds the filters, the stale window, the selected node and the highlighted cluster, so a copied link opens the same view.

### Nodes

- **Endpoint.** A route with its verb and path, such as `GET /checkout`. A note reads "Handler not named" when the server cannot tie the route to a method, and "Never called" when the handler has no hits. A handler the service has recorded a hit of has hits for this note, and so does an endpoint with no handler whose call the service has recorded, on a read that names no version and no seen-within window. An endpoint that a run not yet settled knows, or whose handler such a run knows, never reads "Never called". For an endpoint with no handler, "Never called" means a call count of zero and no recorded call. A **module disabled** badge marks an endpoint whose framework module switched itself off. Such an endpoint with no handler never reads "Never called", since its count stopped.
- **Method.** The method's name and a row of badges. The first badge is the hit count ("12 hits"), or "never loaded". Other badges read "N conditions with an untaken path", "not judged", "cluster root" and "entry". A method with no hits that a run not yet settled knows carries "not judged" and draws as not judged, never as never hit. The method's sheet adds a **Counts** line that says so. The cluster root badge's tooltip gives the root kind and any outside caller. The chevron labelled **Conditions** expands the method to one row per condition, with a marker for each outcome. A marker's tooltip gives its hits, and says when the outcome roots an unreached cluster of N methods.
- **Class.** A frame around the methods of one class, with the class name and a badge for its class finding. Click it to open the class page. The class stands for its static initialiser, so a call into the class draws an arrow to the frame.

A method is an entry method when it has hits, no endpoint hands to it, and none of its in-scope callers has hits. Code the service has recorded a hit of counts as having hits, as a method and as a caller. Something outside the call graph invokes it, such as `main`, a scheduler or a message listener, so the graph draws it as a root next to the endpoints.

### What the graph draws

The graph draws each endpoint and entry method, and everything that handler links, calls or creates, with the class frame and the conditions of every method it draws. A method that no root reaches is not drawn. That covers an uncalled root and what only it reaches, and a group of hit methods that call only each other. Code in a cluster is drawn when you highlight that cluster. A method is drawn when you follow its **Show on graph** link on the **Never hit** or **Stale hit** page. See [Filters](#filters).

With no endpoint and no entry method to draw, the card shows one of these messages.

- "No run in scope." No run matches the scope.
- "No run that matches the scope is judged, so there is nothing to draw." Every run that matches the scope came through a collector older than its agent. Such a run makes no claim, so it is not in scope.
- "This service has no known endpoints or entry methods." The service has runs in scope, but none of them knows an endpoint or an entry method. The card also shows this message when the service's report could not load.

If the filters keep no root, the card reads "No roots match the current filters." No message shows while the graph draws code that no kept root reaches, such as a highlighted cluster. The card draws that code instead.

### Edges

| Line | Meaning |
|---|---|
| Solid line with an arrowhead | A call, or a handler link from an endpoint to its method. |
| Dashed line | **Virtual call**. The call names a type, and the server widens it to every override it knows. |
| Dotted line with no arrowhead | **Creates**. A method makes a lambda or a body class that someone else runs. |

An edge into a never-hit method draws in the never-hit colour. A creation reaches its target as a call does, because a lambda body can run only after its creator ran. See [What a call edge is](/docs/agent/call-graph#what-a-call-edge-is) and [Body classes](/docs/agent/call-graph#body-classes).

### The legend

The legend under the card's title names five node states and the two line styles.

| Legend entry | Meaning |
|---|---|
| **Live** | The code has hits, and its last hit is within the stale window. |
| **Stale** | The code has hits, and its last hit is older than the stale window. |
| **Never hit** | The code has no hits in scope, and on a read that names no version and no seen-within window, the service has recorded no hit of it either. |
| **Never loaded** | A complete static baseline declared the method and no run loaded its class. |
| **Not judged** | An inline method, a routine branch outcome, code with no hits that a run not yet settled knows, or a keyless branch outcome with no hits in an environment that has lost a production run. A withheld outcome's tooltip says that no claim is made because a run of its environment was removed. |
| **Virtual call** | A dashed line. |
| **Creates** | A dotted line. |

On a read that names no version and no seen-within window, code with no hits in scope that the service has recorded a hit of counts as hit. The graph draws it as live or stale by its recorded dates, with a hit count of 0.

The stale window is the **Stale after (days)** field. It is 30 days until you change it. It does not change which methods are never hit.

### Filters

The card has these controls above the graph.

- **Status** keeps roots by state: **All roots**, **Dead endpoints**, **Roots with a cluster under them** and **Stale roots**. A dead endpoint is a never-called one. An endpoint or a method that a run not yet settled knows is neither dead nor stale. A root has a cluster under it when it reaches a cluster root, a method that holds a branch that roots a cluster, or a class that roots a class finding cluster. An entry method has hits, so it is never dead.
- **Search** keeps a root when its route, verb or class or method name, or any node it reaches, contains the text, ignoring case. A method in a file facade also matches on its file name, such as `CheckoutServer.kt`.
- **Stale after (days)** sets the stale window.

The status filter and the search both apply. A root that one of them rejects is dropped, and the graph draws the rest in full.

When a cluster is highlighted, a chip names its root and a **Clear** button removes it. The graph dims every method outside the cluster. Click a cluster root, or follow **Show on graph** on the Unreached clusters page, to highlight one. The graph draws the highlighted cluster even when no drawn root reaches it, and even when the filters keep no root. It draws the cluster's root and members, and everything they call or create. For a branch root, it draws the method that holds the branch, and everything that method calls. The filters still choose the roots, and the cluster is drawn beside them. **Clear** removes the code that only the cluster added.

**Show on graph** on the **Never hit** and **Stale hit** pages opens the method's sheet. It also draws the method beside the kept roots, with everything it calls or creates, even when no kept root reaches it. A condition row draws the method that holds the condition. When an outcome of the condition roots a cluster, or the method roots or is a member of one, the graph highlights that cluster and the chip names the cluster's root. When the graph knows no cluster for the code and no kept root reaches it, the chip names the method or the condition instead. **Clear** removes the chip, the highlight and the code that only the link added.

Not every never-hit method is in a cluster the graph knows. A method called from two clusters belongs to neither, and a cluster lists at most 200 members. Such a method draws with no highlight.

### The node sheet

Click an endpoint or method to open its sheet. The sheet shows these fields.

- **Endpoint:** **Framework**, **Discovery source**, **Handler**, **Instances known**, **Known since**, **Calls total**, **First called**, **Last called**, and **Status** when the module is disabled.
- **Method:** **Signature**, **Location**, **Created in** when the method is a lambda or body, **Hits**, **First hit**, **Last hit**, **Routes**, **Instances known**, **Known since**, **Status**, **Outside caller**, and **Entry method** with the text "yes, no in-scope caller has hits".
- **Never-loaded method:** the identity fields, **Status** "never loaded", and its callers.
- **Class:** a finding badge, **Open class page**, its cluster, **Initialised by** and **Initialiser calls**.

**Created in** names the outermost method whose name the source gave, followed back through any lambda and body class. It links to that method when the graph has exactly one match. A method of an anonymous or local class keeps its own name and ends the walk.

A method's sheet also lists **Callers**, **Callees** and **Creates** as links, and **Conditions with an untaken path** with each condition's location. A condition that roots a cluster adds its size and the links below. **Routine outcomes** holds the routine outcomes that never ran, closed until you open it.

A method that roots a cluster shows **Cluster kind**, **Members total**, **Never-loaded classes**, **Whole classes**, **Reached from**, **Called by tests**, and the links **Show cluster on graph** and **View unreached clusters**. A member of a cluster shows **Cluster root** with a link to the root.

### The class page graph

A class page draws one class: its methods and their conditions, the endpoints that hand to those methods, and the direct callers and callees of those methods, one hop each way. It draws no further closure and has no status or search filter. The only control is **Stale after (days)**. A class with no method in scope reads "No probes in scope for this class." The page's heading, finding badge and counts belong to [Inventory](inventory).

### The cluster line on the overview

The line under the overview's headline counts clusters as "N clusters of methods sit only behind code that never ran." It leaves the sentence out when N is 0. The count is the same as the sidebar's. The **Test runs** fact under **What this is based on** says how many test runs the service holds, which tells you why no test callers show.
