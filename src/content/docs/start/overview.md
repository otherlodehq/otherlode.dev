---
title: How Otherlode fits together
description: What Otherlode finds, the three parts that find it and where each one runs, what leaves your network, and which page to read next.
order: 10
---

Otherlode finds the code in your Java, Kotlin and Scala services that never runs in production. It counts what runs in every instance of a service, then shows you the code that none of them ran.

## What it finds

Each finding names a piece of code and says what did not happen to it in the runs you choose. The main kinds are these:

- **Never hit**: a method, or one path of a condition, that never ran.
- **Never called**: an endpoint that received no request.
- **Never supplied**: an optional parameter whose callers always take the default.
- **Never loaded**, **Never initialised** and **Never instantiated**: a class that no instance loaded, used or created.
- **Stale**: code that ran once and then stopped.
- **Unused dependencies**: a library that shows no live use.
- **Unreached clusters**: never-hit methods grouped under the one root that leads to them, so that deleting the root frees all of them.

[Findings](/docs/server/findings) describes every kind, what it claims and what it needs.

## Three parts, and where each one runs

Otherlode has three parts. Two of them run on your machines.

- **The agent** runs inside each of your JVMs. You attach it with `-javaagent`. It counts how often each method runs, which way each condition goes and how often each endpoint is called, and it sends those counts to your collector.
- **The collector** runs in your network. It receives what your agents send and forwards it to Otherlode. It can replace the string literals in branch conditions and switch case labels with a placeholder before anything leaves.
- **Otherlode** is hosted. It stores each run, adds up the counts from every instance and works out the findings. You read them in the web app or through the [read API](/docs/server/api).

The agent and the collector are open source under the Apache 2.0 licence, at [otherlode-agent](https://github.com/otherlodehq/otherlode-agent) and [otherlode-collector](https://github.com/otherlodehq/otherlode-collector) on GitHub.

## The collector decides what leaves your network

Your agents send their reports to your collector, and the collector forwards them to Otherlode with an ingest key. The collector is the one place that holds the key, and it is where you turn on blanking. [Send data from your collector](/docs/server/connect) sets up the key and the forward address.

Otherlode keeps what the collector forwards in Google Cloud's London region. [What the server keeps](/docs/server/data-kept) lists what it stores and when it deletes it, and the [privacy policy](/privacy) covers the personal data.

## A finding is a lead to check

A finding says that code did not run in the processes the agents watched, over the time they watched them. It does not say that the code cannot run. A job that runs once a quarter, a failover path or a handler for a rare error reads as unused until the day it runs.

So read a finding together with how long the service has been watched and which environments reported. [Dates](/docs/server/dates) shows both. [How findings are judged](/docs/server/how-it-works) explains how far to trust a finding and why.

## Next steps

- To connect a collector that already runs, see [Send data from your collector](/docs/server/connect).
- To choose which runs a finding covers, see [Scope and environments](/docs/server/scope).
- To read what Otherlode found, see [Findings](/docs/server/findings).
- To add people and sign-in, see [Manage users and roles](/docs/server/users) and [Set up single sign-on](/docs/server/sso).
