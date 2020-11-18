(function() {
    let old_open = XMLHttpRequest.prototype.open;
    let old_addEventListener = XMLHttpRequest.prototype.addEventListener;
    let video_array_buffer_parts = [];
    let audio_array_buffer_parts = [];

    function onVideoContent(buffer) {
        video_array_buffer_parts.push(buffer);
    }

    function onAudioContent(buffer) {
        audio_array_buffer_parts.push(buffer);
    }

    XMLHttpRequest.prototype.open = function(method, url, _async, user, password) {
        console.log('open');
        if (method.toUpperCase() == "GET" && url.includes('videoplayback')) {
            this.should_pay_attention = true;
            let myurl = new URL(url);
            console.log(`rbuf: ${myurl.searchParams.get('rbuf')}`);
            // console.log(`should pay attention for host: ${myurl.host}, hostname: ${myurl.hostname}, href: ${myurl.href}, pathname: ${myurl.pathname}`);
            // for (const [key, value] of myurl.searchParams) {
            //     console.log(`key: ${key}, value: ${value}`);
            // }
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
                    let content_type = thiz.getResponseHeader('content-type');
                    if (content_type.includes('video')) {
                        onVideoContent(thiz.response);
                    } else if (content_type.includes('audio')) {
                        onAudioContent(thiz.response);
                    }
                }
                listener(e);
            }, useCapture]);
        }
        return old_addEventListener.apply(this, arguments);
    }

    function concatenate(arrays) {
        // Calculate byteSize from all arrays
        let size = arrays.reduce((a, b) => a + b.byteLength, 0);
        // Allcolate a new buffer
        let result = new Uint8Array(size);

        // Build the new array
        let offset = 0;
        for (let arr of arrays) {
            result.set(new Uint8Array(arr), offset)
            offset += arr.byteLength;
        }

        return result;
    }

    function SaveData(type, data) {
        let array_buffer = concatenate(data);
        console.log(`${type} size: ${array_buffer.byteLength}`);
        let array_blob = new Blob([array_buffer.buffer], {
            type: "application/webm"
        });
        let object_url = URL.createObjectURL(array_blob);
        let a = document.createElement('a');
        a.href = object_url;
        a.setAttribute('download', `${type}.webm`);
        document.body.append(a);
        a.click();
        a.remove();
    }
    window.addEventListener('load', () => {
        let video = document.querySelectorAll('video')[0];
        video.addEventListener('ended', (e) => {
            SaveData('video', video_array_buffer_parts);
            SaveData('audio', audio_array_buffer_parts);
        });
    });
})();
