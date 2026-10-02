import { contactPath } from '../src/lib/contact-form';
import { handleContact, type ContactEnv } from './contact';

/** The Worker's bindings: the static assets plus the contact handler's. */
interface Env extends ContactEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

/**
 * Serves the site. wrangler.jsonc sends only the contact path here first;
 * every other request is a static asset that never reaches this code.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname === contactPath) {
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
