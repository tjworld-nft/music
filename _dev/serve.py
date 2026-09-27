#!/usr/bin/env python3
"""Range 対応の静的サーバー（音声のシークを試すため）。usage: serve.py <root> <port>"""
import os, sys, re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
class H(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.m4a': 'audio/mp4', '.webp': 'image/webp', '.js': 'text/javascript', '.json': 'application/json'}
    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes'); self.send_header('Cache-Control', 'no-cache'); super().end_headers()
    def send_head(self):
        rng = self.headers.get('Range')
        path = self.translate_path(self.path)
        if os.path.isdir(path): path = os.path.join(path, 'index.html')
        if not rng and os.path.isfile(path) and path.endswith(('.html', '.css', '.js', '.json', '.svg', '.xml', '.txt')) and 'gzip' in (self.headers.get('Accept-Encoding') or ''):
            import gzip, io
            data = gzip.compress(open(path, 'rb').read(), 6)
            self.send_response(200); self.send_header('Content-Type', self.guess_type(path)); self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(data))); self.send_header('Vary', 'Accept-Encoding'); self.end_headers()
            self._left = None
            return io.BytesIO(data)
        if not rng or not os.path.isfile(path): return super().send_head()
        m = re.match(r'bytes=(\d*)-(\d*)', rng); size = os.path.getsize(path)
        a = int(m.group(1)) if m.group(1) else max(0, size - int(m.group(2)))
        b = int(m.group(2)) if m.group(1) and m.group(2) else size - 1
        b = min(b, size - 1)
        f = open(path, 'rb'); f.seek(a)
        self.send_response(206); self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {a}-{b}/{size}'); self.send_header('Content-Length', str(b - a + 1)); self.end_headers()
        self._left = b - a + 1
        return f
    def copyfile(self, src, dst):
        left = getattr(self, '_left', None)
        if left is None: return super().copyfile(src, dst)
        while left > 0:
            chunk = src.read(min(65536, left))
            if not chunk: break
            dst.write(chunk); left -= len(chunk)
    def log_message(self, *a): pass
root, port = sys.argv[1], int(sys.argv[2])
ThreadingHTTPServer(('127.0.0.1', port), partial(H, directory=root)).serve_forever()
