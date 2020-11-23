#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import threading
import base64, os, sys, subprocess, re, io
import os.path
from urllib.parse import unquote

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        contentLength = int(self.headers['content-length'])
        _range = self.headers['range']
        data = self.rfile.read(contentLength)
        if _range:
            self.saveInput(self.decodePath(), data, _range)
        else:
            #self.saveInput(self.decodePath() + self.prefixFromContentType(self.headers['content-type']), data, self.determineRangeFromData(data))
            self.determineRangeFromData(data)

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
    def saveInput(self, path, data, _range):
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

    def decodePath(self):
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
        return path

    def prefixFromContentType(self, content_type):
        split = content_type.split('/')
        return '_{0}.{1}'.format(*split)

    def determineRangeFromData(self, data):
        process = subprocess.run(['ffprobe', '-show_format', "-loglevel", "verbose", '-'], input=data, capture_output=True)
        stdout = process.stdout.decode('utf-8')
        stderr = process.stderr.decode('utf-8')
        print("determineRangeFromData: {0} {1} input data length: {2}".format(stdout, stderr, len(data)))


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""

if __name__ == '__main__':
    server = ThreadedHTTPServer(('localhost', 8787), Handler)
    print('Starting server, use <Ctrl-C> to stop')
    server.serve_forever()
