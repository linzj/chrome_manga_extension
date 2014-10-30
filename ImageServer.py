#!/usr/bin/env python2
# -*- coding: utf-8 -*-

from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
from SocketServer import ThreadingMixIn
import threading

count = 1
class Handler(BaseHTTPRequestHandler):

    def do_GET(self):
        self.saveInput()
        self.send_response(200)
        self.end_headers()
        message =  threading.currentThread().getName()
        self.wfile.write(message)
        self.wfile.write('\n')
        return
    def saveInput(self):
        global count
        with open('' + count + '.mhtml') as f:
            f.write(self.rfile.read())

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""

if __name__ == '__main__':
    server = ThreadedHTTPServer(('localhost', 8787), Handler)
    print 'Starting server, use <Ctrl-C> to stop'
    server.serve_forever()
