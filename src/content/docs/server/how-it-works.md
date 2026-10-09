---
title: How findings are judged
description: Why the server stores each run apart, merges counts so retries and restarts cannot inflate them, judges when you read, and leaves some stored code unjudged, so you can decide how far to trust a finding.
order: 140
---

## A finding is a lead to check, not a verdict

The server never says that code can be deleted. It says that across the runs in scope, a method never ran, an endpoint was never called, or a class never loaded. That is an observation about the processes the agents watched, over the time they watched them. A job that runs once a quarter, a failover path and an error handler for a rare outage all read as unused until the day they matter.

The server cannot know which of those you have, so it reports what it saw and leaves the decision to you. Read a finding together with how long the service has been watched and which environments reported. [Dates](dates) shows both, and [findings](findings) lists what each finding claims and needs.

A read with no version or "seen within" filter also weighs the hits the service has recorded. Code with no hit in the runs in scope but a recorded hit counts as hit, not never hit, and the stale findings list it once its last hit is older than the window you ask for. A condition outcome the agent sent without a branch key has no record, so once a run of its environment has been removed, the outcome makes no claim.

## Each run is stored apart

An agent stamps every payload with a run ID, a random value it makes once at startup. A run is one process of one instance. The server keeps the data of each run in rows of its own and never mixes two runs into one set of counters.

The reason is that identifiers only mean something inside one process. An agent numbers its classes in the order they load, so a restarted process can give class 1 to a different class. If the server stored one set of rows for an instance, the old process's counts would sit under numbers the new process gave to other classes, and old hits would count against the wrong code. Keying by run makes that impossible. A restart under a pinned instance ID is a new run, and so is a new version.

The cost is storage. Every run keeps its own copy of what its agent sent, so a service that restarts often holds many runs. The server prefers that over a merge that can attribute a hit to the wrong class.

## Counts merge with the larger total inside a run

An agent sends each probe's total since its process started, not the growth since the last payload. Within a run the total only rises, so the server keeps the larger of the stored and the incoming value. A payload that arrives twice, because a reply was lost and the collector sent it again, changes nothing the second time. A payload that arrives late, after a newer one, changes nothing either. The server needs no deduplication cache, and a retry can never double a count.

Across runs the counts are summed when you read. A method hit 40 times by one run and 12 by another has 52 hits in scope. A late payload from an old run changes only that run's rows, so it cannot overwrite what a newer run reported.

Where a number means instances, such as the instance count on a service, the server counts distinct instances. An instance that restarted ten times counts once.

The agent can lose counts that it had not yet flushed when its process died. The server cannot recover those, and a count can be low for that reason. It cannot be high.

## Findings are computed when you read

The server stores no finding. When you open a page or call the API, it selects the runs in scope, reads the rows it needs, and works out the answer in code. Unreached clusters and dependency statuses are read from one consistent snapshot, so a payload that lands halfway through a read cannot leave part of itself in the answer.

The reason is that [scope](scope) changes the answer. Filter to one version, or to instances seen in the last 7 days, and a different set of runs counts, so a different set of methods is never hit and a different set of clusters forms. Such a filter answers for the runs it selects only. A read without one also weighs the hits the service has recorded. A stored result would need one copy for every combination of filters, and it would be out of date after each payload. Computing on read means a change of scope changes the result at once, and a new payload shows up on the next read.

The price is time. Reading a large service does more work than reading a stored row, and the work grows with the size of the service's code and dependencies, not with the page you see. The server accepts that to keep every number tied to the scope you chose.

Test runs and production runs are kept apart in the same way. Every finding reads production runs only, so a test that calls a method does not make production's silence look like use. See [test runs](/docs/agent/test-runs) for how an agent marks one.

## Some code is stored and shown, but never judged

A zero only counts as evidence when the code would have run if it was in use. For some code, a zero says nothing, so the server stores the code, shows it, and keeps it out of every claim of unused code.

- **Inline code.** The body of an inline function runs at the place that calls it, not through its own method. The method's count stays near zero however often the code runs.
- **Generated code.** A compiler writes methods such as an enum's `valueOf` again whatever you do. A finding against one gives you nothing to delete.
- **Routine outcomes.** Some conditions have an untaken path that is not worth a person's time, for example a null default that is never null. The agent marks these, and the server counts them apart.
- **Unread shapes.** The code looks like compiler output, but its body matches no shape the agent has read. The agent says so and does not guess. An upgrade of the agent can turn the row into a marked one or into your own code, so the server shows it and makes no claim.

If any in-scope run marks a location this way, the location stays out of the claims. A disagreement between runs can remove a claim, and it can never add one. The reports show how many rows were left out, so you can see that the data exists and why nothing was claimed. [Methods and branches](/docs/agent/methods-and-branches) explains what the agent marks.

## A run from an older collector makes no claim

When a collector is older than its agent and has redaction on, it drops fields it does not know and flags the payload. A dropped field can be one the server judges by, as the unread shape marker is. The finding built on it would be confident and wrong.

So the server stores a flagged run and shows it, labelled as sent through a collector older than its agent, but counts it in no finding. It makes the opposite choice from showing a banner and judging anyway, because the finding next to the banner would still be wrong. Upgrade the collector and the next run counts.

## Never loaded needs a complete scan

A class that never loads sends nothing, so it looks the same as a class that does not exist. The only evidence is the agent's static baseline, an inventory of the classes it found on the classpath, taken without loading them. The server calls a class never loaded only when two things hold. A complete baseline declares the class, and no in-scope run mentions it anywhere else. A read with no version or "seen within" filter also counts a class that any production run of the service loaded, in the environments in scope.

The scan arrives in chunks. A partial scan cannot tell a missing class from one that has not been sent yet, so the server counts a scan only when every chunk has arrived. A service with no complete scan in scope has an empty never-loaded list. That means no evidence. It does not mean no dead classes, and the report's count of instances with a complete baseline tells the two apart.

A class that failed to load is never dead code. The agent wove it and the JVM never defined it, so something is wrong with the deployment, such as a missing dependency. If any in-scope run loaded the class, or, on a read with no version or "seen within" filter, any production run of the service in the environments in scope, the class is loaded, whatever the other runs say. Otherwise the server shows it as failed to load, and leaves it out of never loaded, out of every class finding and out of unreached clusters, even when a complete baseline declares it. A dependency that only such a class references gets the status `failed-to-load` and asks for a review. See [failed to load](/docs/agent/classes#failed-to-load) and [never loaded](/docs/agent/classes#never-loaded) for the agent's side.

## Dates are the server's arrival time

Every date the server shows is the time the payload reached the server, not the time the event happened in the process. Agent clocks differ from host to host, and dates taken from many of them could put a first hit before the first time the code was known. One clock keeps that order true. The cost is that a date trails the event by up to one flush interval, and by more when a collector buffers or retries. Use dates to see how long code has gone unused, not as an audit record. [Dates](dates) covers what each date means.

## What this costs you

- Storage grows with the number of runs.
- Reading a large service takes longer than reading a stored result.
- A count can be low if a process dies before its last flush.
- A date can be late by one flush interval or more.
- Code that is inline, generated, routine or an unread shape never appears as a finding, even when it is dead.
- A run from a collector older than its agent contributes nothing until you upgrade the collector.

Each of these makes the server miss a finding before it makes a false one. A missed finding costs you a look at the code. A false one costs you a deleted method that was in use.
