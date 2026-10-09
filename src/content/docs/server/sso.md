---
title: Set up single sign-on
description: Connect your identity provider through the Admin Portal, verify your email domain, enforce SSO, and turn on just-in-time provisioning.
order: 50
---

Single sign-on lets your people sign in to `https://app.otherlode.dev` through your company's identity provider, such as Okta or Entra, over SAML or OIDC. You set it up on the **Single sign-on** page, which only an admin sees. The page is in the admin area, beside **Users**, **API keys**, and **Audit log**.

A tenant that does not enforce SSO still signs in with Google, Microsoft, or GitHub. See [Sign-in and sessions](sign-in) for every sign-in method.

## Before you start

You need three things:

- An admin user in the tenant. A viewer sees only the message "Only admins can see this page."
- Access to your identity provider's admin console, to create the connection.
- Access to your domain's DNS settings, to add a record that proves you own your email domain. Without it you cannot enforce SSO.

You do not need an operator to set anything up first. A tenant that has never used SSO shows "Not set up yet. Setting up SSO links this tenant to a WorkOS organization." Your first click on any **Set up** or **Verify** button on the page creates that link for you.

## Set up an SSO connection

The three buttons on the page open WorkOS's Admin Portal in a new tab. WorkOS runs the portal, and its screens guide you through your identity provider. The page itself only shows the result.

1. Open **Single sign-on** in the admin area.
2. In the **SSO connections** card, click **Set up SSO**.
3. Follow the Admin Portal's steps for your identity provider.
4. Return to the Otherlode tab. The portal sends you back to the **Single sign-on** page.

The connection appears in the table with its name, its type, and its state. The state **active** means people can use it. A state such as **draft**, **pending**, or **validating** means the setup is not finished.

If your browser blocks the new tab, the page shows the link under the button instead: "The browser blocked the new tab." Open the link within five minutes. A portal link works once and expires after five minutes, so click the button again for a new one.

## Verify a domain

A verified domain is an email domain that your tenant proved it owns through a DNS record. AuthKit, the sign-in page, uses it to send a person who types an email on that domain to your SSO connection.

1. In the **Verified domains** card, click **Verify a domain**.
2. Enter your domain in the Admin Portal, and add the DNS record it shows you.
3. Return to the **Single sign-on** page.

When the page loads, and when you switch back to its tab, it asks WorkOS which domains are verified and copies them to your tenant. The **Domains** table then lists each domain in four columns.

| Column | What it shows |
|---|---|
| **Domain** | The domain name. |
| **Here** | "verified" with a date once your tenant holds the domain, or "not added". |
| **At WorkOS** | The domain's state at WorkOS, or "not listed". |
| **Difference** | How the two disagree: "verified at WorkOS, not added here yet", "no longer verified through DNS at WorkOS", or "none". |

Only DNS verification counts. A domain that someone marked verified by hand in WorkOS shows "by hand, which does not count" and is never added to your tenant.

### A domain another tenant holds

A domain belongs to one tenant. If WorkOS verifies a domain for your organization that another tenant already holds, the page does not add it. The **Difference** column shows "held by another tenant", and an alert says that WorkOS verified the domain for your organization, but another tenant holds it. While the other tenant holds it, your tenant does not store the domain. Your users with an email on it appear in the list of people who will be locked out, and just-in-time provisioning creates no user for it.

## Set up directory sync

Directory sync is optional. In the **Directory sync** card, click **Set up directory sync** and follow the Admin Portal's steps. The **Directories** table shows each directory with its name, type, and state.

When your directory removes or suspends someone, their user here is deleted and their sessions end. [Manage users and roles](users) explains what directory sync does to users.

## Enforce SSO

When SSO is enforced, people sign in only through your tenant's SSO connection. Google, Microsoft, and GitHub no longer work for your tenant, and the tenant picker never lists it.

The **Enforce SSO** button is disabled until three conditions hold:

1. **The organization has an active SSO connection.** Without one, nobody could sign in.
2. **The organization has a domain verified through DNS.** AuthKit sends a person to your SSO only by an email on a verified domain.
3. **You are signed in through your SSO.** The page says "You signed in without SSO. Sign out, then sign in again through your company's SSO to enforce it." This proves that SSO works and that you can still sign in once it is enforced.

While a condition is missing, the page says "Still needed:" and names what is missing. The server checks all three again when you confirm, so a connection that went inactive in between stops the change.

To satisfy the third condition, sign out and sign in again with your company email, so AuthKit sends you to your SSO connection. Your user's email must be on a verified domain for that to work.

### People who will be locked out

Before you confirm, check the list under **Enforce SSO**. It shows each user whose email is on none of your verified domains, with their role. The page says these users "will not be able to sign in once SSO is enforced". AuthKit never sends them to your SSO, and no other sign-in method works for them.

To keep them, verify a domain that covers their emails first. You can also delete their users, or accept that they cannot sign in until you stop enforcing SSO.

### What happens to existing sessions

Click **Enforce SSO**, then confirm in the sheet. Every session not made through SSO ends at once. Your own session stays, because it was made through SSO. Everyone else signs in again through your SSO connection. If someone tries another method, the login page shows "Your organization requires single sign-on. Sign in again through your company's single sign-on. If you do not see it, ask your admin."

If the connection later becomes inactive, or the last verified domain stops verifying, the page shows a warning. While SSO is enforced and the organization has no active connection, nobody can sign in. Fix the connection in the Admin Portal, or stop enforcing SSO.

## Stop enforcing SSO

Click **Stop enforcing SSO** and confirm. Stopping is always allowed, and it needs no SSO session. People can sign in with Google, Microsoft, or GitHub again. Existing sessions stay. Just-in-time provisioning turns off too, because it needs SSO enforced.

## Provision users just in time

Just-in-time provisioning creates a user at an SSO login, so you do not add each person on the **Users** page first.

When it is on, a person gets a viewer user at sign-in if all of these hold:

- They sign in through your SSO connection.
- WorkOS verified their email.
- Their email is on one of your verified domains, exactly. A subdomain of a verified domain does not count.
- They have no user in your tenant yet.

The user always has the role viewer. Change the role on the **Users** page afterward if the person needs to be an admin. A sign-in through Google, Microsoft, or GitHub never creates a user.

To turn it on, click **Turn on just-in-time provisioning**. The button works only while SSO is enforced. Otherwise the server answers "just-in-time provisioning needs SSO enforced first". To turn it off, click **Turn off just-in-time provisioning**. People who already have a user keep it.

## Check what changed

The [audit log](audit-log) records each Admin Portal link you open, each change to enforcement and provisioning, and each user created just in time.
