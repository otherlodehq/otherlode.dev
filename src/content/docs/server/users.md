---
title: Manage users and roles
description: Add users, change their roles, delete them, and know what the last-admin rule and directory sync do to a tenant's users.
order: 30
---

A user is a person who signs in to the web UI at `https://app.otherlode.dev`. Every user has one role, and an admin manages the users on the **Users** page. This guide covers that page. [Sign-in and sessions](sign-in) covers how a user signs in.

## Know what each role can do

A user is an admin or a viewer.

- A viewer reads everything the tenant holds and changes nothing.
- An admin does the same, and also manages the tenant's users, its API keys, its single sign-on connection, and reads its audit log.

Only an admin sees the **Admin** link in the top bar. A viewer who opens an admin page sees "Only admins can see this page." The admin routes also refuse every request that does not come from an admin's browser session, so an API key cannot call them.

An email names at most one user in a tenant. The same person in two tenants is two users, each with its own role. Adding someone to your tenant never changes their access to another tenant.

## Open the Users page

Click **Admin** in the top bar. The **Users** page opens first. It lists the tenant's users by email, with these columns:

| Column | Shows |
|---|---|
| **Email** | The user's email. Your own row adds "(you)". |
| **Role** | **Viewer** or **Admin**, as a select you can change. |
| **Signed in** | "Yes" once the user has signed in at least once, otherwise "Not yet". |
| **Last login** | When the user last signed in. |
| **Added** | When the user was added. |

## Add a user

To let a person sign in, add their email to the tenant.

1. Click **Add user**.
2. Enter the person's **Email**.
3. Pick a **Role**. The sheet starts on **Viewer**.
4. Click **Add user**.

The person signs in with that email. The sheet rejects an email that is not an address such as `name@example.com`. An address can have at most 254 characters and cannot contain a space or a hidden character, such as a zero-width space. The page trims spaces around the email.

If the tenant already has a user with that email, the sheet shows "a user with this email already exists". The comparison ignores case. The message never says whether the email names a user in another tenant, and a user in another tenant does not stop you.

A tenant that turns on [just-in-time provisioning](sso) also gives a viewer to a person you did not add, at their first single sign-on login.

## Change a user's role

Pick the other role in the user's **Role** select. The change applies at once, also to a session that is already open. Picking the role a user already has changes nothing.

If you pick **Viewer** on your own row, a sheet titled "Make yourself a viewer" asks first. It warns that you lose the admin pages at once and that only another admin can make you an admin again. Click **Make me a viewer** to confirm, or **Cancel**.

## Delete a user

Click **Delete** on the user's row, then **Delete user** in the confirmation sheet. The sheet says "Their sessions end at once. You can add them again later."

The user's sessions end when you confirm, so the person is signed out of every browser. Their next request is refused.

If you delete your own user, the sheet says you are signed out at once and cannot sign in again unless an admin adds you back. After you confirm, the UI sends you to the login page.

## Keep at least one admin

A tenant always keeps one admin. The server refuses to make the last admin a viewer and refuses to delete the last admin. Both refusals show this message in the sheet or under the role select:

```text
this is the tenant's last admin; make another user an admin first
```

To change your own role or delete your own user when you are the only admin, first give another user the **Admin** role.

The rule covers changes made on this page. Directory sync is not stopped by it. If your directory removes the last admin, the tenant is left with no admin, and an operator has to add one. Email [support@otherlode.dev](mailto:support@otherlode.dev) to ask for it.

## What directory sync does to users

If your tenant uses directory sync, your identity provider tells the server when a person leaves, is suspended, or changes email. The server applies each change to the user with that email. A scheduled job reads these events once a day, so a change takes effect at the next run and not at the moment you make it in your directory. [Set up single sign-on](sso) covers turning directory sync on.

- **A person is deleted or suspended.** The server deletes the user, even when it is the tenant's last admin, and their sessions end. The match uses any email the directory holds for that person, and ignores case.
- **A person changes email.** The user keeps its role and takes the new email. If another user of the tenant already has the new email, nothing changes.
- **A removal event is older than the user.** If you added the person back more than a minute after the event, the server skips the removal. Inside that minute the deletion goes ahead.

Without directory sync, removing a person at your identity provider does nothing here until their session ends. Delete their user on the **Users** page to end it at once.

## Find who changed a user

The audit log records every user added, deleted, or given a new role, and each session a deletion ends. It names the admin, directory sync, or operator who did it. See [Audit log](audit-log).
