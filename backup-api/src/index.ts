// Cloudflare Worker — Backup API for X-Sport Platform
// Deploy: wrangler deploy
// Bindings: R2 bucket named BACKUP_BUCKET

export interface Env {
  BACKUP_BUCKET: R2Bucket;
}

function cors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Pin');
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    const match = url.pathname.match(/^\/backup\/([A-Za-z0-9-]+)$/);
    if (!match) return cors(new Response('Not found', { status: 404 }));

    const studioId = match[1];
    const pin = request.headers.get('X-Pin');
    if (!pin) return cors(new Response('PIN required', { status: 401 }));

    const key = `${studioId}/data.enc`;
    const metaKey = `${studioId}/meta.json`;

    if (request.method === 'POST') {
      const body = await request.arrayBuffer();
      if (body.byteLength > 10 * 1024 * 1024) {
        return cors(new Response('Payload too large (max 10MB)', { status: 413 }));
      }

      // Verify PIN matches stored PIN (or first-time setup)
      const meta = await env.BACKUP_BUCKET.get(metaKey);
      if (meta) {
        const stored = await meta.json<{ pin_hash: string }>();
        if (stored.pin_hash !== pin) {
          return cors(new Response('Invalid PIN', { status: 403 }));
        }
      } else {
        // First backup — store PIN hash
        await env.BACKUP_BUCKET.put(metaKey, JSON.stringify({ pin_hash: pin, created_at: new Date().toISOString() }));
      }

      await env.BACKUP_BUCKET.put(key, body, {
        customMetadata: { updated_at: new Date().toISOString() },
      });

      return cors(new Response(JSON.stringify({ ok: true, updated_at: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    if (request.method === 'GET') {
      // Verify PIN
      const meta = await env.BACKUP_BUCKET.get(metaKey);
      if (!meta) return cors(new Response('No backup found', { status: 404 }));

      const stored = await meta.json<{ pin_hash: string }>();
      if (stored.pin_hash !== pin) {
        return cors(new Response('Invalid PIN', { status: 403 }));
      }

      const object = await env.BACKUP_BUCKET.get(key);
      if (!object) return cors(new Response('No backup data', { status: 404 }));

      return cors(new Response(object.body, {
        headers: { 'Content-Type': 'application/octet-stream' },
      }));
    }

    return cors(new Response('Method not allowed', { status: 405 }));
  },
};
