---
title: Quickstart
description: Run a collector and attach the agent to one service on your machine, then see the service and its first report in Otherlode.
order: 20
---

This quickstart connects one service on your machine to Otherlode, so you can see it work before you change a deployment. You start a collector in Docker, attach the agent to your service, and then find the service and its first report in Otherlode.

It isn't a production setup. To run the collector and the agent across your environments, such as on Kubernetes, follow [Deploy the collector](/docs/collector/deploy) and [Attach the agent](/docs/agent/attach), and plan the rollout with the team that runs your infrastructure.

## Before you start

You need these four things:

- A tenant on Otherlode, and the admin role in it. During early access, [request access](/early-access) to get one.
- Docker, to run the collector for this quickstart.
- A JVM service on JDK 17 or later that you can start from a shell.
- The package your own code lives in, such as `com.acme.shop`.

## Create an ingest key

The collector sends this key with everything it forwards, and the key names your tenant.

1. Sign in at `https://app.otherlode.dev` and open the menu under your tenant's name at the right of the top bar, then click **Admin**.
2. Open **API keys** and click **Create key**.
3. Enter a name, choose the scope **Ingest**, and create the key.
4. Copy the key. The page shows it only once.

## Start a collector

The collector receives what the agent sends and forwards it to Otherlode. Here it runs in Docker on the same machine as your service, so the agent finds it at its default address, `http://localhost:4319`.

Make a token for the agent to send to the collector. The agent reads `OTHERLODE_AUTH_TOKEN` and the collector reads `OTHERLODE_COLLECTOR_AUTH_TOKEN`, so give both the same value:

```bash
export OTHERLODE_AUTH_TOKEN=$(openssl rand -hex 32)
export OTHERLODE_COLLECTOR_AUTH_TOKEN=$OTHERLODE_AUTH_TOKEN
```

Then paste the ingest key from the last step. `read -s` keeps it off the screen and out of your shell history:

```bash
read -rs OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN && export OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN
```

Start the collector. An `-e` with a name and no value passes that variable from your shell, so neither secret appears on the command line:

```bash
docker run -d --name otherlode-collector \
	-p 4319:4319 \
	-e OTHERLODE_COLLECTOR_AUTH_TOKEN \
	-e OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN \
	-e OTHERLODE_COLLECTOR_FORWARD_URL=https://ingest.otherlode.dev \
	ghcr.io/otherlodehq/otherlode-collector:latest
```

Check that it's up. The health route answers `200`:

```bash
curl -i http://localhost:4319/healthz
```

`docker logs otherlode-collector` shows `otherlode-collector listening`. If it also shows `OTHERLODE_COLLECTOR_FORWARD_URL not set`, the forward address didn't reach the container. The collector then logs what it receives and forwards nothing.

Keep this shell open. You start your service from it in the next step, so the agent picks up `OTHERLODE_AUTH_TOKEN`.

## Attach the agent to your service

Download the agent jar from Maven Central:

```bash
curl -fLO https://repo1.maven.org/maven2/dev/otherlode/otherlode-agent/0.1.0/otherlode-agent-0.1.0.jar
```

Start your service with the `-javaagent` flag before `-jar`. Set `serviceName` to the name you want to see in Otherlode, and `includePackages` to your own code's package:

```bash
java \
	-javaagent:otherlode-agent-0.1.0.jar=serviceName=shop,includePackages=com.acme.shop \
	-jar shop.jar
```

To list more than one package, separate them with a semicolon, as in `includePackages=com.acme.shop;com.acme.billing`. If you start your service with Gradle, a Spring Boot fat jar or a container instead, [Attach the agent](/docs/agent/attach) shows the flag for each.

The agent writes its lines to stderr, and each starts with `otherlode:`. A healthy start prints one line that names the endpoint modules it installed:

```text
otherlode: installing endpoint modules: javalin-6, javalin-7, jaxrs, jdk-httpserver, ktor-2, ktor-3, micronaut, micronaut-3, servlet, spring-webflux, spring-webmvc, vertx-web
```

It also warns `otherlode: exportUrl uses plain http, so the auth token is sent unencrypted`. The token goes no further than `localhost` here, so you can ignore it on your own machine.

If the agent prints `includePackages is not set`, the option is missing or empty and the agent instruments nothing. When it can find your main class, the line suggests a package to use. [Choose includePackages](/docs/agent/attach#choose-includepackages) covers the option.

## See the service in Otherlode

The agent sends a batch every 60 seconds, even when nothing ran, so your service shows within about a minute of startup.

Open `https://app.otherlode.dev`. The **Services** page opens first and lists your service under the `serviceName` you set, with its instance count, **Last seen** and **Watched for**. Until a service reports, the page says "No service has reported yet."

If the service doesn't appear, read `docker logs otherlode-collector`. A line that starts with `dropping payload` ends with the status Otherlode returned, and [Send data from your collector](/docs/server/connect#read-what-ingest-answers) says what each status means.

Now use your service for a while, the way its users do. Call its endpoints and run its jobs, so the agent counts the code that runs.

## Read the first report

Click your service to open its Overview. The panel lists the findings, each with a count, such as **Never hit** for methods and condition paths that never ran and **Never called** for endpoints that received no request.

A new service has no report until the next refresh computes it, and until then the Overview says "Computing…". After that, the report trails the data by up to about 20 minutes, so a call you just made can take that long to leave **Never hit**.

A finding is a lead to check, not proof. It covers only the time the agent watched, so code that runs once a week reads as never hit until it runs. The top bar shows how long the service has been watched, in amber for its first 30 days. [How Otherlode fits together](/docs/start/overview#a-finding-is-a-lead-to-check) explains how to read a finding.

## Next steps

- To run the collector in production, behind TLS or on Kubernetes, see [Deploy the collector](/docs/collector/deploy).
- To label runs as production, staging or test, see [Scope and environments](/docs/server/scope).
- To replace the string literals in conditions before they leave your network, see [Blank out string literals](/docs/collector/redaction).
- To assert which methods, endpoints and classes your tests ran, see [Test your app against the agent](/docs/agent/testkit).
- To learn what each finding claims and needs, see [Findings](/docs/server/findings).
