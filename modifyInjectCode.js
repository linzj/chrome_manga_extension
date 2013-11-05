
chrome.runtime.onMessage.addListener(function (message,sender,sendRespond) {
    var html = document.documentElement;
    // clear the child
    for(var i = 0 ;i < html.childNodes.length;++i) {
        html.removeChild(html.childNodes[i])
    }
    // create head node
    var head = document.createElement('head')
    html.appendChild(head)
    // create script node
    var script = document.createElement('script')
    script.innerHTML = '\n' +
    'var min = 0,max = ' + message.length + ' ,current = 0\n' +
    'function next(){ if(current < (max - 1)) {document.getElementById(""+current).style.display="none";document.getElementById(""+(current+1)).style.display="block";current+=1;}}\n'+
    'function previous() { if(current > min){document.getElementById(""+current).style.display="none";document.getElementById(""+(current-1)).style.display="block";current-=1;}}\n'

    head.appendChild(script)
    // create body node
    var body = document.createElement('body')
    html.appendChild(body)
    // append img node 
    for(var i = 0;i < message.length;++i) {
        var url = message[i]
        var img = document.createElement('img')
        img.src = url
        img.id = i
        img.style.display = 'none'
        body.appendChild(img)
    }
    document.getElementById('0').style.display = 'block'
    var previous = document.createElement('button')
    previous.innerHTML = 'previous'
    previous.id = 'prev'
    previous.style.float = 'left'
    body.appendChild(previous) 


    var next = document.createElement('button')
    next.innerHTML = 'next'
    next.id = 'next'
    next.style.float = 'right'
    body.appendChild(next) 
    // add another script tag to change next & previous 
    var script2 = document.createElement('script')
    script2.innerHTML = '\n' +
    'document.getElementById("prev").onclick = previous;document.getElementById("next").onclick = next;'
    body.appendChild(script2)
    chrome.runtime.onMessage.removeListener(arguments.callee)
})