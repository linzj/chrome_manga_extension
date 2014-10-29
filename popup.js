var shouldClose = 0

function closeWindow(){
    if((--shouldClose) == 0) {
        window.close()
    }
}

function clickHandler(e) {

    var queryStringElement = document.querySelector('#queryString');
    var imgStringElement = document.querySelector('#imgString');
    var nextPageQuery = queryStringElement.value;
    var imgQuery = imgStringElement.value;
    if(!nextPageQuery || !imgQuery) {
        alert('must have a inempty query string')
    }
    if(queryStringElement.oldValue !== nextPageQuery || imgStringElement.oldValue !== imgQuery) {
        chrome.storage.local.set({'QueryString' : nextPageQuery, 'ImgString' : imgQuery },function(){closeWindow()})
        shouldClose++
        // update the old Value
        queryStringElement.oldValue = nextPageQuery
        imgStringElement.oldValue = imgQuery
    }

    chrome.runtime.getBackgroundPage(function (backgroundWindow) {
        var tabController  = new backgroundWindow.TabController()
        tabController.boot({"nextPageQuery" : nextPageQuery, 'imgQuery' : imgQuery, imgArray : []})
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
    var imgStringElement = document.querySelector('#imgString');
    queryStringElement.value = 'img#curPic'
    queryStringElement.oldValue = 'img#curPic'
    imgStringElement.value = 'img#curPic'
    imgStringElement.oldValue = 'img#curPic'
    chrome.storage.local.get("QueryString",function(items) {
        if ("QueryString" in items) {
            queryStringElement.value = items.QueryString
            queryStringElement.oldValue = items.QueryString
        }
        if ("ImgString" in items) {
            imgStringElement.value = items.ImgString
            imgStringElement.oldValue = items.ImgString
        }
    });
});
