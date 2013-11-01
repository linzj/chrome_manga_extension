function awesome() {
  // Do something awesome!
  chrome.tabs.getCurrent(function (tab){
      chrome.tabs.executeScript(undefined,
      {
          "file": "injectCode.js"
      },onScriptExecuted);
  });
}

function validateUrl(url) {
    // only fetch http or https
    return url.indexOf("http") == 0;
}

function downloadUrl(url) {
    chrome.downloads.download({
        "url":url
        });
}

function onScriptExecuted(results)
{
    var myresult = results[0]
    for(var i = 0;i < myresult.length;++i) {
        if(validateUrl(myresult[i])){
            downloadUrl(myresult[i])
        }
    }
}

function totallyAwesome() {
  // do something TOTALLY awesome!
}

function awesomeTask() {
  awesome();
  totallyAwesome();
}

function clickHandler(e) {
  setTimeout(awesomeTask, 1000);
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
