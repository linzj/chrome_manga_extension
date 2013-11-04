var nextPageQuery = "a.n"
var nextPageTimeOut = 10000
var globalScripts = ["alert","confirm"]

function boot(imgArray){
    chrome.tabs.query({"active":true},function (tabs){
            var tab = tabs[0]
            var myInstallObserver = new InstallObserver(globalScripts) 
            myInstallObserver.installObserver(tab,imgArray)
            });
}

function InstallObserver(scripts) {
    this.scripts = scripts
    this.hasBluntScripts = false
}

InstallObserver.prototype.installObserver = function (tab,imgArray){
    this.tabId = tab.id
    this.imgArray = imgArray
    var object = this
    if(tab.status == "loading") {
        chrome.tabs.onUpdated.addListener(function (tabId,changeInfo,tab) {
            if(tabId == object.tabId && changeInfo.hasOwnProperty("status") && changeInfo.status == "complete"){
                object.nextStep()
                chrome.tabs.onUpdated.removeListener(arguments.callee)
            }
            if(!object.hasBluntScripts) {
                object.hasBluntScripts = true
                var bluntCode = "\n" +
                'var injectScript=function(d){var c=Math.random().toString().substr(2),a=document.createElement("script");a.id=c;a.type="text/javascript";a.innerHTML=d+";document.documentElement.removeChild(document.getElementById(\'"+c+"\'));";document.documentElement.appendChild(a)};\n' +
                'var injectCode = \'var scripts = ' + JSON.stringify(object.scripts) + ';for(var i = 0;i < scripts.length;++i){ window[scripts[i]] = function(){console.log(\"shit\")}};alert("shit")\'\n' + 
                'injectScript(injectCode)'

                console.log('bluntCode = ' + bluntCode)
                chrome.tabs.executeScript(this.tabId,{"allFrames":true,"code":bluntCode ,"runAt":"document_start"},function (results){ console.log(results)} )

            }
        });
    }
    else {
        object.nextStep();
    }
}

InstallObserver.prototype.nextStep = function () {
    filter = new Filter(this.tabId,this.imgArray)
    filter.filter()
}

function Filter(tabId,imgArray) {
    this.tabId = tabId
    this.imgArray = imgArray
}

Filter.prototype.filter = function () {
    var object = this
    chrome.tabs.executeScript(this.tabId,{ "file":"filterInjectCode.js" },function(results) { object.onScriptExecuted(results) } )
}

Filter.prototype.onScriptExecuted = function(results) {
    var result = results[0]
    this.imgArray.push(result)
    this.nextStep()
}

Filter.prototype.nextStep = function() {
    nextPage = new NextPage(this.tabId,this.imgArray)
    nextPage.nextPage()
}

function NextPage(tabId,imgArray) {
    this.tabId = tabId
    this.imgArray = imgArray
}


NextPage.prototype.nextPage = function() {
    var object = this
    // observe the change of url
    object.listener = function (tabId,changeInfo,tab) {
        if(tabId == object.tabId && changeInfo.hasOwnProperty("status")){
            console.log("changeInfo" + changeInfo)
            object.stopTimerAndContinue()
            chrome.tabs.onUpdated.removeListener(arguments.callee)
        }
    }
    chrome.tabs.onUpdated.addListener(object.listener);
    chrome.tabs.executeScript(this.tabId,{ "file":"nextPageInjectCode.js"},function() {
        chrome.tabs.executeScript(object.tabId,{"code":"___mynextPage(\"" + nextPageQuery + "\");"})
    })
    object.startTimer()
}

NextPage.prototype.startTimer = function() {
    var object = this
    this.timerOutVar = window.setTimeout(function() { object.finish();},nextPageTimeOut)
}

NextPage.prototype.stopTimerAndContinue = function() {
    window.clearTimeout(this.timerOutVar)
    boot(this.imgArray)
}

NextPage.prototype.finish = function (){
    chrome.tabs.onUpdated.removeListener(this.listener)
    for(var i = 0;i < this.imgArray.length;++i) {
        console.log(this.imgArray[i])
    }
}






function clickHandler(e) {
    boot([]);
}


// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('#myshit').addEventListener('click', clickHandler);
});
