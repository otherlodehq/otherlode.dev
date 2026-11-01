---
title: Require redacted payloads
description: Make ingest refuse every payload that did not come through a collector with redaction on and your secret, find the fingerprint it checks, read the refusals, and know what it does not stop.
order: 55
---

Your collector can blank string literals before a payload leaves your network, and re-key branch and site keys under a secret only it holds. See [Blank out string literals](/docs/collector/redaction). An agent that sends straight to `https://ingest.otherlode.dev` skips the collector. Its payloads carry string literals as your code holds them, and plain keys that undo the re-keying. That usually happens by mistake, such as a test or staging JVM set up in a hurry.

The **Require redacted payloads** setting makes ingest refuse those payloads. While it is on, ingest stores a payload only when it carries the fingerprint of your collector's secret. The setting is off by default. Only an admin can change it, on the **Redaction** page in the admin area.

The setting catches a mistake, not a deliberate bypass. The fingerprint travels in a plain HTTP header, so anyone who holds one of your ingest keys can copy it into a request. Otherlode does not look inside the payload either. It trusts the collector to have blanked what its settings name.

## Before you start

- Every collector that sends to your tenant needs redaction on with the same secret. That includes the collector your test runs go through. A collector with redaction off, or with another secret, has every payload refused once the setting is on.
- A collector with redaction on sends its fingerprint on every forward, in the `Otherlode-Redaction` header. A collector with redaction off sends no header.
- You need an admin user in the tenant. A viewer who opens the page sees "Only admins can see this page."

## Find the fingerprint

The fingerprint is 16 lowercase hex characters that name your collector's secret without revealing it, such as `3f9a0c27b51e84d6`. The collector logs it once at startup, in the field `secret_fingerprint` of the line that says redaction is on.

Check the line on each collector. Two collectors with the same secret log the same fingerprint. If two collectors log different fingerprints, give them the same secret before you go on, or the one that does not match has its payloads refused.

## Turn the requirement on

1. Sign in at `https://app.otherlode.dev` and open the tenant menu in the top bar, then click **Admin**.
2. Open **Redaction**.
3. Paste the fingerprint into **Fingerprint**. The page trims spaces around it.
4. Click **Require redacted payloads**, then confirm in the sheet.

The page then reads **Require redacted payloads: on** and shows the fingerprint. Every Otherlode process applies the change within about 15 seconds. A fingerprint that is not 16 lowercase hex characters is refused with "Fingerprint must be 16 lowercase hexadecimal characters, the secret_fingerprint the collector logs at startup."

### Data already stored stays as it is

Turning the requirement on changes nothing Otherlode already holds. Runs that arrived without redaction keep their literals and plain keys until they pass your tenant's retention period. To remove them sooner, ask an operator. See [What an operator removes on request](data-kept#what-an-operator-removes-on-request).

## Change the fingerprint

Change the fingerprint when you change the collector's secret. While the requirement is on, open **Redaction**, paste the new value into **New fingerprint**, click **Change the fingerprint** and confirm.

Ingest checks one fingerprint at a time. Payloads from a collector that still has the old secret are refused once the new fingerprint applies, and a collector with the new secret is refused until then. The collector drops a refused payload and never sends it again. To change the secret without losing payloads, stop requiring redacted payloads first, change the secret on every collector, then turn the requirement on again with the new fingerprint.

## Stop requiring redacted payloads

Open **Redaction**, click **Stop requiring redacted payloads** and confirm. Ingest then accepts payloads with or without the header, and ignores the header. Otherlode clears the fingerprint, so turning the requirement on again asks for it again.

## Read the refused payloads

The **Refused payloads** table on the **Redaction** page has one row for each reason:

| Row | Reason | Cause |
|---|---|---|
| **No fingerprint, or a malformed one** | `redaction_required` | The payload had no `Otherlode-Redaction` header, more than one, or a value that is not 16 lowercase hex characters. The sender is a collector with redaction off, or an agent that sends straight to ingest. |
| **Another secret's fingerprint** | `redaction_secret_mismatch` | The payload came through a collector with redaction on and a different secret. |

**Last 7 days** counts the payloads refused on the last 7 UTC dates, today included. The counts can trail ingest by about 10 seconds.

When ingest refused anything in the last 24 hours, the **Services** page and each service's overview tell admins so.

Otherlode keeps only these counts. It keeps nothing from a refused payload or its request: no service, instance, address or key. So the table cannot name the sender. To find it, read the logs on your side, as the next section describes. [What Otherlode keeps](data-kept#what-otherlode-keeps-about-refused-payloads) says how long the counts stay.

## What a refused payload looks like

Ingest answers a refused payload with `403` and a JSON body that names the reason, `{"error":"redaction_required"}` or `{"error":"redaction_secret_mismatch"}`. It never reads or stores the payload. The audit log records no event for a refusal.

- **From a collector.** The collector drops the payload at once and logs a `WARN` line with `dropping payload: permanent failure`. Its `error` field reads `backend returned 403 Forbidden`, its `backend_error` field names the reason, `redaction_required` or `redaction_secret_mismatch`, and its `service` and `instance` fields name the agent that sent the payload. See [backend returned 403](troubleshooting#backend-returned-403).
- **From an agent that sends straight to ingest.** The agent keeps the payload, sends it again at its next flush, and logs a `WARNING` each time. Point the agent at your collector to stop the refusals.

## Check what changed

The [audit log](audit-log) records each change to the requirement. **Redaction requirement changed** names the change as `off → on` with the fingerprint, or `on → off`. **Redaction fingerprint changed** names the old and new fingerprints.
