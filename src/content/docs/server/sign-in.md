---
title: Sign-in and sessions
description: How people sign in to the web UI, who can sign in, when the tenant picker appears, every way a session ends, and what each sign-in error message means.
order: 20
---

People sign in to the web UI at `https://app.otherlode.dev`. An API key never signs anyone in, and a browser session never delivers ingest data. [Manage API keys](api-keys) covers keys.

## Sign-in methods

The sign-in page shows one button, **Sign in**. It sends the browser to WorkOS AuthKit, which proves who you are and sends you back. The server accepts four ways to sign in:

| Method | Works for |
|---|---|
| Google | A tenant that does not enforce single sign-on. |
| Microsoft | A tenant that does not enforce single sign-on. |
| GitHub | A tenant that does not enforce single sign-on. |
| Single sign-on | A tenant with its own SSO connection. |

There are no passwords, magic links, or passkeys. If AuthKit reports any other method, the server refuses the sign-in with the message for `method_not_allowed` below.

A tenant that enforces SSO accepts only a sign-in through its own SSO connection. [Set up single sign-on](sso) explains how an admin connects an identity provider, verifies a domain, and enforces SSO.

After a sign-in, you land on the page you were trying to open. If that page is not on the web UI's own origin, you land on the service list.

Every sign-in asks AuthKit for a fresh sign-in. A leftover AuthKit session never signs you in without a prompt, including right after you sign out.

## You need a user first

Nobody can create a tenant for themselves, and a sign-in creates no user in an existing tenant by default. An admin of the tenant adds your email first, with a role of admin or viewer. See [Manage users and roles](users).

The server matches a sign-in to a user in two steps:

1. The first time you sign in, the server matches your email to a user without a bound identity. The match ignores case. It counts only when the provider verified the email. The server then binds your provider identity to that user.
2. Every later sign-in matches on the bound identity. A changed email at your provider does not lock you out.

A user belongs to one tenant. The same person in two tenants is two users, and each tenant holds its own role for that person.

A tenant can turn on just-in-time provisioning. Then a person who signs in through the tenant's SSO connection with a verified email on one of its verified domains gets a viewer user at that sign-in. No other sign-in creates a user. See [Set up single sign-on](sso).

## The tenant picker

When one tenant can take your sign-in, you go straight into it. When more than one can, the page **Choose a tenant** lists them by name and says "You can reach more than one tenant. Choose one for this session." Each name is a button.

A tenant is on the list when both of these hold:

- You have a user there, either already bound to your provider identity or matched by your verified email.
- Your sign-in meets the tenant's SSO rule.

So the picker never lists a tenant that enforces SSO when you signed in with Google, Microsoft, or GitHub. If that leaves one tenant, you go straight into it. A sign-in through SSO never shows the picker, because it reaches only the tenant linked to the connection it came through.

The choice is for this session only. A later sign-in can show the picker again, and nothing binds you to the tenant you chose. The choice stays open for 5 minutes and works once. After you pick, the server also discards any other open choice for your identity, such as one on another device.

If the choice has expired, the page shows "This choice expired. Sign in again." with a **Back to sign in** link. If the list cannot load, it shows "The tenants could not be loaded. Try again in a moment."

## How a session ends

A session is your signed-in browser. The server holds it, and the browser keeps a cookie with a random token. The cookie is HttpOnly, SameSite=Lax, and named `__Host-otherlode_session`.

Two limits end a session by time:

| Limit | Value | Counted from |
|---|---|---|
| Idle limit | 7 days | The session's last use. |
| Maximum age | 30 days | The sign-in. Use never extends it. |

The first limit reached ends the session. The server records a use at most once every 5 minutes, so a session can end up to 5 minutes before the 7 days are complete.

These events end a session before its limits:

