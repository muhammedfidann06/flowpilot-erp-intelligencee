"""Exercise the real HTTP handler on an ephemeral loopback port and shut it down after the suite."""
import json
import sys
import threading
import unittest
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from server import Handler

class APITest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, path, method='GET'):
        try:
            response = urlopen(Request(self.base + path, method=method), timeout=5)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.load(response)

    def test_resources_and_pagination(self):
        for resource in ('suppliers','products','customers','orders','purchase-orders','inventory','deliveries','insights'):
            code, result = self.request('/api/' + resource + '?limit=2&offset=1')
            self.assertEqual(code, 200)
            self.assertEqual(len(result['data']), 2)
            self.assertGreater(result['total'], 2)

    def test_filter_and_record(self):
        code, result = self.request('/api/orders?period=2026-09&status=open')
        self.assertEqual(code, 200)
        self.assertTrue(all(o['date'].startswith('2026-09') and o['status']=='open' for o in result['data']))
        order = result['data'][0]
        self.assertEqual(self.request('/api/orders/' + order['id'])[1], order)

    def test_bad_input(self):
        for query in ('limit=0','limit=9999','offset=-1','offset=x','period=2025-01','unknown=x','limit=1&limit=2'):
            self.assertEqual(self.request('/api/orders?' + query)[0], 400, query)
        self.assertEqual(self.request('/api/orders/not-found')[0], 404)
        self.assertEqual(self.request('/api/../../etc/passwd')[0], 404)

    def test_read_only_and_health(self):
        self.assertEqual(self.request('/api/orders','POST')[0], 405)
        self.assertEqual(self.request('/health')[1]['status'], 'ok')
        self.assertEqual(self.request('/openapi.json')[1]['openapi'], '3.1.0')

if __name__ == '__main__':
    unittest.main()
