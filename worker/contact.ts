import {
  companySizeMaxLength,
  companySizes,
  emailPattern as emailPatternSource,
  honeypotField,
  maxLength,
  problemPath,
  thanksPath,
} from '../src/lib/contact-form';

/** The fields of one early access request, trimmed and checked. */
export interface ContactFields {
  name: string;
  email: string;
  company: string;
  company_size: string;
  job_title: string;
  jvm_stack: string;
  message: string;
}

/** The bindings and secrets the contact handler reads. */
export interface ContactEnv {
  /** Limits requests per client address. Absent in tests that do not need it. */
  CONTACT_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  /** The Apps Script web app URL, ending in /exec. */
  CONTACT_ENDPOINT?: string;
  /** The shared token the Apps Script checks. */
  CONTACT_TOKEN?: string;
}

/** The result of reading a submitted form. */
export type ParseResult =
  | { kind: 'ok'; fields: ContactFields }
  | { kind: 'honeypot' }
  | { kind: 'invalid'; reason: string };

/**
 * The largest request body the handler reads, in bytes. A character
 * outside ASCII can take 9 bytes once the form encodes it, so this fits a
 * full message in any script.
 */
export const maxBodyBytes = 64 * 1024;

/**
 * How long the handler waits for the Apps Script, in milliseconds. It is
 * well above the script's own 5 second wait for its lock, so a slow reply
 * still counts and the person is not told to send again.
 */
export const deliverTimeoutMs = 25_000;

const required = ['name', 'email', 'company', 'company_size'] as const;
const optional = ['job_title', 'jvm_stack', 'message'] as const;

// Control characters, plus the Unicode line and paragraph separators. A
// single-line field may hold none of them, so a value can never add a line
// to the notification email or the sheet.
const singleLineForbidden = /[\u0000-\u001f\u007f\u2028\u2029]/;
// The message may hold line breaks and tabs, but no other control character.
const messageForbidden = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const emailPattern = new RegExp(`^${emailPatternSource}$`);

/**
 * Reads a submitted form. A filled honeypot means a bot. Every field is
 * trimmed; the required ones must be present, every one must fit its
 * length, and only the message may span lines.
 */
export function parseSubmission(form: URLSearchParams): ParseResult {
  if ((form.get(honeypotField) ?? '').trim() !== '') {
    return { kind: 'honeypot' };
  }
  const fields = {} as ContactFields;
  for (const key of [...required, ...optional]) {
    // A browser counts a line break as one character for maxlength but
    // sends it as CRLF, so the message is counted with bare line feeds.
    const raw = (form.get(key) ?? '').trim();
    const value = key === 'message' ? raw.replace(/\r\n?/g, '\n') : raw;
    const limit = key === 'company_size' ? companySizeMaxLength : maxLength[key];
    if (value.length > limit) {
      return { kind: 'invalid', reason: 'too_long' };
    }
    const forbidden = key === 'message' ? messageForbidden : singleLineForbidden;
    if (forbidden.test(value)) {
      return { kind: 'invalid', reason: 'control_character' };
    }
    fields[key] = value;
  }
  for (const key of required) {
    if (fields[key] === '') {
      return { kind: 'invalid', reason: 'missing_field' };
    }
  }
  if (!emailPattern.test(fields.email)) {
    return { kind: 'invalid', reason: 'bad_email' };
  }
  if (!(companySizes as readonly string[]).includes(fields.company_size)) {
    return { kind: 'invalid', reason: 'bad_company_size' };
  }
  return { kind: 'ok', fields };
}

/**
 * Sends a request to the Apps Script. It answers 200 for every request,
 * after a redirect that fetch follows, so success is a 2xx reply whose
 * JSON body has `ok` set to true. Returns null on success, else a short
 * reason code that holds nothing from the request.
 */
