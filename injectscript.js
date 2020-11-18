(function() {
    let old_open = XMLHttpRequest.prototype.open;
    let old_addEventListener = XMLHttpRequest.prototype.addEventListener;
    let video_array_buffer_parts = [];
    let audio_array_buffer_parts = [];
    let video_media_type = "webm";
    let audio_media_type = "webm";

    function onVideoContent(buffer) {
        video_array_buffer_parts.push(buffer);
    }

    function onAudioContent(buffer) {
        audio_array_buffer_parts.push(buffer);
    }

    function mayChangeMediaType(content_type, old_media_type) {
        let new_media_type = content_type.split('/')[1];
        let may_need_to_change = false;
        if (new_media_type == "webm") {
            may_need_to_change = true;
        } else if (new_media_type == "mp4") {
            may_need_to_change = true;
        }
        if (may_need_to_change && new_media_type != old_media_type) {
            return new_media_type;
        }
        return old_media_type;
    }

    XMLHttpRequest.prototype.open = function(method, url, _async, user, password) {
        console.log('open');
        if (method.toUpperCase() == "GET" && url.includes('videoplayback')) {
            this.should_pay_attention = true;
            let myurl = new URL(url);
            let rbuf = myurl.searchParams.get('rbuf');
            if (rbuf == '0') {
                video_array_buffer_parts = [];
                audio_array_buffer_parts = [];
                video_media_type = "webm";
                audio_media_type = "webm";
            }
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
                        try {
                            video_media_type = mayChangeMediaType(content_type, video_media_type);
                        } catch (e) {}
                        onVideoContent(thiz.response);
                    } else if (content_type.includes('audio')) {
                        try {
                            audio_media_type = mayChangeMediaType(content_type, audio_media_type);
                        } catch (e) {}
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

    function SaveData(type, data, media_type) {
        let array_buffer = concatenate(data);
        console.log(`${type} size: ${array_buffer.byteLength}`);
        let array_blob = new Blob([array_buffer.buffer], {
            type: `application/${media_type}`
        });
        let object_url = URL.createObjectURL(array_blob);
        let a = document.createElement('a');
        a.href = object_url;
        a.setAttribute('download', `${type}.${media_type}`);
        document.body.append(a);
        a.click();
        a.remove();
    }
    window.addEventListener('load', () => {
        let video = document.querySelectorAll('video')[0];
        let video_playbackRateTimer = setInterval(() => {
            video.playbackRate = 16.0;
        }, 1000);
        video.addEventListener('ended', (e) => {
            SaveData('video', video_array_buffer_parts, video_media_type);
            SaveData('audio', audio_array_buffer_parts, audio_media_type);
            video_array_buffer_parts = []
            audio_array_buffer_parts = []
            clearInterval(video_playbackRateTimer);
        });
    });
})();