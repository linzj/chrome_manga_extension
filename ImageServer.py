#!/usr/bin/env python2
# -*- coding: utf-8 -*-

from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
from SocketServer import ThreadingMixIn
import threading
import cgi

count = 1
class Handler(BaseHTTPRequestHandler):

    def do_POST(self):
        ctype, pdict = cgi.parse_header(self.headers.getheader('content-type'))
        if ctype == 'multipart/form-data':
            self.saveInput(pdict)
        self.send_response(200)
        self.end_headers()
        message =  threading.currentThread().getName()
        self.wfile.write(message)
        self.wfile.write('\n')
        return
    def saveInput(self, pdict):
        global count
        print 'saving input'
        form = cgi.parse_multipart(self.rfile, pdict)
        name = '' + str(count)
        print 'printing keys'
        for key in form.keys():
            print key
        print 'printing keys ends'
        if 'title' in form and form['title']:
            name = form['title'] 
            name = ''.join(name).decode('utf-8')
            print name
        with open(name + '.mhtml', 'w') as f:
            f.write(''.join(form['mhtml']))
        count += 1

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""

if __name__ == '__main__':
    server = ThreadedHTTPServer(('localhost', 8787), Handler)
    print 'Starting server, use <Ctrl-C> to stop'
    server.serve_forever()
