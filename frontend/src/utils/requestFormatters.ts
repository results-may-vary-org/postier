interface EffectiveReq {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

function headerEntries(req: EffectiveReq): [string, string][] {
  return Object.entries(req.headers ?? {});
}

/** Raw HTTP/1.1 wire format */
export function toHTTP(req: EffectiveReq): string {
  const parsed = new URL(req.url);
  const requestLine = `${req.method} ${parsed.pathname}${parsed.search} HTTP/1.1`;
  const host = `Host: ${parsed.host}`;
  const headers = headerEntries(req).map(([k, v]) => `${k}: ${v}`);
  const lines = [requestLine, host, ...headers];
  if (req.body) {
    lines.push('', req.body);
  }
  return lines.join('\n');
}

/** cURL command */
export function toCurl(req: EffectiveReq): string {
  const parts: string[] = [`curl -X ${req.method} '${req.url}'`];
  for (const [k, v] of headerEntries(req)) {
    parts.push(`  -H '${k}: ${v}'`);
  }
  if (req.body) {
    parts.push(`  -d '${req.body.replace(/'/g, "'\\''")}'`);
  }
  return parts.join(' \\\n');
}

/** wget command */
export function toWget(req: EffectiveReq): string {
  const parts: string[] = [`wget --method=${req.method}`];
  for (const [k, v] of headerEntries(req)) {
    parts.push(`  --header='${k}: ${v}'`);
  }
  if (req.body) {
    parts.push(`  --body-data='${req.body.replace(/'/g, "'\\''")}'`);
  }
  parts.push(`  '${req.url}'`);
  return parts.join(' \\\n');
}

/** HTTPie command */
export function toHTTPie(req: EffectiveReq): string {
  const parts: string[] = [`http ${req.method} '${req.url}'`];
  for (const [k, v] of headerEntries(req)) {
    parts.push(`  '${k}: ${v}'`);
  }
  if (req.body) {
    return parts.join(' \\\n') + ` \\\n  <<< '${req.body.replace(/'/g, "'\\''")}'`;
  }
  return parts.join(' \\\n');
}
