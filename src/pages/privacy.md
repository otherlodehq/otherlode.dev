---
layout: ../layouts/Prose.astro
title: Privacy policy
description: How Otherlode collects, uses and keeps personal data.
---

# Privacy policy

Last updated: [PUBLISH DATE]

This policy explains what personal data Otherlode collects, why, who
else handles it, and how long we keep it. It covers this website, the
Otherlode service, and email you send us.

## Who we are

Otherlode is run by [CONTROLLER: legal name, and "trading as Otherlode"
if a sole trader], [POSTAL ADDRESS]. We are registered with the
Information Commissioner's Office under number [ICO REGISTRATION
NUMBER].

For anything about your personal data, email
[privacy@otherlode.dev](mailto:privacy@otherlode.dev).

## Controller and processor

For most of the data in this policy we decide how it is used, which
makes us the controller. That covers visitors to this website, people
who email us, and the accounts people use to sign in.

Our customers run the Otherlode agent and collector in their own
systems, and those send us reports about the customer's code. For that
data the customer is the controller and we are their processor. We use
it only to run the service for that customer, under our data
processing agreement with them. If you have a question about that
data, ask the customer first. We will help them answer it.

## This website

This website sets no cookies, runs no analytics and loads nothing from
other sites.

Cloudflare serves the website. To deliver pages and block attacks, it
handles each visitor's IP address and browser details. We don't receive
that data, except that Cloudflare's dashboard shows us the IP address
of a request it blocks as an attack.

## Email you send us

Email to our addresses, such as `hello@otherlode.dev` and
`privacy@otherlode.dev`, lands in a mailbox that Google Workspace hosts
for us. We use it to reply to you, and to talk about early access if
you asked. We keep correspondence while we are in
touch, and delete it [RETENTION: e.g. 2 years] after our last contact.
Email that forms part of a customer contract is kept for 6 years after
the contract ends, the time limit for legal claims.

## Your account

### Where it comes from

Your account is set up by the organisation you work for, which is our
customer. Their admin, or our team at their request, gives us your
email address. If the organisation uses single sign-on, an account can
also be created the first time you sign in through it, from the email
address their sign-in service sends. If the organisation connects its
staff directory to us, the directory can also change your email address
or remove your account. You can't have an account without an email
address, since that is how you sign in.

### What we keep

For each account we keep:

- your email address
- your role (admin or viewer)
- the WorkOS user ID that links your account to your sign-in
- when the account was created and when you last signed in

We don't keep your name or profile picture, even when your sign-in
provider shares them.

If your email address belongs to more than one customer account, we
ask which one to open. While you choose, we hold your email, your
WorkOS user ID and the accounts on offer. The choice expires after 5
minutes.

### How you sign in

WorkOS runs our sign-in page and sets its own cookies there. You sign
in with Google, Microsoft or GitHub, or with your organisation's own
single sign-on. Your sign-in provider tells WorkOS who you are, and
WorkOS tells us. WorkOS keeps its own record of you, which can include
your name and profile picture from your provider. If your organisation
connects its directory, WorkOS also holds a copy of your directory
entry. Google, Microsoft,
GitHub and your organisation's sign-in service act under their own
privacy policies.

### If you sign in without an account

If you sign in but no customer has given you an account, we don't let
you in and we add nothing to our database. WorkOS still makes a record
of you when you sign in, and our logs may hold your email address for
30 days. Ask us and we will delete the WorkOS record.

### Sessions and cookies

When you sign in, we set a session cookie. We store only a hash of its
value, not the value itself, with the times it was created and last
used. A session stops working after 7 days without use or 30 days in
total, whichever comes first, and signing out ends it at once.

The service uses these cookies and browser storage:

| Name | Purpose | How long |
| --- | --- | --- |
| `__Host-otherlode_session` | Keeps you signed in | Up to 30 days |
| `__Host-otherlode_login` | Protects the sign-in step from forgery | 10 minutes |
| `__Host-otherlode_login_choice` | Holds your place while you choose an account | 5 minutes |
| `sidebar_state` | Records whether the sidebar is open or closed | 7 days |
| `otherlode.environment.*` (browser storage) | Remembers the environment you last chose for each service | Until you clear it |

Each one is needed for the service to work or records a choice you made
on the page. We don't use them to track you, and we don't share them.

### The audit log

Each customer has an audit log that its admins can read. It records
sign-ins, failed sign-ins, sign-outs, and changes to who can use the
customer's account, including changes our team makes and each time our
team lists the account's users. An entry can name you by your email
address and your WorkOS user ID. When a directory changes your email
address, the entry keeps both the old and the new one.
Entries made from your browser, such as a sign-in or a change an admin
makes, also hold the IP address the request came from.

We keep audit entries for as long as the customer is with us, so they
can always see who had access. Removing one person's account does not
remove the entries that name them.

