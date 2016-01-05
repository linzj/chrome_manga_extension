chrome.runtime.onMessage.addListener(function (message, sender, sendRespond) {
    var html = document.documentElement;
    // clear the child
    var childNodesSize = html.childNodes.length;
    for(var i = 0; i < childNodesSize; ++i) {
        html.removeChild(html.childNodes[0])
    }
    // create head node
    var head = document.createElement('head')
    html.appendChild(head)
    // create script node
    var script = document.createElement('script')
    var urls = message.urls
    script.innerHTML = '\n' +
    'var min = 0,max = ' + urls.length + ' ,current = 0\n' +
    'function next(){ if(current < (max - 1)) {document.getElementById(""+current).style.display="none";document.getElementById(""+(current+1)).style.display="block";current+=1;}}\n'+
    'function previous() { if(current > min){document.getElementById(""+current).style.display="none";document.getElementById(""+(current-1)).style.display="block";current-=1;}}\n'

    head.appendChild(script)
    // create body node
    var body = document.createElement('body')
    html.appendChild(body)
    var previous = document.createElement('button')
    previous.innerHTML = 'previous'
    previous.id = 'prev'
    previous.style.float = 'left'
    body.appendChild(previous) 


    var next = document.createElement('button')
    var imgCount = 0
    next.innerHTML = 'next'
    next.id = 'next'
    next.style.float = 'right'
    body.appendChild(next) 
    window.__modify__okay__ = false
    window.imgCount = 0;
    // append img node 
    for(var i = 0; i < urls.length; ++i) {
        var url = urls[i]
        var img = document.createElement('img')
        img.src = url
        img.id = i
        img.style.display = 'none'
        body.appendChild(img)
        window.imgCount++
        img.addEventListener('load', function () {
            window.imgCount--;
            if (window.imgCount == 0) {
                window.__modify__okay__ = true
            }
        });
        img.addEventListener('error', function () {
            window.imgCount--;
            if (window.imgCount == 0) {
                window.__modify__okay__ = true
            }
            window.body.removeChild(img);
        });
    }
    document.getElementById('0').style.display = 'block'
    // add another script tag to change next & previous 
    var script2 = document.createElement('script')
    script2.innerHTML = '\n' +
    'document.getElementById("prev").onclick = previous;document.getElementById("next").onclick = next;'
    body.appendChild(script2)
    document.title = message.title
    chrome.runtime.onMessage.removeListener(arguments.callee)
    sendRespond('okay')
    chrome.runtime.onMessage.addListener(function (message, sender, sendRespond2) {
        sendRespond2(window.imgCount)
    })
})
