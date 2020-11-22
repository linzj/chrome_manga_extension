#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import threading
import cgi, base64, os, sys, locale, re, io
import os.path
from urllib.parse import unquote

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        ctype, pdict = cgi.parse_header(self.headers['content-type'])
        contentLength = int(self.headers['content-length'])
        _range = self.headers['range']
        self.saveInput(self.rfile.read(contentLength), _range)
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        message = threading.currentThread().getName()
        self.wfile.write(message.encode('utf-8'))
        self.wfile.write('\n'.encode('utf-8'))
        return
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', self.headers['Access-Control-Request-Headers'])
        self.send_header('Access-Control-Allow-Methods', 'POST,OPTIONS')
        self.end_headers()
        return
    def saveInput(self, data, _range):
        path = self.path
        path = path[1:]
        path = unquote(path)
        if sys.platform == 'win32':
            path = path.encode('utf-8')
            path = path.replace(b':', b"\xef\xbc\x9a")
            path = path.replace(b'?', b"_")
            path = path.replace(b'<', b"_")
            path = path.replace(b'>', b"_")
            path = path.replace(b'"', b"_")
            path = path.replace(b'|', b"_")
            path = path.replace(b'\\', b"_")
            path = path.replace(b'\/', b"_")
            path = path.decode('utf-8')
        mode = 'r+b'
        if not os.path.exists(path):
            mode = 'wb'
        print('saving file {0} in range: {1}, len: {2} on mode {3}, encoding {4}'.format(path, str(_range), len(data), mode, sys.getfilesystemencoding()))
        with io.open(path, mode) as f:
            start = int(_range.split('-')[0])
            seek_value = f.seek(start, 0)
            if -1 == seek_value:
                print('seek failed')
                raise Exception('seek failed')
            print('seeked to {0} or {1}'.format(str(f.tell()), str(seek_value)))
            f.write(data)


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""

if __name__ == '__main__':
    server = ThreadedHTTPServer(('localhost', 8787), Handler)
    print('Starting server, use <Ctrl-C> to stop')
    server.serve_forever()
