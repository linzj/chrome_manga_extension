(function() {
    let old_open = XMLHttpRequest.prototype.open;
    let old_addEventListener = XMLHttpRequest.prototype.addEventListener;
    XMLHttpRequest.prototype.open = function(method, url, _async, user, password) {
        console.log('open');
        if (method.toUpperCase() == "GET" && url.includes('videoplayback')) {
            this.should_pay_attention = true;
            console.log(`should pay attention for ${url}`);
        } else {
            this.should_pay_attention = false;
        }
        return old_open.apply(this, arguments);
    }
    XMLHttpRequest.prototype.addEventListener = function(type, listener, useCapture) {
        if (this.should_pay_attention && type.toUpperCase() == "LOAD") {
            let thiz = this;
            return old_addEventListener.apply(this, [type, function(e) {
                if (thiz.readyState == 4 && thiz.status == 200) {
                    console.log(`find a chunk ${thiz.getResponseHeader('content-type')}`);
                }
                listener(e);
            }, useCapture]);
        }
        return old_addEventListener.apply(this, arguments);
    }
})();
