import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { companySizeMaxLength, maxLength } from '../src/lib/contact-form';
import { deliver, handleContact, maxBodyBytes, parseSubmission, rateLimitKey, readCapped, sameSite, type ContactEnv } from './contact';
import worker from './index';

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Ltd',
  company_size: '11 to 50',
  job_title: 'Engineer',
  jvm_stack: 'Kotlin and Spring Boot',
  message: 'We run 12 services.\nMostly Kotlin.',
};

function form(fields: Record<string, string>): URLSearchParams {
  return new URLSearchParams(fields);
}

function post(body: string, headers: Record<string, string> = {}): Request {
  return new Request('https://otherlode.dev/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': '192.0.2.1', ...headers },
    body,
  });
}

function scriptReply(body: unknown, status = 200): typeof fetch {
  return vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })) as unknown as typeof fetch;
}

const configured: ContactEnv = { CONTACT_ENDPOINT: 'https://script.example/exec', CONTACT_TOKEN: 'secret-token' };

describe('parseSubmission', () => {
  it('accepts a full request and trims every field', () => {
    const result = parseSubmission(form({ ...valid, name: '  Ada Lovelace  ' }));
    expect(result).toEqual({ kind: 'ok', fields: valid });
  });

  it('accepts a request with only the required fields', () => {
    const result = parseSubmission(form({ name: 'Ada', email: 'ada@example.com', company: 'A', company_size: '1 to 10' }));
    expect(result).toEqual({
      kind: 'ok',
      fields: { name: 'Ada', email: 'ada@example.com', company: 'A', company_size: '1 to 10', job_title: '', jvm_stack: '', message: '' },
    });
  });

  it('drops a request whose honeypot is filled', () => {
    expect(parseSubmission(form({ ...valid, hp_ref: 'http://spam.example' }))).toEqual({ kind: 'honeypot' });
  });

  it('accepts every field at exactly its limit', () => {
    const atLimit = {
      ...valid,
      name: 'a'.repeat(maxLength.name),
      company: 'a'.repeat(maxLength.company),
      job_title: 'a'.repeat(maxLength.job_title),
      jvm_stack: 'a'.repeat(maxLength.jvm_stack),
      message: 'a'.repeat(maxLength.message),
      email: `${'a'.repeat(maxLength.email - '@example.com'.length)}@example.com`,
    };
    expect(parseSubmission(form(atLimit)).kind).toBe('ok');
  });

  it('counts a CRLF in the message as one character, as the browser does', () => {
    const lines = `${'a'.repeat(2499)}\r\n${'b'.repeat(2500)}`;
    const result = parseSubmission(form({ ...valid, message: lines }));
    expect(result).toEqual({ kind: 'ok', fields: { ...valid, message: `${'a'.repeat(2499)}\n${'b'.repeat(2500)}` } });
  });

  it.each(['name', 'email', 'company', 'company_size'])('refuses a request with no %s', (key) => {
    expect(parseSubmission(form({ ...valid, [key]: '   ' }))).toEqual({ kind: 'invalid', reason: 'missing_field' });
  });

  it.each([
    ['name', 201],
    ['company', 201],
    ['job_title', 201],
    ['jvm_stack', 201],
    ['message', 5001],
  ])('refuses a %s longer than its limit', (key, length) => {
    expect(parseSubmission(form({ ...valid, [key as string]: 'a'.repeat(length as number) }))).toEqual({ kind: 'invalid', reason: 'too_long' });
  });

  it.each(['name', 'email', 'company', 'job_title', 'jvm_stack'])('refuses a line break in %s', (key) => {
    const value = key === 'email' ? 'ada@example.com\r\nBcc: x@example.com' : 'one\ntwo';
    expect(parseSubmission(form({ ...valid, [key]: value }))).toEqual({ kind: 'invalid', reason: 'control_character' });
  });

  it('refuses a Unicode line separator in a single-line field', () => {
    expect(parseSubmission(form({ ...valid, company: 'one\u2028two' }))).toEqual({ kind: 'invalid', reason: 'control_character' });
  });

  it('allows line breaks and tabs in the message, but no other control character', () => {
    expect(parseSubmission(form({ ...valid, message: 'a\r\n\tb' })).kind).toBe('ok');
    expect(parseSubmission(form({ ...valid, message: 'a\u0007b' }))).toEqual({ kind: 'invalid', reason: 'control_character' });
  });

  it.each(['ada', 'ada@', '@example.com', 'ada@example', 'ada lovelace@example.com'])('refuses the email %s', (email) => {
    expect(parseSubmission(form({ ...valid, email }))).toEqual({ kind: 'invalid', reason: 'bad_email' });
  });

  it('refuses a company size that is not one of the choices', () => {
    expect(parseSubmission(form({ ...valid, company_size: '5000' }))).toEqual({ kind: 'invalid', reason: 'bad_company_size' });
  });
});

