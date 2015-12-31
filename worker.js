function postreq() {
    if (this.readyState >=2) {
        if (this.status != 200) {
            console.error('cancled href: ' + this._href + '; status code: ' + this.status);
            return;
        }
    }
    if (this.readyState != 4) {
        return;
    }
    console.log('post ' + this._href + ' okay.');
};

function getrequest() {
    if (this.readyState >=2) {
        if (this.status != 200) {
            console.error('cancled href: ' + this._href + '; status code: ' + this.status);
            return;
        }
    }
    if (this.readyState != 4) {
        return;
    }
    console.log('download ' + this._href + ' okay.');
    var href = 'http://127.0.0.1:8787/';
    var lastSlash = this._href.lastIndexOf("/");
    if (lastSlash == -1) {
        href += "" + (ctx.count++);
    } else {
        path = this._href.substring(lastSlash + 1);
        var firstQuestion = path.indexOf("?");
        if (firstQuestion != -1) {
            path = path.substring(0, firstQuestion);
        }
        href += path;
    }
    console.log('posting href: ' + href);
    var request = new XMLHttpRequest();
    request.open('post', href);
    request.responseType = 'text';
    request._href = href;
    request.send(this.response);
    request.onreadystatechange = postreq;
}

function TabController() {
    this.tabId = 0
}

TabController.prototype = {
    boot : function () {
        console.log('boot called');
        chrome.tabs.query({"active" : true},function (tabs) {
                var tab = tabs[0];
                this.boot_(tab.id);
        }.bind(this));
    },
    boot_ : function(tabId) {
            this.tabId = tabId;
            chrome.tabs.executeScript(this.tabId, {"allFrames": false ,"file": "fetchImage.js", "runAt": "document_end"},function (hrefs) {
                hrefs = hrefs[0];
                for (i = 0; i < hrefs.length; ++i) {
                    var href = hrefs[i];
                    var request = new XMLHttpRequest();
                    console.log('send one request: ', href);
                    request.open('get', href);
                    request.responseType = 'blob';
                    request._href = href;
                    request._ctx = this;
                    request.onreadystatechange = getrequest;
                    request.send();
                }
            }.bind(this));
    },
}

function start() {
    new TabController().boot();
}
