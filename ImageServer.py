#!/usr/bin/env python2
# -*- coding: utf-8 -*-

from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
from SocketServer import ThreadingMixIn
import threading
import cgi, StringIO, base64, os, sys, locale

def parseNext(content, boundary):
    end = content.find(boundary)
    return content[0 : end], content[end + len(boundary) : ].lstrip()

def filterOutIllegal(mystr):
   start = mystr.find('/')
   if start != -1:
       return mystr[:start]
   return mystr

def toPreferred(s):
    if 'utf-8' == locale.getpreferredencoding():
        return s
    ret = s.decode('utf-8').encode(locale.getpreferredencoding())
    return filterOutIllegal(ret)

def parseContent(content):
    fp = StringIO.StringIO(content)
    save = False
    path = None

    while True:
        line = fp.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            break
        splitPoint = line.find(':')
        if splitPoint == -1:
            raise Exception('parseContent: splitPoint == -1: line: ' + line)
        key = line[ 0 : splitPoint]
        value = line[ splitPoint + 1 :]
        if key == 'Content-Transfer-Encoding':
            value = value.lstrip()
            if value == 'base64':
                save = True
        if key == 'Content-Location':
            path = value.lstrip()
    data = fp.read()
    if save:
        return data, path
    return None, None

def save(path, base64Data, title):
    lastSlash = path.rfind('/')
    if lastSlash != -1:
        path = path[lastSlash + 1:]
    title = toPreferred(title)
    path = toPreferred(path)
    if os.path.exists(title) :
        if not os.path.isdir(title):
            print >>sys.stderr, "file exists and stop the saving: " + title
            return False
    else:
        os.mkdir(title)

    filePath = title + os.sep + path
    with open(filePath, 'wb') as f:
        f.write(base64.b64decode(base64Data))

def reconfigurePath(path, indx):
    path, ext = os.path.splitext(path)
    if not ext:
        return path
    return '%03d%s' % (indx, ext)

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
        print 'saving input'
        form = cgi.parse_multipart(self.rfile, pdict)
        if 'title' in form and form['title']:
            title = form['title']
            title = ''.join(title)
            print toPreferred(title)
        mhtml = ''.join(form['mhtml'])

        boundaryKeyword = 'boundary='
        boundaryStart = mhtml.find(boundaryKeyword) + len(boundaryKeyword) + 1
        boundaryEnd = mhtml.find('"', boundaryStart)
        boundary = mhtml[boundaryStart : boundaryEnd]

        realStart = mhtml.find(boundary, boundaryEnd) + len(boundary)
        mhtml = mhtml[realStart:].lstrip()
        if not boundary:
            raise Exception('boundary should not be empty')
        indx = 1;
        while True:
            content, mhtml = parseNext(mhtml, boundary)
            base64Data, path = parseContent(content)
            if path and base64:
                save(reconfigurePath(path, indx), base64Data, title)
                indx += 1
            if not mhtml or mhtml.rstrip() == '--':
                break


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""

if __name__ == '__main__':
    server = ThreadedHTTPServer(('localhost', 8787), Handler)
    print 'Starting server, use <Ctrl-C> to stop'
    server.serve_forever()