export async function deliver(
  fields: ContactFields,
  endpoint: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = deliverTimeoutMs,
): Promise<string | null> {
  let reply: Response;
  try {
    reply = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...fields }),
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return 'endpoint_unreachable';
  }
  if (!reply.ok) {
    return `endpoint_status_${reply.status}`;
  }
  let body: unknown;
  try {
    body = JSON.parse((await reply.text()).slice(0, 4096));
  } catch {
    return 'endpoint_not_json';
  }
  if (typeof body === 'object' && body !== null && (body as { ok?: unknown }).ok === true) {
    return null;
  }
  const error = (body as { error?: unknown } | null)?.error;
  return typeof error === 'string' && /^[a-z_]{1,40}$/.test(error) ? `endpoint_${error}` : 'endpoint_refused';
}

/**
 * Reads at most limit bytes of a body. Returns null when the body is
 * larger, so an oversized request is refused without reading all of it.
 */
export async function readCapped(body: ReadableStream<Uint8Array> | null, limit: number): Promise<string | null> {
  if (body === null) {
    return '';
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(all);
}

/**
 * Reports whether a browser sent the request from the site itself. A
 * browser sends Origin and Sec-Fetch-Site on a form POST, so another
 * site's form fails here. A client that sends neither, such as curl, is
 * left to the rate limit and the honeypot.
 */
export function sameSite(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite !== null && fetchSite !== 'same-origin') {
    return false;
  }
  const origin = request.headers.get('origin');
  if (origin === null) {
    return true;
  }
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/**
 * The rate limit's key for a client address. An IPv6 client usually holds
 * a whole /64, so it is counted as one client. An IPv4 address, written
 * plain or inside IPv6, counts on its own, and so does anything that does
 * not read as an address.
 */
export function rateLimitKey(address: string | null): string {
  if (address === null || address === '') {
    return 'unknown';
  }
  if (!address.includes(':') || address.includes('.')) {
    return address;
  }
  const [head, tail = ''] = address.split('%')[0].split('::');
  const left = head === '' ? [] : head.split(':');
  const right = tail === '' ? [] : tail.split(':');
  if (left.length + right.length > 8) {
    return address;
  }
  const groups = address.includes('::')
    ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
    : left;
  return `${groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

/** A 303 redirect to a page on the site. */
function seeOther(path: string): Response {
  return new Response(null, { status: 303, headers: { Location: path, 'Cache-Control': 'no-store' } });
}

/**
 * Handles a request to the contact path. Only a form POST is taken. Every
 * outcome is a redirect to a static page, so the page a person sees
 * always carries the site's headers. A failure logs its reason code and
 * nothing from the request.
 */
export async function handleContact(request: Request, env: ContactEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }
  const fail = (reason: string) => {
    console.log(`contact: ${reason}`);
    return seeOther(problemPath);
  };

  if (!sameSite(request)) {
    return fail('cross_site');
  }
  if (env.CONTACT_LIMIT) {
    const key = rateLimitKey(request.headers.get('cf-connecting-ip'));
    const { success } = await env.CONTACT_LIMIT.limit({ key });
    if (!success) {
      return fail('rate_limited');
    }
  }
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/x-www-form-urlencoded')) {
    return fail('bad_content_type');
  }
  const text = await readCapped(request.body, maxBodyBytes);
  if (text === null) {
    return fail('too_large');
  }

  const result = parseSubmission(new URLSearchParams(text));
  if (result.kind === 'honeypot') {
    console.log('contact: honeypot');
    return seeOther(thanksPath);
  }
  if (result.kind === 'invalid') {
    return fail(result.reason);
  }
  if (!env.CONTACT_ENDPOINT || !env.CONTACT_TOKEN) {
    return fail('not_configured');
  }
  const problem = await deliver(result.fields, env.CONTACT_ENDPOINT, env.CONTACT_TOKEN, fetchImpl);
  if (problem !== null) {
    return fail(problem);
  }
  return seeOther(thanksPath);
}
