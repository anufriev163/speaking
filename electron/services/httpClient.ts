import https from 'https';

export interface HttpResponse {
  status: number;
  ok: boolean;
  text: () => Promise<string>;
  json: () => Promise<any>;
}

export function postBuffer(
  urlStr: string,
  headers: Record<string, string>,
  body: Buffer
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const req = https.request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname + url.search,
          method: 'POST',
          headers
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf-8');
            const status = res.statusCode || 500;
            resolve({
              status,
              ok: status >= 200 && status < 300,
              text: async () => text,
              json: async () => JSON.parse(text)
            });
          });
        }
      );

      req.on('error', reject);
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
  payload: any
): Promise<HttpResponse> {
  const jsonBody = Buffer.from(JSON.stringify(payload), 'utf-8');
  return postBuffer(
    urlStr,
    {
      ...headers,
      'Content-Type': 'application/json',
      'Content-Length': String(jsonBody.length)
    },
    jsonBody
  );
}
