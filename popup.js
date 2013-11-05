


function clickHandler(e) {
    chrome.runtime.getBackgroundPage(function (backgroundWindow) {
        backgroundWindow.boot([]);
    })
}


// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('#myshit').addEventListener('click', clickHandler);
});