describe('deliver', () => {
  it('posts the token and fields as JSON and succeeds on ok: true', async () => {
    const fetchImpl = scriptReply({ ok: true });
    expect(await deliver(valid, 'https://script.example/exec', 'secret-token', fetchImpl)).toBeNull();
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://script.example/exec');
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('follow');
    expect(JSON.parse(init.body)).toEqual({ token: 'secret-token', ...valid });
  });

  it('fails on a 200 reply that says ok: false, passing on a safe error code', async () => {
    expect(await deliver(valid, 'u', 't', scriptReply({ ok: false, error: 'bad_token' }))).toBe('endpoint_bad_token');
  });

  it('does not pass on an error code that could hold anything', async () => {
    expect(await deliver(valid, 'u', 't', scriptReply({ ok: false, error: 'Ada <ada@example.com>' }))).toBe('endpoint_refused');
  });

  it('fails on a 200 reply that is not JSON', async () => {
    expect(await deliver(valid, 'u', 't', scriptReply('<html>Sign in</html>'))).toBe('endpoint_not_json');
  });

  it('fails on a non-2xx reply', async () => {
    expect(await deliver(valid, 'u', 't', scriptReply({ ok: true }, 500))).toBe('endpoint_status_500');
  });

  it('fails when the endpoint cannot be reached', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('network');
    }) as unknown as typeof fetch;
    expect(await deliver(valid, 'u', 't', fetchImpl)).toBe('endpoint_unreachable');
  });
});

describe('handleContact', () => {
  it('sends a valid request and redirects to the thank-you page', async () => {
    const fetchImpl = scriptReply({ ok: true });
    const response = await handleContact(post(form(valid).toString()), configured, fetchImpl);
    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/thanks');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('redirects a bot to the thank-you page, sends nothing and logs it', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetchImpl = scriptReply({ ok: true });
    const response = await handleContact(post(form({ ...valid, hp_ref: 'x' }).toString()), configured, fetchImpl);
    expect(response.headers.get('Location')).toBe('/thanks');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('contact: honeypot');
    log.mockRestore();
  });

  it('refuses a post that another site sent', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetchImpl = scriptReply({ ok: true });
    const response = await handleContact(post(form(valid).toString(), { origin: 'https://evil.example' }), configured, fetchImpl);
    expect(response.headers.get('Location')).toBe('/contact-problem');
    expect(log).toHaveBeenCalledWith('contact: cross_site');
    expect(fetchImpl).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('accepts a post from the site itself', async () => {
    const headers = { origin: 'https://otherlode.dev', 'sec-fetch-site': 'same-origin' };
    const response = await handleContact(post(form(valid).toString(), headers), configured, scriptReply({ ok: true }));
    expect(response.headers.get('Location')).toBe('/thanks');
  });

  it('redirects an invalid request to the problem page and sends nothing', async () => {
    const fetchImpl = scriptReply({ ok: true });
    const response = await handleContact(post(form({ ...valid, email: 'nope' }).toString()), configured, fetchImpl);
    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/contact-problem');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(['GET', 'PUT', 'DELETE'])('answers %s with 405', async (method) => {
    const response = await handleContact(new Request('https://otherlode.dev/contact', { method }), configured);
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
  });

  it('refuses a body that is not a form', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const response = await handleContact(post(JSON.stringify(valid), { 'content-type': 'application/json' }), configured, scriptReply({ ok: true }));
    expect(response.headers.get('Location')).toBe('/contact-problem');
    expect(log).toHaveBeenCalledWith('contact: bad_content_type');
    log.mockRestore();
  });

  it('refuses a body over the size limit', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const big = form({ ...valid, message: 'a'.repeat(maxBodyBytes) }).toString();
    const response = await handleContact(post(big), configured, scriptReply({ ok: true }));
    expect(response.headers.get('Location')).toBe('/contact-problem');
    expect(log).toHaveBeenCalledWith('contact: too_large');
    log.mockRestore();
  });

  it('takes a full-length message in a non-Latin script', async () => {
    const message = '\u6f22'.repeat(maxLength.message);
    const response = await handleContact(post(form({ ...valid, message }).toString()), configured, scriptReply({ ok: true }));
    expect(response.headers.get('Location')).toBe('/thanks');
  });

  it('refuses a client over the rate limit, keyed on its address, before reading the body', async () => {
    const limit = vi.fn(async () => ({ success: false }));
    const fetchImpl = scriptReply({ ok: true });
    const response = await handleContact(post(form(valid).toString()), { ...configured, CONTACT_LIMIT: { limit } }, fetchImpl);
    expect(limit).toHaveBeenCalledWith({ key: '192.0.2.1' });
    expect(response.headers.get('Location')).toBe('/contact-problem');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends people to the problem page while the secrets are not set', async () => {
    const fetchImpl = scriptReply({ ok: true });
    const response = await handleContact(post(form(valid).toString()), {}, fetchImpl);
    expect(response.headers.get('Location')).toBe('/contact-problem');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends people to the problem page when the Apps Script refuses', async () => {
    const response = await handleContact(post(form(valid).toString()), configured, scriptReply({ ok: false, error: 'bad_token' }));
    expect(response.headers.get('Location')).toBe('/contact-problem');
  });

  it('logs only a reason code on failure, never the request', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleContact(post(form({ ...valid, email: 'not-an-email' }).toString()), configured, scriptReply({ ok: true }));
    await handleContact(post(form(valid).toString()), configured, scriptReply({ ok: false, error: 'bad_token' }));
    const logged = log.mock.calls.map((call) => call.join(' ')).join('\n');
    log.mockRestore();
    expect(logged).toBe('contact: bad_email\ncontact: endpoint_bad_token');
  });
});

