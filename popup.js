function awesome() {
  // Do something awesome!
  chrome.tabs.getCurrent(function (tab){
      chrome.tabs.executeScript(undefined,
      {
          "code": " \
          var imgs = document.querySelectorAll('img'); \
          for (var i = 0;i < imgs.length;++i) \
          { \
              var img = imgs.item(i); \
              console.log(\"img width =\" + img.src ); \
          } \
          "
      });
  });
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
