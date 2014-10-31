var shouldClose = 0

function closeWindow(){
    if((--shouldClose) == 0) {
        window.close()
    }
}

function clickHandler(e) {

    var chapterStringElement = document.querySelector('#chapterString')
    var queryStringElement = document.querySelector('#queryString');
    var nextPageQuery = queryStringElement.value;
    var chapterString = chapterStringElement.value;
    if(!nextPageQuery) {
        alert('must have a inempty query string')
    }
    if(queryStringElement.oldValue !== nextPageQuery || chapterStringElement.oldValue !== chapterString) {
        chrome.storage.local.set({'QueryString' : nextPageQuery, 'ChapterString' : chapterString},function(){closeWindow()})
        shouldClose++
        // update the old Value
        queryStringElement.oldValue = nextPageQuery
    }
    chrome.runtime.getBackgroundPage(function (backgroundWindow) {
        if (chapterString === "") {
            var tabController  = new backgroundWindow.TabController(null)
            tabController.boot({"nextPageQuery" : nextPageQuery, 'title' : null, imgArray : []})
        } else {
            var chapterController = new backgroundWindow.ChapterController()
            chapterController.boot({ "nextPageQuery" : nextPageQuery, "chapterString" : chapterString })
        }
        closeWindow()
    })
    shouldClose++
}


// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
document.addEventListener('DOMContentLoaded', function () {
    document.querySelector('#myshit').addEventListener('click', clickHandler);
    var queryStringElement = document.querySelector('#queryString')
    var chapterStringElement = document.querySelector('#chapterString')
    queryStringElement.value = 'img#curPic'
    queryStringElement.oldValue = 'img#curPic'
    chapterString.value = ''
    chapterString.oldValue = ''

    chrome.storage.local.get(["QueryString", "ChapterString"], function(items) {
        if ("QueryString" in items) {
            queryStringElement.value = items.QueryString
            queryStringElement.oldValue = items.QueryString
        }
        if ("ChapterString" in items) {
            chapterString.value = items.ChapterString
            chapterString.oldValue = items.ChapterString
        }
    });
});
