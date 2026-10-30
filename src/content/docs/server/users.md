---
title: Manage users and roles
description: Add users, change their roles, delete them, and know what the last-admin rule and directory sync do to a tenant's users.
order: 30
---

A user is a person who signs in to Otherlode at `https://app.otherlode.dev`. Every user has one role, and an admin manages the users on the **Users** page. This guide covers that page. [Sign-in and sessions](sign-in) covers how a user signs in.

## Know what each role can do

A user is an admin or a viewer.

- A viewer reads everything the tenant holds and changes nothing.
- An admin does the same, and also manages the tenant's users, its API keys, its single sign-on connection and its [redaction requirement](require-redaction), and reads its audit log.

Only an admin sees **Admin** in the tenant menu in the top bar. A viewer who opens an admin page sees "Only admins can see this page." The admin routes also refuse every request that does not come from an admin's browser session, so an API key cannot call them.

An email names at most one user in a tenant. The same person in two tenants is two users, each with its own role. Adding someone to your tenant never changes their access to another tenant.

## Open the Users page

Open the tenant menu in the top bar and click **Admin**. The **Users** page opens first.

## Add a user

To let a person sign in, add their email to the tenant.

1. Click **Add user**.
2. Enter the person's **Email**.
3. Pick a **Role**.
4. Click **Add user**.

The person signs in with that email. The sheet rejects an email that is not an address such as `name@example.com`. An address can have at most 254 characters and cannot contain a space or a hidden character, such as a zero-width space. The page trims spaces around the email.

If the tenant already has a user with that email, the sheet shows "a user with this email already exists". The comparison ignores case. The message never says whether the email names a user in another tenant, and a user in another tenant does not stop you.

A tenant that turns on [just-in-time provisioning](sso) also gives a viewer to a person you did not add, at their first single sign-on login.

## Change a user's role

Pick the other role in the user's **Role** select. The change applies at once, also to a session that is already open. Picking the role a user already has changes nothing.

If you pick **Viewer** on your own row, you lose the admin pages at once, and only another admin can make you an admin again. Confirm with **Make me a viewer**.

## Delete a user

Click **Delete** on the user's row, then **Delete user** in the confirmation sheet.

The user's sessions end when you confirm, so the person is signed out of every browser. Their next request is refused.

If you delete your own user, you are signed out at once, and you cannot sign in again unless an admin adds you back. Otherlode sends you to AuthKit's sign-in page.

## Keep at least one admin

A tenant always keeps one admin who can sign in. An admin counts once they have signed in at least once. While your tenant enforces SSO, they must also have signed in through your SSO connection. Otherlode refuses to make such an admin a viewer, or to delete them, when no other admin counts. Both refusals give this message:

```text
this is the tenant's last admin who can sign in; make another user an admin and have them sign in first
```

To change your own role or delete your own user when you are the only admin who counts, first give another user the **Admin** role and have them sign in. An admin who doesn't count can always be made a viewer or deleted.

The rule covers changes made on this page. Directory sync is not stopped by it. If your directory removes the last admin, the tenant is left with no admin, and an operator has to add one. Email [support@otherlode.dev](mailto:support@otherlode.dev) to ask for it.

## What directory sync does to users

If your tenant uses directory sync, your identity provider tells Otherlode when a person leaves, is suspended, or changes email. Otherlode applies each change to that person's user. A scheduled job reads these events once a day, so a change takes effect at the next run and not at the moment you make it in your directory. [Set up single sign-on](sso) covers turning directory sync on.

- **How Otherlode finds the user.** The first event for a person finds their user by any email the directory holds for them, ignoring case, and remembers which directory person it is. Later events find that user by the directory person, whatever their email has become. A user already tied to a person in a directory is never matched by email. When you delete a directory, its users are no longer tied to it, so a directory you set up again finds them by email. An email that holds a NUL character is skipped.
- **A person is deleted or suspended.** Otherlode deletes their user, even when it is the tenant's last admin, and their sessions end. It also deletes any other user that has one of the person's emails and isn't tied to a directory person.
- **A person changes email.** The user keeps its role and takes the new email. If another user of the tenant already has the new email, or the new email is not one you could add on the **Users** page, nothing changes. If the new email is not on one of your verified domains, nothing changes either, and the [audit log](audit-log) records **Email change refused**. The same happens for a user who has never signed in and whose email is not on one of your verified domains, whatever the new email.
- **A removal event is older than the user.** If you added the person back more than a minute after the event, Otherlode skips the removal. Inside that minute the deletion goes ahead.

Without directory sync, removing a person at your identity provider does nothing here until their session ends. Delete their user on the **Users** page to end it at once.

## Find who changed a user

The audit log records every user added, deleted, or given a new role, and each session a deletion ends. It names the admin, directory sync, or operator who did it. See [Audit log](audit-log).
