# otherlode.dev

## Copy and comments

Run the `humanizer` skill over any site copy, comment or doc comment
before treating it as finished. That means no em dashes and no stock AI
phrasing, such as "seamless," "robust," "leverage" or "crucial."

## Claims

Every claim on the site must be true of the shipped product today. Don't
describe a feature that is planned, partly built or only in a branch.
Don't invent numbers, customers or testimonials.

## Third parties, cookies and analytics

The privacy policy says the site sets no cookies and loads nothing from
third parties, and names where an early access request goes. Don't add a
third-party request, a cookie, analytics or a new place that form data
goes unless the same commit changes the privacy policy to match. Fonts,
images and scripts are self-hosted. The CSP in `public/_headers` has no
`'unsafe-inline'`, so keep styles and scripts in files; `npm run build`
fails on inline ones.

## Privacy policy

Write the privacy policy in plain English with short sentences.
