/**
 * The early access form's paths, limits and choices. The page in
 * src/pages/early-access.astro and the Worker in worker/ both read them, so
 * the browser's checks and the Worker's checks agree.
 */

/** Where the form posts. The Worker handles this path. */
export const contactPath = '/contact';

/** Where the Worker sends a person after a request goes through. */
export const thanksPath = '/thanks';

/** Where the Worker sends a person when a request does not go through. */
export const problemPath = '/contact-problem';

/**
 * A field that people never see. A bot that fills in every field fills
 * this one too, and the Worker then drops the request. Its name means
 * nothing to a password manager, which might otherwise fill a field
 * called something like `website` and lose a real request.
 */
export const honeypotField = 'hp_ref';

/** The most characters each field may hold. */
export const maxLength = {
  name: 200,
  email: 254,
  company: 200,
  job_title: 200,
  jvm_stack: 200,
  message: 5000,
} as const;

/**
 * The company size choices. The page shows each one as written, and the
 * form sends it as written. The Apps Script takes at most 20 characters.
 */
export const companySizes = ['1 to 10', '11 to 50', '51 to 200', '201 to 1,000', 'More than 1,000'] as const;

/** The most characters a company size may hold, as apps-script/contact.gs checks it. */
export const companySizeMaxLength = 20;

/**
 * The pattern an email address must match: something, an @, and a domain
 * with a dot. The page gives it to the browser, so the browser and the
 * Worker refuse the same addresses.
 */
export const emailPattern = '[^\\s@]+@[^\\s@]+\\.[^\\s@]+';
