#!/usr/bin/env python2
# -*- coding: utf-8 -*-

from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
from SocketServer import ThreadingMixIn
import threading
import cgi, StringIO, base64, os, sys, locale, re, io
import os.path
from urllib import unquote

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        ctype, pdict = cgi.parse_header(self.headers.getheader('content-type'))
        contentLength = int(self.headers.getheader('content-length'))
        _range = self.headers.getheader('range')
        self.saveInput(self.rfile.read(contentLength), _range)
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        message =  threading.currentThread().getName()
        self.wfile.write(message)
        self.wfile.write('\n')
        return
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', self.headers.getheader('Access-Control-Request-Headers'))
        self.send_header('Access-Control-Allow-Methods', 'POST,OPTIONS')
        self.end_headers()
        return
    def saveInput(self, data, _range):
        path = self.path
        path = path[1:]
        path = unquote(path)
        print('saving file {0} in range: {1}, len: {2}'.format(path, str(_range), len(data)))
        mode = 'r+b'
        if not os.path.exists(path):
            mode = 'wb'
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
    print 'Starting server, use <Ctrl-C> to stop'
    server.serve_forever()
