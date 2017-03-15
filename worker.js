function postreq() {
    if (this.readyState >=2) {
        if (this.status != 200) {
            console.error('cancled href: ' + this._href + '; status code: ' + this.status);
            this._ctx.downReq();
            return;
        }
    }
    if (this.readyState != 4) {
        return;
    }
    // console.log('post ' + this._href + ' okay.');
    this._ctx.imghrefSet.add(this._hrefImg);
    this._ctx.downReq();
};

function getrequest() {
    if (this.readyState >=2) {
        if (this.status != 200) {
            console.error('cancled href: ' + this._href + '; status code: ' + this.status);
            this._ctx.downReq();
            return;
        }
    }
    if (this.readyState != 4) {
        return;
    }
    // console.log('download ' + this._href + ' okay.');
    var href = 'http://127.0.0.1:8787/';
    var lastSlash = this._href.lastIndexOf("/");
    var ctx = this._ctx;
    if (lastSlash == -1) {
        href += "" + (ctx.namecount++);
    } else {
        path = this._href.substring(lastSlash + 1);
        var firstQuestion = path.indexOf("?");
        if (firstQuestion != -1) {
            path = path.substring(0, firstQuestion);
        }
        var dot = path.lastIndexOf(".");
        var ext = ".jpg";
        if (dot != -1) {
            ext = path.substring(dot)
        }
        href += "" + (ctx.namecount++) + ext;
    }
    // console.log('posting href: ' + href);
    var request = new XMLHttpRequest();
    request.open('post', href);
    request.responseType = 'text';
    request._href = href;
    request._hrefImg = this._href;
    request._ctx = this._ctx;
    request.send(this.response);
    request.onreadystatechange = postreq;
}

function TabController() {
    this.tabId = 0;
    this.reqcount = 0;
    this.namecount = 0;
    this.imghrefSet = new Set();
    this.updateListener = null;
    this.shouldFetch = true;
    this.retrycount = 0;
}

TabController.prototype = {
    boot : function () {
        console.log('boot called');
        chrome.tabs.query({"active" : true},function (tabs) {
                var tab = tabs[0];
                this.boot_(tab.id);
        }.bind(this));
        if (this.updateListener == null) {
            this.updateListener = function (tabId, changeInfo, tab) {
                if (tabId == this.tabId && changeInfo.hasOwnProperty("status")) {
                    if(changeInfo.status === "complete") {
                        this.onTabCompleted();
                    }
                }
            }.bind(this)
            chrome.tabs.onUpdated.addListener(this.updateListener);
        }
        setTimeout(this.fetchIfNeeded.bind(this), 2000);
    },
    boot_ : function(tabId) {
            this.tabId = tabId;
            this.fetch();
    },
    downReq: function () {
        if (--this.reqcount == 0) {
            this.nextpage();
        }
    },
    fetch: function() {
        if (this.retrycount == 5) {
            this.nextpage();
            return;
        }
        chrome.tabs.executeScript(this.tabId, {"allFrames": false ,"file": "fetchImage.js", "runAt": "document_end"},function (hrefs) {
            hrefs = hrefs[0];
            if (hrefs.length == 0) {
                setTimeout(this.fetch.bind(this), 1000);
                this.retrycount++;
                return;
            }
            for (i = 0; i < hrefs.length; ++i) {
                var href = hrefs[i];
                if (this.imghrefSet.has(href)) {
                    continue;
                }
                var request = new XMLHttpRequest();
                // console.log('send one request: ', href);
                request.open('get', href);
                request.responseType = 'blob';
                request._href = href;
                request._ctx = this;
                request.onreadystatechange = getrequest;
                request.send();
                this.reqcount++;
            }
            console.log('fetch script executed : this.reqcount: ' + this.reqcount);
            if (this.reqcount == 0) {
                this.nextpage();
            }
        }.bind(this));
    },
    nextpage: function() {
        console.log('next page.');
        this.shouldFetch = true;
        this.retrycount = 0;
        chrome.tabs.executeScript(this.tabId, {"allFrames": false ,"file": "nextpage.js", "runAt": "document_end"}, function() {
            setTimeout(this.fetchIfNeeded.bind(this), 2000);
        }.bind(this));
    },
    onTabCompleted: function() {
        console.log('onTabCompleted');
        this.fetchIfNeeded();
    },
    fetchIfNeeded: function() {
        if (this.shouldFetch) {
            this.shouldFetch = false;
            this.fetch();
        }
    }
}

function start() {
    new TabController().boot();
}
