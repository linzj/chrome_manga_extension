var nextPageQuery = "a.n"
var globalTimeout = 500
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
            if(!object.hasBluntScripts && object.scripts) {
                object.hasBluntScripts = true
                var bluntCode = "\n" +
                'var injectScript=function(d){var c=Math.random().toString().substr(2),a=document.createElement("script");a.id=c;a.type="text/javascript";a.innerHTML=d+";document.documentElement.removeChild(document.getElementById(\'"+c+"\'));";document.documentElement.appendChild(a)};\n' +
                'var injectCode = \'var scripts = ' + JSON.stringify(object.scripts) + ';for(var i = 0;i < scripts.length;++i){ window[scripts[i]] = function(){console.log(\"shit\")}};\'\n' + 
                'injectScript(injectCode)'
                chrome.tabs.executeScript(this.tabId,{"allFrames":true,"code":bluntCode ,"runAt":"document_start"})

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
    // kill the old timer first
    if(this.timerOutVar)
        window.clearTimeout(this.timerOutVar)

    this.timerOutVar = window.setTimeout(function() { object.timerFunc();},globalTimeout)
}

NextPage.prototype.timerFunc = function() {
    var object = this
    chrome.tabs.get(this.tabId,function(tab) {
        if(tab.status == "loading") {
            object.startTimer()
        } else {
            object.finish()
        }
    });

}

NextPage.prototype.stopTimerAndContinue = function() {
    window.clearTimeout(this.timerOutVar)
    boot(this.imgArray)
}

NextPage.prototype.finish = function (){
    chrome.tabs.onUpdated.removeListener(this.listener)
    var modifyPage = new ModifyPage(this.tabId,this.imgArray)
    modifyPage.modify()
}

function ModifyPage(tabId,imgArray) {
    this.tabId = tabId
    this.imgArray = imgArray
}

ModifyPage.prototype.modify = function() {
    var object = this
    chrome.tabs.executeScript(this.tabId,{"allFrames":true,"file":"modifyInjectCode.js"},function(){
            chrome.tabs.sendMessage(object.tabId,object.imgArray,function() {
                // TODO:next node
            });
        })
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
