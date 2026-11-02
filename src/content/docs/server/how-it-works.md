---
title: How findings are judged
description: Why Otherlode stores each run apart, merges counts so retries and restarts cannot inflate them, judges the report and the main finding pages in the background for the scopes people open most, and everything else when you read, and leaves some stored code unjudged, so you can decide how far to trust a finding.
order: 140
---

## A finding is a lead to check, not a verdict

Otherlode never says that code can be deleted. It says that across the runs in scope, a method never ran, an endpoint was never called, or a class never loaded. That is an observation about the processes the agents watched, over the time they watched them. A job that runs once a quarter, a failover path and an error handler for a rare outage all read as unused until the day they matter.

Otherlode cannot know which of those you have, so it reports what it saw and leaves the decision to you. Read a finding together with how long the service has been watched and which environments reported. [Dates](dates) shows both, and [findings](findings) lists what each finding claims and needs.

A read with no version or "seen within" filter also weighs the hits the service has recorded. Code with no hit in the runs in scope but a recorded hit counts as hit, not never hit, and the stale findings list it once its last hit is older than the window you ask for. A condition outcome the agent sent without a branch key has no record, so once a run of its environment has been removed, the outcome makes no claim.

## Each run is stored apart

An agent stamps every payload with a run ID, a random value it makes once at startup. A run is one process of one instance. Otherlode keeps the data of each run in rows of its own and never mixes two runs into one set of counters.

The reason is that identifiers only mean something inside one process. An agent numbers its classes in the order they load, so a restarted process can give class 1 to a different class. If Otherlode stored one set of rows for an instance, the old process's counts would sit under numbers the new process gave to other classes, and old hits would count against the wrong code. Keying by run makes that impossible. A restart under a pinned instance ID is a new run, and so is a new version.

The cost is storage. Every run keeps its own copy of what its agent sent, so a service that restarts often holds many runs. Otherlode prefers that over a merge that can attribute a hit to the wrong class.

## Counts merge with the larger total inside a run

An agent sends each probe's total since its process started, not the growth since the last payload. Within a run the total only rises, so Otherlode keeps the larger of the stored and the incoming value. A payload that arrives twice, because a reply was lost and the collector sent it again, changes nothing the second time. A payload that arrives late, after a newer one, changes nothing either. Otherlode needs no deduplication cache, and a retry can never double a count.

Across runs the counts are summed when Otherlode judges: when it computes a snapshot, or when you read a page that no snapshot serves. A method hit 40 times by one run and 12 by another has 52 hits in scope. A late payload from an old run changes only that run's rows, so it cannot overwrite what a newer run reported.

Where a number means instances, such as the instance count on a service, Otherlode counts distinct instances. An instance that restarted ten times counts once.

The agent can lose counts that it had not yet flushed when its process died. Otherlode cannot recover those, and a count can be low for that reason. It cannot be high.

## Findings are worked out from the runs in scope