- You sign out. See [Sign out](#sign-out).
- An admin deletes your user. It ends every session of that user at once.
- Directory sync removes or suspends you at your identity provider. The server deletes your user at its next daily sync run, which ends your sessions. Without directory sync, removing you at the provider ends nothing here, and your session lasts until one of its limits. An admin must delete the user. See [Manage users and roles](users).
- An admin enforces SSO for the tenant. Every session not made through SSO ends at that moment. An admin can enforce SSO only from a session made through SSO, so that admin stays signed in.
- The tenant's SSO organization is unlinked. Every session made through SSO ends, because the old identity provider made it.
- An operator deletes the tenant. Every session of the tenant ends.

When a session ends, the next request from the browser is refused, and the web UI sends you to the sign-in page with no message. Sign in again. A changed role takes effect on the existing session without a new sign-in.

The server deletes ended sessions and expired tenant choices within a day of their end. [What the server keeps](data-kept) lists what is stored.

## Sign out

Your email, tenant, and role show in the top bar, next to **Sign out**. The button ends the session in this browser and returns you to the sign-in page. Sessions on other browsers or devices stay open. It does not sign you out of Google, Microsoft, GitHub, or your company's identity provider.

If the request fails, the page stays where it is and shows "Sign-out failed, so you are still signed in. Try again."

Sign-ins, failed sign-ins, and sign-outs appear in the tenant's audit log. See [Audit log](audit-log).

## Messages on the sign-in page

A failed sign-in returns you to the sign-in page with a message in red above the **Sign in** button. The address carries the message's code, such as `/login?error=expired`.

| Code | Message | Cause |
|---|---|---|
| `expired` | "The sign-in attempt expired. Try again." | The browser sent no record of a sign-in in progress. Cookies are blocked, the sign-in finished in a different browser than it started in, or more than 10 minutes passed. The picker also gives this code when its choice expired, was used already, or did not hold the tenant. |
| `state` | "The sign-in response did not match this browser. Try again." | The response from AuthKit did not match the sign-in that this browser started. |
| `denied` | "Sign-in was cancelled." | AuthKit or the provider returned an error, for example because you declined at the provider. |
| `unavailable` | "Sign-in could not be completed. Try again in a moment." | WorkOS did not complete the sign-in, or the server failed to look up your user or start the session. |
| `no_account` | "That account is not set up here. An admin or an operator must add your email before you can sign in. If you could sign in here before, ask an admin to delete your user and add it again." | No tenant has a user for you. See the causes below. |
| `sso_required` | "Your organization requires single sign-on. Sign in again through your company's single sign-on. If you do not see it, ask your admin." | Your email matches a user only in tenants that enforce SSO, and you did not sign in through SSO. |
| `impersonated` | "Impersonated sign-ins are not accepted here." | WorkOS marked the sign-in as made on someone else's behalf. |
| `method_not_allowed` | "That way of signing in is not accepted here. Sign in with Google, Microsoft, GitHub or your company's single sign-on." | The sign-in used a method other than the four above. |
| `organization_choice` | "Your sign-in needed one of your organizations picked, and it could not be finished here. Ask your admin for help." | AuthKit required you to pick an organization and the server could not finish the sign-in, or an SSO sign-in needed that pick. |

Any other code shows "Sign-in failed."

### Causes of the no_account message

- No user has your email. Ask an admin to add it. The email must be the one your provider reports, and the provider must have verified it. A sign-in with an unverified email reaches only a user already bound to your identity.
- Your user is bound to an earlier identity. This happens when your identity at the provider was deleted and recreated, so the sign-in now carries a new identity. The user keeps the old binding and never matches again. An admin deletes the user and adds the email again, which clears the binding.
- You signed in through an SSO connection that no tenant is linked to, or that the tenant has since been unlinked from.
- The tenant is being deleted.
- Just-in-time provisioning is off, or your email is not on one of the tenant's verified domains, and you have no user.

### Causes of the sso_required message

A tenant that enforces SSO never takes a sign-in through Google, Microsoft, or GitHub. Choose single sign-on on AuthKit's page instead, and enter your company email. If AuthKit does not offer your company's connection, the tenant's admin must check the SSO connection and the verified domain. A user whose email is on no verified domain cannot sign in once SSO is enforced. See [Set up single sign-on](sso).
