var globalTimeout = 500
var globalScripts = ["alert","confirm"]

function boot(imgArray,bootAttr){
    if(! ("imgArray" in bootAttr)) {
        bootAttr.imgArray = []
    }
    if(!("overrideScripts" in bootAttr)) {
        bootAttr.overrideScripts = globalScripts
    }
    chrome.tabs.query({"active":true},function (tabs){
            var tab = tabs[0]
            var myInstallObserver = new InstallObserver(bootAttr) 
            myInstallObserver.installObserver(tab)
            });
}

function start(tab,bootAttr) {
    var myInstallObserver = new InstallObserver(bootAttr) 
    myInstallObserver.installObserver(tab,bootAttr)
}

function InstallObserver(bootAttr) {
    this.bootAttr = bootAttr 
    this.hasBluntScripts = false
}

InstallObserver.prototype.installObserver = function (tab){
    this.tabId = tab.id
    var object = this

    if(!object.hasBluntScripts && object.bootAttr.overrideScripts) {
        object.hasBluntScripts = true
            var bluntCode = "\n" +
            'var injectScript=function(d){var c=Math.random().toString().substr(2),a=document.createElement("script");a.id=c;a.type="text/javascript";a.innerHTML=d+";document.documentElement.removeChild(document.getElementById(\'"+c+"\'));";document.documentElement.appendChild(a);};\n' +
            'var injectCode = \'var scripts = ' + JSON.stringify(object.bootAttr.overrideScripts) + ';for(var i = 0;i < scripts.length;++i){ window[scripts[i]] = function(){console.log(\"shit\")}};\'\n' + 
            'injectScript(injectCode)'
            chrome.tabs.executeScript(this.tabId,{"allFrames":true,"code":bluntCode})

    }
    if(tab.status == "loading") {
        chrome.tabs.onUpdated.addListener(function (tabId,changeInfo,tab) {
            if(tabId == object.tabId && changeInfo.hasOwnProperty("status") && changeInfo.status == "complete"){
                object.nextStep()
                chrome.tabs.onUpdated.removeListener(arguments.callee)
            }
            
        });
    }
    else {
        object.nextStep();
    }
}

InstallObserver.prototype.nextStep = function () {
    filter = new Filter(this.tabId,this.bootAttr)
    filter.filter()
}

function Filter(tabId,bootAttr) {
    this.tabId = tabId
    this.bootAttr = bootAttr 
    this.urlSet = {}
}

Filter.prototype.filter = function () {
    var object = this
    chrome.tabs.executeScript(this.tabId,{ "file":"filterInjectCode.js" ,"runAt":"document_end" },function(results) { object.onScriptExecuted(results) } )
}

Filter.prototype.onScriptExecuted = function(results) {
    var result = results[0]
    for(var i = 0;i < result.length;++i) {
        var url = result[i]
        if(this.urlSet[url])
            continue
        this.urlSet[url] = true
        this.bootAttr.imgArray.push(url)
        break
    }
    this.nextStep()
}

Filter.prototype.nextStep = function() {
    nextPage = new NextPage(this.tabId,this.bootAttr)
    nextPage.nextPage()
}

function NextPage(tabId,bootAttr) {
    this.tabId = tabId
    this.bootAttr = bootAttr 
}


NextPage.prototype.nextPage = function() {
    var object = this
    // observe the change of url
    object.listener = function (tabId,changeInfo,tab) {
        if(tabId == object.tabId && changeInfo.hasOwnProperty("status") ){
            if(changeInfo.status == "complete"){
                object.backToStart()
                chrome.tabs.onUpdated.removeListener(arguments.callee)
            } else if(changeInfo.status == "loading") {
                object.stopTimer()
            }
        }
    }
    chrome.tabs.onUpdated.addListener(object.listener);
    chrome.tabs.executeScript(this.tabId,{ "file":"nextPageInjectCode.js"},function() {
        chrome.tabs.executeScript(object.tabId,{"code":"___mynextPage(\"" + object.bootAttr.nextPageQuery + "\");","runAt":"document_end"},function(){
            object.startTimer()
        })
    })
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
        if(tab.status == "complete") {
            object.finish()
        }
    });

}

NextPage.prototype.stopTimer = function() {
    window.clearTimeout(this.timerOutVar)
}

NextPage.prototype.backToStart = function() {
    var object = this
    chrome.tabs.get(this.tabId,function(tab) {
        start(tab,object.bootAttr);
    });
    this.backToStart = function(){}
}

NextPage.prototype.finish = function (){
    chrome.tabs.onUpdated.removeListener(this.listener)
    var modifyPage = new ModifyPage(this.tabId,this.bootAttr)
    modifyPage.modify()
    this.finish = function() {}
}

function ModifyPage(tabId,bootAttr) {
    this.tabId = tabId
    this.bootAttr = bootAttr 
}

ModifyPage.prototype.modify = function() {
    var object = this
    chrome.tabs.executeScript(this.tabId,{"allFrames":true,"file":"modifyInjectCode.js"},function(){
            chrome.tabs.sendMessage(object.tabId,object.bootAttr.imgArray,function() {
                // TODO:next node
            });
        })
}


