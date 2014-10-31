chrome.runtime.onMessage.addListener(function (message,sender,sendRespond) {
    var elements = document.querySelectorAll(message.selector)
    var ret = []
    for (var i in elements) {
        ret.push(elements[i][message.target])
    }
    sendRespond(ret)
})