describe('deliver timeout', () => {
  it('gives up when the endpoint does not answer in time', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('timed out', 'TimeoutError')));
        }),
    ) as unknown as typeof fetch;
    expect(await deliver(valid, 'u', 't', fetchImpl, 20)).toBe('endpoint_unreachable');
  });
});

describe('readCapped', () => {
  function stream(...chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
  }

  it('joins several chunks', async () => {
    expect(await readCapped(stream('ab', 'cd', 'ef'), 10)).toBe('abcdef');
  });

  it('takes a body of exactly the limit and refuses one byte more', async () => {
    expect(await readCapped(stream('abc', 'de'), 5)).toBe('abcde');
    expect(await readCapped(stream('abc', 'def'), 5)).toBeNull();
  });

  it('reads a missing body as empty', async () => {
    expect(await readCapped(null, 5)).toBe('');
  });
});

describe('sameSite', () => {
  const at = (headers: Record<string, string>) => new Request('https://otherlode.dev/contact', { method: 'POST', headers });

  it('allows a request with neither header', () => {
    expect(sameSite(at({}))).toBe(true);
  });

  it('refuses a cross-site or same-site but other-origin request', () => {
    expect(sameSite(at({ 'sec-fetch-site': 'cross-site' }))).toBe(false);
    expect(sameSite(at({ 'sec-fetch-site': 'same-site' }))).toBe(false);
    expect(sameSite(at({ origin: 'https://other.otherlode.dev' }))).toBe(false);
    expect(sameSite(at({ origin: 'null' }))).toBe(false);
    expect(sameSite(at({ origin: 'http://otherlode.dev' }))).toBe(false);
  });
});

describe('rateLimitKey', () => {
  it('keys an IPv4 address on its own', () => {
    expect(rateLimitKey('192.0.2.1')).toBe('192.0.2.1');
  });

  it('keys every IPv6 address in a /64 the same', () => {
    expect(rateLimitKey('2001:db8:abcd:12:1::5')).toBe('2001:db8:abcd:12::/64');
    expect(rateLimitKey('2001:0DB8:abcd:0012:ffff:ffff:ffff:ffff')).toBe('2001:db8:abcd:12::/64');
    expect(rateLimitKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
  });

  it('gives a missing address one shared key', () => {
    expect(rateLimitKey(null)).toBe('unknown');
  });

  it('keys an IPv4 address inside IPv6 on the whole address', () => {
    expect(rateLimitKey('::ffff:192.0.2.1')).toBe('::ffff:192.0.2.1');
    expect(rateLimitKey('::ffff:198.51.100.7')).toBe('::ffff:198.51.100.7');
  });

  it('keys an address that does not parse on itself, without throwing', () => {
    expect(rateLimitKey('1:2:3:4:5:6:7:8:9::')).toBe('1:2:3:4:5:6:7:8:9::');
  });

  it('ignores a zone id', () => {
    expect(rateLimitKey('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
  });
});

describe('the Worker entry', () => {
  it('sends /contact to the handler and everything else to the static files', async () => {
    const assets = vi.fn(async () => new Response('page'));
    const env = { ASSETS: { fetch: assets } };
    const page = await worker.fetch(new Request('https://otherlode.dev/early-access'), env);
    expect(await page.text()).toBe('page');
    const contact = await worker.fetch(new Request('https://otherlode.dev/contact'), env);
    expect(contact.status).toBe(405);
    expect(assets).toHaveBeenCalledOnce();
  });
});

describe('the Apps Script', () => {
  const script = readFileSync(new URL('../apps-script/contact.gs', import.meta.url), 'utf8');

  it('checks the same field limits as the Worker', () => {
    const table = script.match(/var MAX_LENGTH = \{([^}]*)\}/)?.[1] ?? '';
    const limits = Object.fromEntries([...table.matchAll(/(\w+): (\d+)/g)].map((m) => [m[1], Number(m[2])]));
    expect(limits).toEqual({ ...maxLength, company_size: companySizeMaxLength });
  });

  it('asks only for the sheet it is bound to', () => {
    expect(script.startsWith('/** @OnlyCurrentDoc */')).toBe(true);
  });
});