## Data from the agent

The agent reports which parts of a customer's code ran. A report holds
names from the code and its setup: services, environments, classes,
methods, parameters, source files, web routes and libraries. It is
about the code, and it has no hostnames, IP addresses, user
names or request contents. A few fields can still hold personal data:

- A library's file path can include a user's home folder, such as
  `/Users/<name>/.m2/...`. This happens mostly on a developer's own
  machine.
- Text written into the code, such as a fixed string in an `if`
  condition, is reported as it appears. The collector can replace these
  strings with a placeholder before they leave the customer's network.
  That setting is off unless the customer turns it on.
- A customer can choose an instance ID that names a machine or a
  person.

## Logs

The service runs on Google Cloud, and its logs hold some personal data.
Google Cloud records each request with its IP address, browser details
and web address. Our own logs can hold an email address, for example
when a sign-in fails. We keep both for 30 days.

Security logs record when our team connects to the database or reads a
secret. They also keep any database query we run from Google Cloud's
console, and such a query can name an account. We keep security logs
for 400 days.

## Why we use your data

For the data we control, we rely on legitimate interests. That means we
use the data because we, or our customer, need it, and we have weighed
that need against your privacy. For agent reports we act for the
customer, and the customer chooses the lawful basis.

| What | Why |
| --- | --- |
| Website requests | To serve the site and block attacks |
| Email | To answer you |
| Account, sessions and cookies | To let the people our customer chose sign in, and keep everyone else out |
| Audit log | To show the customer who had access and what changed |
| Agent reports | To run the service for the customer, on the basis the customer chooses |
| Logs | To find faults and investigate security problems |

## Who else handles your data

These companies help us run Otherlode. Each one handles personal data
only on our instructions, under a contract that requires them to keep
it safe.

| Company | What they do | Where |
| --- | --- | --- |
| Google Cloud | Hosts the service, its database and backups | London, UK |
| Google Cloud | Stores the security logs | London, UK |
| Google Cloud | Stores request logs and our own logs | [LOG REGION] |
| WorkOS | Runs sign-in, single sign-on and directory sync | United States |
| Cloudflare | Serves this website and runs our domain | Worldwide |
| Google Workspace | Hosts our mailbox | Worldwide |

We don't sell personal data, and we don't use it for advertising.

## Transfers outside the UK

Some of these companies can process data outside the UK, including in
the United States. When personal data leaves the UK, we rely on
[SAFEGUARD: the UK Extension to the EU-US Data Privacy Framework for
companies certified under it, or the UK's International Data Transfer
Addendum to the EU standard contractual clauses]. Ask us for a copy of
the safeguards that apply.

## How long we keep data

| Data | How long |
| --- | --- |
| Account | Until the customer or our team removes it |
| Account choice at sign-in | Deleted within a day of expiring, 5 minutes after it starts |
| Sessions | Deleted within a day of expiring, after 7 days without use or 30 days in total |
| Audit log | Until the customer leaves |
| Agent reports | Until the customer leaves, or asks us to delete them |
| Your record at WorkOS | Until the customer leaves, or you ask us to delete it |
| Your record at WorkOS, if you have no account | Until you ask us to delete it |
| WorkOS's event history | [WORKOS RETENTION] |
| Request logs and our own logs | 30 days |
| Security logs | 400 days |
| Database backups | 7 days |
| Email | [RETENTION] after our last contact, or 6 years after a customer contract ends |

When a customer leaves, we delete what we hold for them: accounts,
sessions, the audit log, agent reports and API keys, and their records
at WorkOS. We keep a person's WorkOS record if another customer has
also given them an account. Backups hold a copy for up to 7 more days. Logs are kept for
the periods above.

## Your rights

You can ask us for a copy of your personal data, and ask us to correct
it, delete it or limit how we use it. Email
[privacy@otherlode.dev](mailto:privacy@otherlode.dev) and we will reply
within one month. If your request is about a customer's data, we pass
it to that customer and help them answer it.

**You can also object.** Since we rely on legitimate interests, you can
object to any use of the data we control. For agent reports, object to
the customer, and we will help them act on it. We will then stop,
unless we have a strong reason to carry on that outweighs your
interests, or we need the data for a legal claim.

We don't make decisions about you by automated means alone.

Otherlode is a service for businesses and is not meant for children.

## Complaints

If you are unhappy with how we handle your data, please tell us first.
You can also complain to the Information Commissioner's Office at
[ico.org.uk](https://ico.org.uk/make-a-complaint/) or on 0303 123 1113.

## Changes to this policy

When this policy changes, we update the date at the top. Every version
is kept in the website's public source at
[github.com/otherlodehq/otherlode.dev](https://github.com/otherlodehq/otherlode.dev).
If a change affects how we use your data, we tell customers before it
takes effect.
