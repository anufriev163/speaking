import http from 'http';
import https from 'https';

export interface HttpResponse {
  status: number;
  ok: boolean;
  text: () => Promise<string>;
  json: () => Promise<any>;
}

export const DEFAULT_TIMEOUT_MS = 20000;

function applyTimeout(req: http.ClientRequest, timeoutMs: number) {
  req.setTimeout(timeoutMs, () => {
    req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
  });
}

export function postBuffer(
  urlStr: string,
  headers: Record<string, string>,
  body: Buffer,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const transport = url.protocol === 'http:' ? http : https;
      const defaultPort = url.protocol === 'http:' ? 80 : 443;
      const port = url.port ? Number(url.port) : defaultPort;

      const req = transport.request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port,
          path: url.pathname + url.search,
          method: 'POST',
          headers
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
            res.on('error', reject);
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf-8');
            const status = res.statusCode || 500;
            resolve({
              status,
              ok: status >= 200 && status < 300,
              text: async () => text,
              json: async () => {
                try {
                  return JSON.parse(text);
                } catch {
                  return { error: text };
                }
              }
            });
          });
        }
      );

      req.on('error', reject);
      applyTimeout(req, timeoutMs);
      req.write(body);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function postJson(
  urlStr: string,
  headers: Record<string, string>,
  payload: any,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<HttpResponse> {
  const jsonBody = Buffer.from(JSON.stringify(payload), 'utf-8');
  return postBuffer(
    urlStr,
    {
      ...headers,
      'Content-Type': 'application/json',
      'Content-Length': String(jsonBody.length)
    },
    jsonBody,
    timeoutMs
  );
}

export function getJson(
  urlStr: string,
  headers: Record<string, string> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    function makeReq(currentUrl: string, redirectCount = 0) {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects'));
      }
      try {
        const url = new URL(currentUrl);
        const transport = url.protocol === 'http:' ? http : https;
        const defaultPort = url.protocol === 'http:' ? 80 : 443;
        const port = url.port ? Number(url.port) : defaultPort;

        const req = transport.request(
          {
            protocol: url.protocol,
            hostname: url.hostname,
            port,
            path: url.pathname + url.search,
            method: 'GET',
            headers
          },
          (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              res.resume();
              const next = new URL(res.headers.location, currentUrl);
              if (url.protocol === 'https:' && next.protocol !== 'https:') {
                return reject(new Error('Refusing HTTPS -> HTTP redirect'));
              }
              return makeReq(next.toString(), redirectCount + 1);
            }
            const chunks: Buffer[] = [];
            res.on('data', (c) => chunks.push(c));
            res.on('error', reject);
            res.on('end', () => {
              const text = Buffer.concat(chunks).toString('utf-8');
              const status = res.statusCode || 500;
              resolve({
                status,
                ok: status >= 200 && status < 300,
                text: async () => text,
                json: async () => {
                  try {
                    return JSON.parse(text);
                  } catch {
                    return { error: text };
                  }
                }
              });
            });
          }
        );

        req.on('error', reject);
        applyTimeout(req, timeoutMs);
        req.end();
      } catch (err) {
        reject(err);
      }
    }
    makeReq(urlStr);
  });
}

