"""Read-only mock ERP REST API. No external dependencies, secrets or simulated authentication.

The HTTP adapter is deliberately separate from the static UI. A real integration must
replace fixture loading with a server-side authorized repository / ERP connector.
"""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'dist/data.json').read_text(encoding='utf-8'))
ANALYTICS = json.loads((ROOT / 'backend/analytics.json').read_text(encoding='utf-8'))
RESOURCES = {'suppliers': 'suppliers', 'products': 'products', 'customers': 'customers',
             'orders': 'orders', 'purchase-orders': 'purchaseOrders', 'deliveries': 'deliveries'}


def resolve(path, query):
    """Validate routing and query bounds before selecting data; never concatenate input into a file path."""
    if path == '/health':
        return 200, {'status': 'ok', 'mode': 'synthetic-read-only', 'asOf': DATA['meta']['asOf']}
    if path == '/openapi.json':
        return 200, json.loads((ROOT / 'backend/openapi.json').read_text(encoding='utf-8'))
    parts = path.strip('/').split('/')
    if len(parts) not in (2, 3) or parts[0] != 'api':
        return 404, {'error': 'Resource not found'}
    allowed = {'period', 'limit', 'offset', 'q', 'supplierId', 'productId', 'status', 'region'}
    if any(k not in allowed or len(v) != 1 for k, v in query.items()):
        return 400, {'error': 'Unsupported or duplicate query parameter'}
    period = query.get('period', ['2026-09'])[0]
    if period not in ANALYTICS:
        return 400, {'error': 'period must be 2026-08 or 2026-09'}
    try:
        limit = int(query.get('limit', ['100'])[0])
        offset = int(query.get('offset', ['0'])[0])
    except ValueError:
        return 400, {'error': 'limit and offset must be integers'}
    if not 1 <= limit <= 500 or offset < 0:
        return 400, {'error': 'limit must be 1..500 and offset must be nonnegative'}
    search = query.get('q', [''])[0]
    if len(search) > 100:
        return 400, {'error': 'q must not exceed 100 characters'}
    resource = parts[1]
    if resource in RESOURCES:
        rows = DATA[RESOURCES[resource]]
    elif resource in ('inventory', 'insights'):
        rows = ANALYTICS[period][resource]
    else:
        return 404, {'error': 'Resource not found'}
    # An ID lookup does not depend on the selected month, so evidence links remain stable.
    if len(parts) == 3:
        row = next((r for r in rows if r['id'] == parts[2]), None)
        return (200, row) if row else (404, {'error': 'Record not found'})
    if resource in ('orders', 'purchase-orders', 'deliveries') and 'period' in query:
        field = 'deliveredAt' if resource == 'deliveries' else 'date'
        rows = [r for r in rows if (r.get(field) or '').startswith(period)]
    for field in ('supplierId', 'productId', 'status', 'region'):
        if field in query:
            rows = [r for r in rows if r.get(field) == query[field][0]]
    if search:
        rows = [r for r in rows if search.casefold() in ' '.join(str(v) for v in r.values()).casefold()]
    return 200, {'data': rows[offset:offset + limit], 'total': len(rows), 'limit': limit,
                 'offset': offset, 'meta': DATA['meta']}


class Handler(BaseHTTPRequestHandler):
    """Emit bounded JSON responses with explicit content types and conservative cache / security headers."""
    server_version = 'FlowPilotMock/1.0'

    def do_GET(self):
        parsed = urlparse(self.path)
        try:
            query = parse_qs(parsed.query, keep_blank_values=True, max_num_fields=20)
        except ValueError:
            self.respond(400, {'error': 'Too many query parameters'})
            return
        code, body = resolve(parsed.path, query)
        self.respond(code, body)

    def respond(self, code, body):
        payload = json.dumps(body, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'none'")
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        self.respond(405, {'error': 'Read-only mock API'})

    do_PUT = do_POST
    do_PATCH = do_POST
    do_DELETE = do_POST

    def log_message(self, format, *args):
        # Do not log URL queries: a future authenticated adapter may receive sensitive filters.
        pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='FlowPilot read-only mock ERP API')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    print(f'FlowPilot mock API: http://{args.host}:{args.port}/api/orders', flush=True)
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
