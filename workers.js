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
                'injectScript(injectCode);\n' +
                'document.title;'
                chrome.tabs.executeScript(this.tabId, {"allFrames" : true, "code" : bluntCode}, function (results) {
                        if (typeof results == 'undefined')
                            return

                        var title = results[0]
                        if (this.bootAttr.title === null)
                            this.bootAttr.title = title
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

function Bucket(val) {
    this.val = val
    this.size = 1
}

Bucket.prototype.accept = function (val) {
    if (Math.abs(this.val - val) < this.val * 0.3) {
        this.val = (this.val * this.size + val) / (this.size + 1)
        this.size++
        return true
    }
    return false
}

function bucketSort(a, b) {
    return b.size - a.size
}

// Debug only. And only V8
// function MyError() {
//   Error.captureStackTrace(this, MyError);
//   // any other initialization
// }

function Filter(tabId, bootAttr, controller) {
    this.tabId = tabId
    this.bootAttr = bootAttr 
    this.urlSet = {}
    this.areaAverage = -1
    this.filterTimes = 0
    this.timerId = -1
    this.candidatePic = null
    this.controller = controller 
    this.hasNextStep = false
}

Filter.prototype = {
    filter: function () {
        var logString = 'Filter.filter, this.timerId = ' + this.timerId
        // check for empty map
        var emptySet = true
        for (var key in this.urlSet) {
            emptySet = false
            break
        }
        if (emptySet && this.bootAttr.imgArray.length > 0) {

            var buckets = []
            for (var imgIndex in this.bootAttr.imgArray) {
                var accepted = false
                var img = this.bootAttr.imgArray[imgIndex]
                var area = img[1] * img[2]
                this.urlSet[img[0]] = true
                for (var bucketIndex in buckets) {
                    var bucket = buckets[bucketIndex]
                    if (bucket.accept(area)) {
                        accepted = true
                        break
                    }
                }
                if (!accepted) {
                    buckets.push(new Bucket(area))
                }
            }
            buckets.sort(bucketSort)

            this.areaAverage = buckets[0].val
            logString += "; this.areaAverage = " + this.areaAverage
        }
        console.log(logString)
        chrome.tabs.executeScript(this.tabId, {"file":"filterInjectCode.js", "runAt":"document_end"}, this.onScriptExecuted.bind(this) )
    },
    updateAverageArea : function (area) {
        this.areaAverage = (this.areaAverage * this.bootAttr.imgArray.length + area) / (this.bootAttr.imgArray.length + 1)
    },
    pushPic : function (img) {
        this.bootAttr.imgArray.push(img)
        console.log("Filter.onScriptExecuted: this.bootAttr.imgArray.push(" + img + ")")

        // verifing the urlSet
        var keyCount = 0
        for (var k in this.urlSet) {
            keyCount++
        }
        if (keyCount < this.bootAttr.imgArray.length) {
            console.error("Filter.onScriptExecuted: keyCount of this.urlSet is not equals to this.bootAttr.imgArray.length")
        }
    },
    onScriptExecuted : function(results) {
        // the tab may be closed
        if (typeof results == 'undefined')
            return

        var result = results[0]
        var hasFound = false
        for(var i = 0; i < result.length; ++i) {
            var url = result[i][0]
            if(this.urlSet[url] == true)
                continue
            this.urlSet[url] = true
            // test if current pic is larger than the average picture area, or not smaller than 20 %
            var width = result[i][1]
            var height = result[i][2]
            var area = width * height
            if (this.areaAverage == -1) {
                this.areaAverage = area
            } else if (this.areaAverage * 0.80 > area) {
                if (this.candidatePic === null) {
                    this.candidatePic = result[i]
                } else {
                    // only update those bigger than original candidate
                    var candidateArea = this.candidatePic[1] * this.candidatePic[2]
                    if (candidateArea < area)
                        this.candidatePic = result[i]
                }
                break
            } else {
                // update areaAverage
                this.updateAverageArea(area)
            }

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
        } else if (this.candidatePic !== null) {
            console.log('choosen candidatePic: ' + this.candidatePic)
            var candidateArea = this.candidatePic[1] * this.candidatePic[2]
            this.updateAverageArea(candidateArea)
            this.pushPic(this.candidatePic)
            this.candidatePic = null
            shouldNextStep = true
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
        object.listener = function (tabId, changeInfo, tab) {
            if(tabId == this.tabId && changeInfo.hasOwnProperty("status") ){
                if(changeInfo.status === "complete"){
                    this.stopTimer()
                    this.markShouldNotStartTimer()
                    this.nextStep()
                    chrome.tabs.onUpdated.removeListener(this.listener)
                } else if(changeInfo.status == "loading") {
                    this.markShouldNotStartTimer()
                    this.stopTimer()
                }
            }
        }.bind(this)
        chrome.tabs.onUpdated.addListener(object.listener);
        chrome.tabs.executeScript(this.tabId,{ "file":"nextPageInjectCode.js"},function() {
            chrome.tabs.executeScript(object.tabId,{"code":"___mynextPage(\'" + object.bootAttr.nextPageQuery + "\');","runAt":"document_end"},function(){
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
                    urls.push(this.bootAttr.imgArray[i][0])
                }
                chrome.tabs.sendMessage(this.tabId, { 'urls' : urls, 'title' : this.bootAttr.title }, function (respond) {
                    // start a time to query if the modified page has done its job (all image loaded.).
                    // console.log('ModifyPage.modify: start timer to test if modified page is ready. title: ' + this.bootAttr.title)
                    var thisFunction = function () {
                         chrome.tabs.sendMessage(this.tabId, {}, function (respond) {
                             if (respond == 0) {
                                 console.log('ModifyPage.modify.respond. title: ' + this.bootAttr.title)
                                 this.nextStep()
                             } else {
                                 // retry
                                 console.log('ModifyPage.modify.retry timer. title: ' + this.bootAttr.title + '; respond: ' + respond);
                                 setTimeout(thisFunction, 250);
                             }
                         }.bind(this));
                    }.bind(this)
                    setTimeout(thisFunction, 250)
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

function SelectElement(tabId, controller) {
    this.controller = controller
    this.tabId = tabId
}

SelectElement.prototype = {
    select : function (selectionMap) {
        chrome.tabs.executeScript(this.tabId, { "allFrames" : false, "file" : "selectorInjectCode.js", "runAt":"document_end" }, function () {
            chrome.tabs.sendMessage(this.tabId, selectionMap, function (result) {
                if (typeof result == 'undefined') {
                    this.controller.selectElementError(chrome.runtime.lastError);
                    return;
                }
                this.controller.selectElementOkay(result);

            }.bind(this));
        }.bind(this));
    }
}
