---
title: Quickstart
description: Attach the agent to one service on your machine, send straight to Otherlode with an ingest key, then see the service and its first report.
order: 20
---

This quickstart connects one service on your machine to Otherlode, so you can see it work before you change a deployment. You create an ingest key, attach the agent to your service with that key, and then find the service and its first report in Otherlode.

It isn't a production setup. In production you can put a collector between your agents and Otherlode. It blanks string literals before they leave your network, it's the one place that holds the ingest key, and it's the only host that needs a route to the internet. [Add a collector](/docs/collector/add) says when you need one.

## Before you start

You need these four things:

- A tenant on Otherlode, and the admin role in it. During early access, [request access](/early-access) to get one.
- A JVM service on JDK 17 or later that you can start from a shell, on a machine that can reach `https://ingest.otherlode.dev`.
- The package your own code lives in, such as `com.acme.shop`.
- `curl`, to download the agent.

## Create an ingest key

The agent sends this key with everything it sends, and the key names your tenant.

1. Sign in at `https://app.otherlode.dev`, open the tenant menu in the top bar, then click **Admin**.
2. Open **API keys** and click **Create key**.
3. Enter a name for this machine, such as `quickstart-laptop`, choose the scope **Ingest**, and create the key. A key per machine or deployment lets you revoke one without the others.
4. Copy the key. The page shows it only once.

## Attach the agent to your service

Download the agent jar from Maven Central:

```bash
curl -fLO https://repo1.maven.org/maven2/dev/otherlode/otherlode-agent/0.1.0/otherlode-agent-0.1.0.jar
```

Paste the ingest key from the last step. The agent reads it from `OTHERLODE_AUTH_TOKEN`, and `read -s` keeps it off the screen and out of your shell history:

```bash
read -rs OTHERLODE_AUTH_TOKEN && export OTHERLODE_AUTH_TOKEN
```

Start your service from the same shell, with the `-javaagent` flag before `-jar`. Set `serviceName` to the name you want to see in Otherlode, `includePackages` to your own code's package, `environment` to a name for where it runs, and `exportUrl` to Otherlode's ingest address:

```bash
java \
	-javaagent:otherlode-agent-0.1.0.jar=serviceName=shop,includePackages=com.acme.shop,environment=local,exportUrl=https://ingest.otherlode.dev \
	-jar shop.jar
```

To list more than one package, separate them with a semicolon, as in `includePackages=com.acme.shop;com.acme.billing`. If you start your service with Gradle, a Spring Boot fat jar or a container instead, [Attach the agent](/docs/agent/attach) shows the flag for each.

The agent writes to stderr through the JVM's logger. Each message starts with `otherlode:`, and the logger puts its level in front, as in `INFO: otherlode:`, below a line with the time and the class that logged it. A healthy start prints one message that names the endpoint modules it installed:

```text
otherlode: installing endpoint modules: javalin-6, javalin-7, jaxrs, jdk-httpserver, ktor-2, ktor-3, micronaut, micronaut-3, servlet, spring-webflux, spring-webmvc, vertx-web
```

A HotSpot JVM prints its own line, `Sharing is only supported for boot loader classes because bootstrap classpath has been appended`, which is harmless. See [The CDS warning](/docs/agent/compatibility#the-cds-warning).

If the agent prints `includePackages is not set`, the option is missing or empty and the agent instruments nothing. When it can find your main class, the line suggests a package to use. [Choose includePackages](/docs/agent/attach#choose-includepackages) covers the option.

## See the service in Otherlode

The agent sends a batch every 60 seconds, even when nothing ran, so your service shows within about a minute of startup.

Open `https://app.otherlode.dev`. The **Services** page opens first and lists your service under the `serviceName` you set, with its instance count, **Last seen** and **Watched for**. Until a service reports, the page says "No service has reported yet."

If the service doesn't appear, read the agent's log. A `WARNING` such as `delta export failed, will retry next flush` has the status ingest answered on the line after it, as in `unexpected status 401`. [Read what ingest answers](/docs/server/connect#read-what-ingest-answers) says what each status means.

Now use your service for a while, the way its users do. Call its endpoints and run its jobs, so the agent counts the code that runs.

## Read the first report

Click your service to open its Overview. The panel lists the findings, each with a count, such as **Never hit** for methods and condition paths that never ran and **Never called** for endpoints that received no request.

A new service has no report until the next refresh computes it, and until then the Overview says "Computing…". After that, the report trails the data by up to about 6 hours on the free plan, and about 20 minutes on the Team and Enterprise plans. So a call you just made can take that long to leave **Never hit**.

A finding is a lead to check, not proof. It covers only the time the agent watched, so code that runs once a week reads as never hit until it runs. The top bar shows how long the service has been watched, in amber for its first 30 days. [How Otherlode fits together](/docs/start/overview#a-finding-is-a-lead-to-check) explains how to read a finding.

## Next steps

- To blank string literals before they leave your network, keep the ingest key out of your JVMs, or send from hosts with no route to the internet, see [Add a collector](/docs/collector/add).
- To label runs as production, staging or test, see [Scope and environments](/docs/server/scope).
- To attach the agent across your deployments, such as on Kubernetes, see [Attach the agent](/docs/agent/attach).
- To assert which methods, endpoints and classes your tests ran, see [Test your app against the agent](/docs/agent/testkit).
- To learn what each finding claims and needs, see [Findings](/docs/server/findings).