To work out a finding, Otherlode selects the runs in scope, reads the rows it needs, and works out the answer in code. Each answer comes from one consistent view of the data, so a payload that lands halfway through cannot leave part of itself in the answer. For the scopes people open most, Otherlode does this in the background and stores the result, as [the next section](#the-report-and-finding-pages-are-read-from-stored-snapshots) describes. Every other read is worked out when you read.

The reason is that [scope](scope) changes the answer. Filter to one version, or to instances seen in the last 7 days, and a different set of runs counts, so a different set of methods is never hit and a different set of clusters forms. Such a filter answers for the runs it selects only. A read without one also weighs the hits the service has recorded. A stored result for every combination of filters would cost too much to keep up to date. So Otherlode stores results for the few scopes people open most, and works out any other scope when you read it.

A read worked out when you read takes time. It does more work than reading a stored result, and the work grows with the size of the service's code and dependencies, not with the page you see.

Test runs and production runs are kept apart in the same way. Every finding reads production runs only, so a test that calls a method does not make production's silence look like use. See [test runs](/docs/agent/test-runs) for how an agent marks one.

## The report and finding pages are read from stored snapshots

The report holds the counts in the panel and the facts in the evidence list. For the scopes people open most, Otherlode computes the report in the background and stores it as a snapshot, with every row of the pages **Never hit**, **Stale hit**, **Never initialised**, **Never instantiated**, **Unreached clusters**, **Classes** and **Removed**, and every probe. The overview's code path graph reads its probes, clusters and class findings from the same snapshot, and a class's page reads its counts from it too. A page then reads the snapshot, so a large service opens fast. The snapshot is computed by the same code as a live read, so it gives the same counts and rows for the same data.

When you open one of those pages, Otherlode applies its filters, sort and paging to the stored rows. A day filter, **Stale after (days)** on **Stale hit** and **Known for at least (days)** on **Never initialised** and **Never instantiated**, counts back from the time of the snapshot. **Known for at least (days)** on **Never hit** and **Unreached clusters** changes which code folds into another row or cluster, so those two pages are worked out when you read whenever that filter is set.

A service that a production run has reached has a snapshot for each of these scopes, with no seen-within window:

- every environment;
- each environment the service watches. An environment past the [environment cap](scope#a-service-watches-at-most-10-environments) has none;
- each of the 3 newest versions in an environment. A version is newer when its newest production run in that environment started later.

Otherlode refreshes a snapshot when something its findings read has changed, at most once every 15 minutes on the Team and Enterprise plans and once every 6 hours on the free plan. That includes a first hit of a method or a branch outcome, a first call of an endpoint, a first load of a dependency, and a hit, call or load on code whose last one was more than a day ago. It includes a new run, class, endpoint or dependency, a run that ends, turns stripped or reports again after it went silent, a run whose counts catch up or fall behind, and a class listing or static baseline that completes. A count that rises on an optional parameter, or on the method it belongs to, starts one too, since it can change the report's count of never-supplied parameters. A batch that only raises counts on other code hit within the last day changes no finding, so it doesn't start a refresh.

An environment's snapshot covers that environment's runs, and a version's snapshot covers that version's runs. Test runs, and runs from a collector older than their agent, count for every snapshot with no version, since the report counts them. They count for a version's snapshot only while one of that version's other runs is still reporting. So a version whose runs have all stopped is refreshed once for what they sent last, and after that only on the schedule below. A run that goes silent for an hour also starts a refresh of the snapshots it counts in, since the report counts silent instances. On the free plan that refresh waits for the 6-hour gap too.

With nothing changed, Otherlode still refreshes every snapshot at least once every 2 hours on the Team and Enterprise plans, and every 6 hours on the free plan, since day counts move with the clock.

A change that can take findings away, or release findings held back, refreshes without the wait, on every plan:

- a run that ends refreshes the snapshots with no version;
- a run that passes its live deadline refreshes the snapshots it counts in;
- a run that becomes settled refreshes the service's snapshots, since never loaded waits for it;
- a class listing or static baseline that completes refreshes the snapshot with no environment and its environment's snapshot;
- a run whose counts fall behind refreshes the service's snapshots.

A version's snapshot holds no removal, so a listing or baseline that completes waits for the gap there. A test run's or a stripped run's listing or baseline doesn't count for removal, so it waits too.

A refresh job runs every 5 minutes. So on the Team and Enterprise plans the findings on a snapshot page trail the data by up to about 20 minutes, the interval plus the job's period, and counts and dates on the page, such as hit totals and last-hit times, can trail by up to about 2 hours. On the free plan both can trail by up to about 6 hours. Each trails more while the refresh has a backlog. The report and the pages trail together, so a panel count from the report matches the page it links to when both come from the snapshot. A page worked out when you read can differ from its count by what arrived since the snapshot. [Counts in the panel](findings#counts-in-the-panel) lists which counts come from the report.

Every other scope is worked out when you read it: an older version, a version with no environment, any read with a seen-within window, and a service or environment that only test runs have reached. Every other page is worked out when you read it too, whatever the scope: the code path graph's endpoints and calls, and the pages **Never called**, **Never supplied**, **Never loaded**, **Failed to load**, **Failed to initialise**, **Unused dependencies**, **Dependencies failed to load**, **Dependencies failed to initialise**, **Instances**, **Endpoints**, **Dependencies**, **Absent references** and **Unclassified**.

**As of**, in the evidence list and on each page read from the snapshot, says when the data was read. For a snapshot it is the time the snapshot was computed, and for a live read the time of the read.

A new service, environment or version has no snapshot until the next refresh computes it. Neither has any scope after Otherlode changes how findings are judged, since it never shows a snapshot of an older format. It then computes the snapshot in the background and not when you read. Until then, each page and fact that reads the snapshot says it's computing. Each asks Otherlode again every 30 seconds. The panel leaves out the counts that come from the report, and still shows the others. The refresh computes your missing snapshots before your other snapshots, and among them every scope with no version before any version.

When the last attempt to compute a missing snapshot failed, the pages that read it say when it failed. A failed refresh of one scope holds back every scope of its service for an hour, and a scope it holds back says "Computing…". The refresh then tries the other scopes first and the failed one after them. A failure that a retry can fix, such as a lost database connection, holds back only that scope, which is tried again after the others in the next run. If that retry fails too, the service waits the hour.

## Removed code is kept out of the findings

A deploy that deletes code leaves the old runs in scope until they expire. A finding taken over them would show the deleted code as unused. So on a full read, Otherlode works out which code every live run of the environment proves absent, and leaves it out of every finding, the code path graph, the clusters and every total. [Removed code](findings#removed-code) says what a live run is, what proves a thing absent and what stops a removal. The [Removed](inventory#removed) page lists what was left out.

Otherlode stores no removal of its own. It works removal out from the retained runs when it computes a snapshot, and when it reads a scope that has no snapshot. A snapshot holds the findings with removed code already left out, the report's counts of removed code, and every row of the Removed list. So the Removed page, the report and the findings agree, and a class is on the Removed list in the same snapshot that leaves it out of Never hit. A scope's snapshot is also due again once a run's live deadline has passed since the snapshot was computed, because a run that was killed sends nothing to start a refresh. Once the last run that held the code expires, the code leaves the Removed list too.

A version or seen-within read describes the runs it selects, so it shows removed code. Code that comes back in a live run is no longer removed, and it keeps the dates it had.

## Some code is stored and shown, but never judged

A zero only counts as evidence when the code would have run if it was in use. For some code, a zero says nothing, so Otherlode stores the code, shows it, and keeps it out of every claim of unused code.

- **Inline code.** The body of an inline function runs at the place that calls it, not through its own method. The method's count stays near zero however often the code runs.
- **Generated code.** A compiler writes methods such as an enum's `valueOf` again whatever you do. A finding against one gives you nothing to delete.
- **Routine outcomes.** Some conditions have an untaken path that is not worth a person's time, for example a null default that is never null. The agent marks these, and Otherlode counts them apart.
- **Unread shapes.** The code looks like compiler output, but its body matches no shape the agent has read. The agent says so and does not guess. An upgrade of the agent can turn the row into a marked one or into your own code, so Otherlode shows it and makes no claim.

If any in-scope run marks a location this way, the location stays out of the claims. A disagreement between runs can remove a claim, and it can never add one. The reports show how many rows were left out, so you can see that the data exists and why nothing was claimed. [Methods and branches](/docs/agent/methods-and-branches) explains what the agent marks.

## A run from an older collector makes no claim

When a collector is older than its agent and has redaction on, it drops fields it does not know and flags the payload. A dropped field can be one Otherlode judges by, as the unread shape marker is. The finding built on it would be confident and wrong.

So Otherlode stores a flagged run and shows it, labelled as sent through a collector older than its agent, but counts it in no finding. It makes the opposite choice from showing a banner and judging anyway, because the finding next to the banner would still be wrong. Upgrade the collector and the next run counts.

## Never loaded needs a complete scan

A class that never loads sends nothing, so it looks the same as a class that does not exist. The only evidence is the agent's static baseline, an inventory of the classes it found on the classpath, taken without loading them. Otherlode calls a class never loaded only when three things hold. A complete baseline declares the class, no in-scope run mentions it anywhere else, and no live run that could have loaded it is still not settled. See [runs that are not settled](scope#runs-that-are-not-settled). A read with no version or "seen within" filter also counts a class that any production run of the service loaded, in the environments in scope.

The scan arrives in chunks. A partial scan cannot tell a missing class from one that has not been sent yet, so Otherlode counts a scan only when every chunk has arrived. A service with no complete scan in scope has an empty never-loaded list. That means no evidence. It does not mean no dead classes, and the report's count of instances with a complete baseline tells the two apart.

A class that failed to load is never dead code. The agent wove it and the JVM never defined it, so something is wrong with the deployment, such as a missing dependency. If any in-scope run loaded the class, or, on a read with no version or "seen within" filter, any production run of the service in the environments in scope, the class is loaded, whatever the other runs say. Otherwise Otherlode shows it as failed to load, and leaves it out of never loaded, out of every class finding and out of unreached clusters, even when a complete baseline declares it. A dependency that only such a class references gets the status `failed-to-load` and asks for a review. See [failed to load](/docs/agent/classes#failed-to-load) and [never loaded](/docs/agent/classes#never-loaded) for the agent's side.

## A class that failed to initialise is never dead code

A class whose verification failed or whose static initialiser threw was defined, and can never run in that JVM. Its methods have no hits, so without a rule it would read as never initialised and never hit. Otherlode reads the agent's names for such classes, and works out the subclasses that fail with them as the JVM does. A class that some in-scope run initialised is judged from the runs that did not fail it. A class that no in-scope run initialised, and that a run failed, reads as failed to initialise. Otherlode leaves it out of the class findings, the never-hit rows and the clusters, and keeps its hits. A dependency that only such a class references gets the status `failed-to-initialize` and asks for a review. See [failed to initialise](findings#failed-to-initialise).

## A zero count needs a run that could have seen the code run

Some runs cannot tell Otherlode that a class failed. The agent may not have hooked the verifier in time to see a rejection, so an unwatched run has no evidence about any class it did not hit. A verification failure the agent could not place in a class could be any class of the run. A run that left a class's static initialiser running has not finished the evidence either. Otherlode makes no zero-count claim from such a run, so a never-hit row, a class finding, a never-called endpoint or an unused dependency waits for a run that is evidence. A class that a run skipped sends no hits, so Otherlode withholds every zero-count claim about it in every run of the scope, and a read that names no version and no seen-within window keeps that after the skipping run expires. The report counts what it withheld as `without_evidence`, so the figures still add up, and an endpoint or a dependency reads **Without evidence**. Otherlode keeps these apart from counts behind, which says a run has not delivered its counts. See [without evidence](findings#without-evidence).

## Dates are the time a payload reached Otherlode

Every date about your code is the time the payload reached Otherlode, not the time the event happened in the process. **As of**, in the evidence list and on the pages read from a snapshot, is the exception: it is the time Otherlode computed the result. Agent clocks differ from host to host, and dates taken from many of them could put a first hit before the first time the code was known. One clock keeps that order true. The cost is that a date trails the event by up to one flush interval, and by more when a collector buffers or retries. Use dates to see how long code has gone unused, not as an audit record. [Dates](dates) covers what each date means.

## What this costs you

- Storage grows with the number of runs.
- Reading a page that no snapshot serves takes time on a large service, since Otherlode works it out when you read.
- The report can trail the data by up to about 20 minutes on the Team and Enterprise plans and about 6 hours on the free plan, and more while the refresh has a backlog.
- A count can be low if a process dies before its last flush.
- A date can be late by one flush interval or more.
- Code that is inline, generated, routine or an unread shape never appears as a finding, even when it is dead.
- A run from a collector older than its agent contributes nothing until you upgrade the collector.

Each of these makes Otherlode miss a finding before it makes a false one. A missed finding costs you a look at the code. A false one costs you a deleted method that was in use.
