function InstallObserver(bootAttr, controller, tabId) {
    this.bootAttr = bootAttr 
    this.hasBluntScripts = false
    this.controller = controller
    this.tabId = tabId
    this.hasNextStep = false
}

InstallObserver.prototype = {
    installObserver : function () {
        console.log('install Observer')


        if(!this.hasBluntScripts && this.bootAttr.overrideScripts) {
            this.hasBluntScripts = true
                var bluntCode = "\n" +
                'var injectScript=function(d){var c=Math.random().toString().substr(2),a=document.createElement("script");a.id=c;a.type="text/javascript";a.innerHTML=d+";document.documentElement.removeChild(document.getElementById(\'"+c+"\'));";document.documentElement.appendChild(a);};\n' +
                'var injectCode = \'var scripts = ' + JSON.stringify(this.bootAttr.overrideScripts) + ';for(var i = 0;i < scripts.length;++i){ window[scripts[i]] = function(){console.log(\"shit\")}};\'\n' + 
                'injectScript(injectCode)'
                chrome.tabs.executeScript(this.tabId, {"allFrames" : true, "code" : bluntCode}, function () {
                        this.nextStep();
                }.bind(this))

        }
    },
    nextStep : function () {
        console.assert(!this.hasNextStep)
        if (this.hasNextStep)
            return;
        console.log('install Observer next step')
        this.hasNextStep = true
        this.controller.nextStep()
    }
}

// Debug only. And only V8
// function MyError() {
//   Error.captureStackTrace(this, MyError);
//   // any other initialization
// }

function Filter(tabId, bootAttr, controller) {
    this.tabId = tabId
    this.bootAttr = bootAttr 
    this.areaAverage = -1
    this.filterTimes = 0
    this.timerId = -1
    this.controller = controller 
    this.hasNextStep = false
}

Filter.prototype = {
    filter: function () {
        var logString = 'Filter.filter, this.timerId = ' + this.timerId
        // check for empty map
        console.log(logString)
        var code = "var __my_img_selector__ = '" + this.bootAttr.imgQuery + "';"
        chrome.tabs.executeScript(this.tabs, {"code" : code, "runAt" : "document_end"}, function () {
            chrome.tabs.executeScript(this.tabId, {"file" : "filterInjectCode.js", "runAt" : "document_end"}, this.onScriptExecuted.bind(this));
        }.bind(this));
    },
    pushPic : function (img) {
        this.bootAttr.imgArray.push(img)
        console.log("Filter.onScriptExecuted: this.bootAttr.imgArray.push(" + img + ")")

        // verifing the urlSet
        var keyCount = 0
        for (var k in this.bootAttr.urlSet) {
            keyCount++
        }
        if (keyCount < this.bootAttr.imgArray.length) {
            console.error("Filter.onScriptExecuted: keyCount of this.urlSet is not equals to imgArray.length")
        }
    },
    onScriptExecuted : function(results) {
        // the tab may be closed
        if (typeof results == 'undefined')
            return

        var result = results[0]
        var hasFound = false
        for(var i = 0; i < result.length; ++i) {
            var url = result[i]
            console.log('onScriptExecuted:: url = ' + url)
            if(this.bootAttr.urlSet[url] === true)
                continue
            this.bootAttr.urlSet[url] = true
            this.pushPic(result[i])
            hasFound = true
        }
        var shouldNextStep = false

        if (hasFound) {
            shouldNextStep = true
        }
        else if (this.filterTimes < this.controller.globalFilterTimes) {
           // we got nothing.
           this.timerId = setTimeout(this.filter.bind(this), this.controller.globalFilterTimeout)
           this.filterTimes++
        } else {
            shouldNextStep = true
        }
        if (shouldNextStep)
            this.nextStep()
    },
    nextStep : function() {
        console.assert(!this.hasNextStep)
        if (this.hasNextStep)
            return
        this.hasNextStep = true
        this.controller.nextStep()
    }

}

function NextPage(tabId, bootAttr, controller) {
    this.tabId = tabId
    this.bootAttr = bootAttr 
    this.uniqueId = NextPage.prototype.s_uniqueId
    this.shouldNotStartTimer = false
    this.controller = controller
    this.hasNextStep = false
    this.hasFinish = false
    NextPage.prototype.s_uniqueId++
}

NextPage.prototype = {
    s_uniqueId : 0,
    markShouldNotStartTimer : function () {
        this.shouldNotStartTimer = true
    },
    nextPage : function() {
        console.log('NextPage.nextPage: ', this.uniqueId)
        var object = this
        // observe the change of url
        object.listener = function (tabId,changeInfo,tab) {
            if(tabId == object.tabId && changeInfo.hasOwnProperty("status") ){
                if(changeInfo.status == "complete"){
                    object.stopTimer()
                    object.markShouldNotStartTimer()
                    object.nextStep()
                    chrome.tabs.onUpdated.removeListener(arguments.callee)
                } else if(changeInfo.status == "loading") {
                    object.markShouldNotStartTimer()
                    object.stopTimer()
                }
            }
        }
        chrome.tabs.onUpdated.addListener(object.listener);
        chrome.tabs.executeScript(this.tabId,{ "file":"nextPageInjectCode.js"},function() {
            chrome.tabs.executeScript(object.tabId,{"code":"___mynextPage(\"" + object.bootAttr.nextPageQuery + "\");","runAt":"document_end"},function(){
                if (!object.shouldNotStartTimer)
                    object.startTimer()
            })
        })
    },
    startTimer : function() {
        // kill the old timer first
        if(this.timerOutVar)
            window.clearTimeout(this.timerOutVar)
        console.log('NextPage.startTimer: ' + this.uniqueId)
        this.timerOutVar = window.setTimeout(function() { this.timerFunc();}.bind(this), this.controller.globalTimeout)
    },
    timerFunc : function() {
        var object = this
        chrome.tabs.get(this.tabId,function(tab) {
            if(tab.status == "complete") {
                object.finish()
            }
        });
    },
    stopTimer : function() {
        console.log('NextPage.stopTimer: ' + this.uniqueId)
        window.clearTimeout(this.timerOutVar)
        this.timerOutVar = 0
    },
    nextStep: function() {
        console.assert(!this.hasNextStep)
        if (this.hasNextStep)
            return
        this.hasNextStep = true
        this.controller.nextStep()
    },
    finish : function () {
        console.assert(!this.hasFinish)
        if (this.hasFinish)
            return
        this.hasFinish = true
        console.log('NextPage.finish: ' + this.uniqueId)
        chrome.tabs.onUpdated.removeListener(this.listener)
        this.controller.nextPageJSFinishi()
    }
}


function ModifyPage(tabId,bootAttr, controller) {
    this.tabId = tabId
    this.bootAttr = bootAttr 
    this.controller = controller
    this.hasNextStep = false
}

ModifyPage.prototype = {
    modify : function () {
        chrome.tabs.executeScript(this.tabId,{"allFrames":true,"file":"modifyInjectCode.js"},function(){
                var urls = []
                for (var i = 0; i < this.bootAttr.imgArray.length; ++i) {
                    urls.push(this.bootAttr.imgArray[i])
                }
                chrome.tabs.sendMessage(this.tabId, urls, function() {
                    this.nextStep()
                }.bind(this));
            }.bind(this))
    },
    nextStep : function () {
        console.assert(!this.hasNextStep)
        if (this.hasNextStep)
            return
        this.hasNextStep = true
        this.controller.nextStep()
    }
}

