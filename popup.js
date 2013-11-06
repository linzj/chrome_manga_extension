

function clickHandler(e) {

    var queryStringElement = document.querySelector('#queryString');
    var nextPageQuery = queryStringElement.value;
    if(!nextPageQuery) {
        alert('must have a inempty query string')
    }
    if(queryStringElement.oldValue != nextPageQuery) {
        chrome.storage.local.set({'QueryString':nextPageQuery})
        // update the old Value
        queryStringElement.oldValue = nextPageQuery
    }
    chrome.runtime.getBackgroundPage(function (backgroundWindow) {
        backgroundWindow.boot([],{"nextPageQuery":nextPageQuery});
    })
    // boot([])
}


// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
document.addEventListener('DOMContentLoaded', function () {
    document.querySelector('#myshit').addEventListener('click', clickHandler);
    var queryStringElement = document.querySelector('#queryString')
    queryStringElement.value = 'img#curPic'
    queryStringElement.oldValue = 'img#curPic'
    chrome.storage.local.get("QueryString",function(items) {
        if("QueryString" in items) {
            var queryStringElement = document.querySelector('#queryString');
            queryStringElement.value = items.QueryString
            queryStringElement.oldValue = items.QueryString
        }
    });
});
