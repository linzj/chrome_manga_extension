(function() {
    let old_open = XMLHttpRequest.prototype.open;
    let old_addEventListener = XMLHttpRequest.prototype.addEventListener;
    let video_array_buffer_parts = {};
    let audio_array_buffer_parts = {};
    let video_media_type = "webm";
    let audio_media_type = "webm";
    let video_playbackRateTimer = 0;
    let started = false;
    let last_video_stop = -1;
    let last_audio_stop = -1;
    let title = undefined;

    async function FlushBuffer(parts, type, media_type) {
        Object.keys(parts).forEach(async (k) => {
            let buffer = parts[k];
            let range = k;
            let response = await fetch(`http://localhost:8787/${title}_${type}.${media_type}`, {
                body: buffer,
                headers: {
                    'Content-Type': `application/${media_type}`,
                    'Range': range
                },
                cache: 'no-cache',
                credentials: 'omit',
                method: 'POST',
                mode: 'cors',
                referer: 'no-referer'
            });
        });
    }
    async function onVideoContent(buffer, range) {
        let split = range.split('-');
        let start = parseInt(split[0]);
        if (start != last_video_stop + 1) {
            console.log(`rejected video range ${range}, last_video_stop: ${last_video_stop}`);
            return;
        }
        last_video_stop = parseInt(split[1]);
        video_array_buffer_parts[range] = buffer;
        if (title) {
            FlushBuffer(video_array_buffer_parts, "video", video_media_type);
            video_array_buffer_parts = {};
        }
    }

    async function onAudioContent(buffer, range) {
        let split = range.split('-');
        let start = parseInt(split[0]);
        if (start != last_audio_stop + 1) {
            console.log(`rejected audio range ${range}, last_audio_stop: ${last_audio_stop}`);
            return;
        }
        last_audio_stop = parseInt(split[1]);
        audio_array_buffer_parts[range] = buffer;
        if (title) {
            FlushBuffer(audio_array_buffer_parts, "audio", audio_media_type);
            audio_array_buffer_parts = {};
        }
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
            let range = myurl.searchParams.get('range');
            // console.log(`should pay attention for host: ${myurl.host}, hostname: ${myurl.hostname}, href: ${myurl.href}, pathname: ${myurl.pathname}`);
            // for (const [key, value] of myurl.searchParams) {
            //     console.log(`key: ${key}, value: ${value}`);
            // }
            let thiz = this;
            this.addEventListener("load", (e) => {
                if (thiz.readyState == 4 && thiz.status == 200) {
                    console.log(`find a chunk ${thiz.getResponseHeader('content-type')}, range: ${range}, rn: ${myurl.searchParams.get('rn')}, rbuf: ${myurl.searchParams.get('rbuf')}.`);
                    let content_type = thiz.getResponseHeader('content-type');
                    if (content_type.includes('video')) {
                        if (range.split('-')[0] == '0') {
                            Start();
                        }
                        try {
                            video_media_type = mayChangeMediaType(content_type, video_media_type);
                        } catch (e) {}
                        onVideoContent(thiz.response, range);
                    } else if (content_type.includes('audio')) {
                        try {
                            audio_media_type = mayChangeMediaType(content_type, audio_media_type);
                        } catch (e) {}
                        onAudioContent(thiz.response, range);
                    }
                }
            });
        } else {
            this.should_pay_attention = false;
        }
        return old_open.apply(this, arguments);
    }

    function concatenate(arrays) {
        // Calculate byteSize from all arrays
        let size = 0;
        let sorted_keys = Object.keys(arrays);
        sorted_keys.sort((a, b) => {
            let a_range = a.split('-');
            let b_range = b.split('-');
            return parseInt(a_range[0]) - parseInt(b_range[0]);
        });
        // detect gaps
        let last_range = undefined;
        sorted_keys.forEach((k) => {
            const current_split = k.split('-');
            const current_range = [parseInt(current_split[0]), parseInt(current_split[1])];
            if (last_range) {
                if (last_range[1] + 1 != current_range[0])
                    console.log(`detected gaps at [${last_range[0]}, ${last_range[1]}) and [${current_range[0]}, ${current_range[1]})`);
            }
            last_range = current_range;
        });
        for (let k of sorted_keys) {
            size += arrays[k].byteLength;
        }
        // Allcolate a new buffer
        let result = new Uint8Array(size);

        // Build the new array
        let offset = 0;
        for (let k of sorted_keys) {
            let buf = arrays[k];
            result.set(new Uint8Array(buf), offset)
            offset += buf.byteLength;
        }

        return result;
    }


    function OnVideoEnded(e) {
        console.log('OnVideoEnded');
        Reset();
    }

    function Start() {
        if (started)
            return;
        console.log('Started');
        started = true;
        title = document.title;
        let video = document.querySelectorAll('video')[0];
        video_playbackRateTimer = setTimeout(() => {
            console.log(`video.playbackRate = ${video.playbackRate}`);
            let ranges = video.seekable;
            video.playbackRate = 2;
            for (let count = 0; count < ranges.length; count++) {
                console.log(`ranges ${count}: ${ranges.start(count)}, ${ranges.end(count)}`);
            }
        }, 1000);
        video.addEventListener('ended', OnVideoEnded);
    }

    function Reset() {
        started = false;
        last_video_stop = -1;
        last_audio_stop = -1;
        video_array_buffer_parts = {};
        audio_array_buffer_parts = {};
        video_media_type = "webm";
        audio_media_type = "webm";
        title = undefined;
        clearInterval(video_playbackRateTimer);
        let video = document.querySelectorAll('video')[0];
        video.removeEventListener('ended', OnVideoEnded);
    }
})();