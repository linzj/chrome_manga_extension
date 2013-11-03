function Override() {
}
Override.prototype.override = function (overrideDetails){
    if("codes" in overrideDetails) {
        this.codes = overrideDetails.codes
        var object = this
        chrome.tabs.getCurrent(function (tab){
            object.tabId = tab.id
            chrome.tabs.executeScript(object.tabId,
            {
                "file": "overrideContentScript.js"
            },function(results) { object.onScriptExecuted(results););
        });
    }
}

Override.prototype.onScriptExecuted = function (results) {
    var object = this
    chrome.tabs.sendMessage(this.tabId,this.codes,function() { this.toNext(); });
}

Override.prototype.toNext = function () {
}

function clickHandler(e) {
    var override = new Override() 
    override.override()
}

function main() {
  // Initialization work goes here.
}

// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('#myshit').addEventListener('click', clickHandler);
  main();
});
