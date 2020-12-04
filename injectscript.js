(function() {
    let old_open = XMLHttpRequest.prototype.open;
    let old_addSourceBuffer = MediaSource.prototype.addSourceBuffer;
    let old_appendStream = SourceBuffer.prototype.appendStream;
    let old_appendBuffer= SourceBuffer.prototype.appendBuffer;
    let video_array_buffer_parts = [];
    let audio_array_buffer_parts = [];
    let video_media_type = "webm";
    let audio_media_type = "webm";
    let video_playbackRateTimer = 0;
    let started = false;
    let last_video_stop = 0;
    let last_audio_stop = 0;
    let title = undefined;

    function GetTitle() {
        if (!title) {
            title = document.title;
        }
    }

    function ResetBuffers() {
      ResetVideoBuffer();
      ResetAudioBuffer();
    }

    function ResetVideoBuffer() {
      video_array_buffer_parts = [];
      video_array_buffer_parts.first_buffer = true;
    }

    function ResetAudioBuffer() {
      audio_array_buffer_parts = [];
      audio_array_buffer_parts.first_buffer = true;
    }

    async function FlushBuffer(parts, type, media_type) {
        parts.forEach(async (buffer) => {
            let response = await fetch(`http://localhost:8787/${title}_${type}.${media_type}`, {
                body: buffer,
                headers: {
                    'Content-Type': `application/${media_type}`,
                    'Seek-To-Head': (parts.first_buffer ? "true" : "false")
                },
                cache: 'no-cache',
                credentials: 'omit',
                method: 'POST',
                mode: 'cors',
                referer: 'no-referer'
            });
        });
    }
    async function OnVideoContent(buffer) {
        video_array_buffer_parts.push(buffer);
        GetTitle();
        if (title) {
            FlushBuffer(video_array_buffer_parts, "video", video_media_type);
            video_array_buffer_parts = [];
        }
    }

    async function OnAudioContent(buffer) {
        audio_array_buffer_parts.push(buffer);
        if (title) {
            FlushBuffer(audio_array_buffer_parts, "audio", audio_media_type);
            audio_array_buffer_parts = [];
        }
    }

    // hook Media.addSourceBuffer;
    function addSourceBuffer(type) {
        console.log(`type: ${type}`);
        let new_source_buffer = old_addSourceBuffer.apply(this, arguments);
        new_source_buffer.type = type;
        new_source_buffer.is_video = true;
        if (type.includes('audio')) {
          new_source_buffer.is_video = false;
        }
        // get media type.
        let mime = type.split(';')[0];
        if (new_source_buffer.is_video) {
          video_media_type = mime.split('/')[1];
          ResetVideoBuffer();
        } else {
          audio_media_type = mime.split('/')[1];
          ResetAudioBuffer();
        }
        new_source_buffer.addEventListener('updateend', (e) => {
            let info = `type: ${type}, buffered: [`;
            for (let i = 0; i < new_source_buffer.buffered.length; ++i) {
                info = info + `(${new_source_buffer.buffered.start(i)}, ${new_source_buffer.buffered.end(i)}), `
            }
            info = info + ']';
            info = info + `; timestampOffset: ${new_source_buffer.timestampOffset}.`;
            console.log(info);
        });
        new_source_buffer.addEventListener('abort', (e) => {
          console.log('OnSourceBuffer abort');
          ResetBuffers();
        });
        return new_source_buffer;
    }
    MediaSource.prototype.addSourceBuffer = addSourceBuffer;
    // hook SourceBuffer.prototype.appendStream
    function appendStream(stream) {
        console.log(`appending stream.`);
        return old_appendStream.apply(this, arguments)
    }
    SourceBuffer.prototype.appendStream = appendStream;
    // hook SourceBuffer.prototype.appendBuffer
    function appendBuffer(ab) {
        console.log(`appending ab length: ${ab.byteLength}, type:${this.type}.`);
        if (this.is_video) {
          if (!started)
            Start();
          OnVideoContent(ab);
        } else {
          OnAudioContent(ab);
        }
        return old_appendBuffer.apply(this, arguments)
    }
    SourceBuffer.prototype.appendBuffer = appendBuffer;

    function OnVideoEnded(e) {
        console.log('OnVideoEnded');
        Reset();
    }

    function Start() {
        if (started)
            return;
        console.log('Started');
        started = true;
        GetTitle();
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
        last_video_stop = 0;
        last_audio_stop = 0;
        ResetBuffers();
        video_media_type = "webm";
        audio_media_type = "webm";
        title = undefined;
        clearInterval(video_playbackRateTimer);
        let video = document.querySelectorAll('video')[0];
        video.removeEventListener('ended', OnVideoEnded);
    }
})();
