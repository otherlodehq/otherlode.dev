---
title: Manage API keys
description: Create an ingest or read key, copy its plaintext before the sheet closes, read the key list, revoke a key, and replace a key without a gap.
order: 40
---

An API key identifies your tenant to Otherlode. Only an admin can create or revoke a key. Open Otherlode at `https://app.otherlode.dev`, open the tenant menu in the top bar, choose **Admin**, then **API keys**. A viewer who opens the page sees "Only admins can see this page."

## Pick a scope

A key has exactly one scope. You choose it when you create the key, and you cannot change it afterward.

| Scope | Use it for | Where the key goes |
|---|---|---|
| `ingest` | A collector that forwards what your agents report. It cannot read anything back. | The collector's forward token. See [Send data from your collector](connect). |
| `read` | A script or a tool that calls the read API. It cannot send reports. | The `Authorization: Bearer` header of each call. See [Read API](api). |

A route refuses a key of the other scope with `403`. Ingest answers "this route needs an ingest key", and the read API answers "this route needs a read key". Use a separate key for each collector, script, or CI job, so that you can revoke one without touching the others.

## Create a key

To create a key, follow these steps.

1. On the **API keys** page, click **Create key**.
2. Enter a **Name**.
3. Choose a **Scope**, **Ingest** or **Read**.
4. Click **Create key**.

The sheet then shows the new key's plaintext, once.

Click **Copy**, and put the key where it belongs before you click **Done**. If the browser refuses to copy, click the key to select all of it, then copy it yourself.

Otherlode stores only a hash of the key. It cannot show the plaintext again, to you or to an operator. Closing the sheet clears the key from your browser as well.

### Choose a name

A name tells you what a key is for, such as `shop-collector` or `ci-report`. The name has these rules:

- It has 1 to 64 characters after Otherlode trims spaces from both ends.
- It has no slash, control character, or invisible character.
- It is not `.` or `..`.
- No other live key of your tenant has it. The comparison is case-sensitive, so `Shop` and `shop` are two names.

When a rule fails, the sheet shows Otherlode's message. A taken name gives "a live key already has this name; revoke it or choose another name". A revoked key does not hold its name, so you can reuse it.

### If you lose the plaintext

If you did not copy the key, nothing can show it again. Revoke it and create another. If the browser reloads, goes back, or closes while the sheet waits for Otherlode, the key can exist without you having seen it. It then shows in the list as live.

## Read the key list

The page lists your live keys, newest first.

A key made by Otherlode has the form `otl_` followed by random characters, and its prefix is `otl_` plus the next 8 characters. Compare a key in a config file or a log with the list by its prefix. The prefix is not enough to use the key.

Revoked keys stay out of the table until you click **Show revoked keys (N)**, which lists them after the live keys.

## Revoke a key

To revoke a key, click **Revoke** in its row, then **Revoke key** to confirm. **Cancel** has the focus when the sheet opens, so pressing Enter does not revoke.

After you confirm, Otherlode rejects the key on its next request. It checks every request against the current list, so no delay applies. A collector that forwards with a revoked ingest key gets `401`, the same answer as for a key that never existed. A script that calls the read API with a revoked read key gets the same `401`.

A revoked key cannot be restored. To give a collector or script access again, create a new key. The new key has a new value, so replace the old value wherever it was used.

The key stays in the list as revoked, and its name is free again. If you create a new key under the same name, two rows share the name. Tell them apart by the prefix and the **Created** time. The **Revoke** sheet names a key by its name and prefix together. If you open the sheet for an old row and a newer live key has taken the name, Otherlode answers "the live key with this name is a newer key than the one shown; reload the list" and revokes nothing.

## Replace a key without a gap

Your tenant can hold more than one live key of a scope, so a new key can work beside the old one. To replace a collector's ingest key without losing reports, follow these steps.

1. Create a new `ingest` key with a name that no live key has, such as `shop-collector-2`.
2. Put the new key in the collector's forward token and restart the collector. If you set `OTHERLODE_COLLECTOR_FORWARD_AUTH_TOKEN_FILE`, the collector reads the file again every 30 seconds and sends the new key from the next request on, with no restart.
3. Confirm that the collector delivers with the new key. See [Send data from your collector](connect).
4. Revoke the old key.

Replace a `read` key the same way. Update each script that calls the API, then revoke the old key.

## Audit events

Each key you create or revoke is recorded in your tenant's audit log. See [Audit log](audit-log).
