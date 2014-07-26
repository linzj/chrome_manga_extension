var globalTimeout = 500
var globalScripts = ["alert","confirm"]
var globalFilterTimes = 10
var globalFilterTimeout = 500

function boot(imgArray,bootAttr){
    console.log('boot called')
    if (!("imgArray" in bootAttr)) {
        bootAttr.imgArray = []
    }
    if (!("overrideScripts" in bootAttr)) {
        bootAttr.overrideScripts = globalScripts
    }
    chrome.tabs.query({"active":true},function (tabs){
            var tab = tabs[0]
            var myInstallObserver = new InstallObserver(bootAttr) 
            myInstallObserver.installObserver(tab)
            });
}

function start(tab,bootAttr) {
    console.log('start called ')
    var myInstallObserver = new InstallObserver(bootAttr) 
    myInstallObserver.installObserver(tab,bootAttr)
}

function InstallObserver(bootAttr) {
    this.bootAttr = bootAttr 
    this.hasBluntScripts = false
}

InstallObserver.prototype.installObserver = function (tab) {
    console.log('install Observer')

    this.tabId = tab.id
    var object = this

    if(!object.hasBluntScripts && object.bootAttr.overrideScripts) {
        object.hasBluntScripts = true
            var bluntCode = "\n" +
            'var injectScript=function(d){var c=Math.random().toString().substr(2),a=document.createElement("script");a.id=c;a.type="text/javascript";a.innerHTML=d+";document.documentElement.removeChild(document.getElementById(\'"+c+"\'));";document.documentElement.appendChild(a);};\n' +
            'var injectCode = \'var scripts = ' + JSON.stringify(object.bootAttr.overrideScripts) + ';for(var i = 0;i < scripts.length;++i){ window[scripts[i]] = function(){console.log(\"shit\")}};\'\n' + 
            'injectScript(injectCode)'
            chrome.tabs.executeScript(this.tabId,{"allFrames" : true, "code" : bluntCode})

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
    console.log('install Observer next step')
    filter = new Filter(this.tabId,this.bootAttr)
    filter.filter()
}

// Debug only. And only V8
// function MyError() {
//   Error.captureStackTrace(this, MyError);
//   // any other initialization
// }

function Filter(tabId,bootAttr) {
    this.tabId = tabId
    this.bootAttr = bootAttr 
    this.urlSet = {}
    this.areaAverage = -1
    this.filterTimes = 0
    this.timerId = -1
    this.candidatePic = null
}

Filter.prototype.filter = function () {
    console.log('Filter.filter ,this.timerId = ' + this.timerId)
    // check for empty map
    var emptySet = true
    for (var key in this.urlSet) {
        emptySet = false
        break
    }
    if (emptySet && this.bootAttr.imgArray.length > 0) {
        var sum = 0
        for (var i = 0; i < this.bootAttr.imgArray.length; ++i) {
            var img = this.bootAttr.imgArray[i]
            this.urlSet[img[0]] = true
            var width = img[1]
            var height = img[2]
            var area = width * height
            sum += area
        }

        sum /= this.bootAttr.imgArray.length
        this.areaAverage = sum
    }
    chrome.tabs.executeScript(this.tabId, {"file":"filterInjectCode.js", "runAt":"document_end"}, function(results) { this.onScriptExecuted(results) }.bind(this) )
}

Filter.prototype.updateAverageArea = function (area) {
    this.areaAverage = (this.areaAverage * this.bootAttr.imgArray.length + area) / (this.bootAttr.imgArray.length + 1)
}

Filter.prototype.pushPic = function (img) {
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
}

Filter.prototype.onScriptExecuted = function(results) {
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
            if (this.candidatePic == null) {
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
        break
    }

    if (hasFound) {
        this.nextStep()
    }
    else if (this.filterTimes < globalFilterTimes) {
       this.timerId = setTimeout(this.filter.bind(this), globalFilterTimeout)
       this.filterTimes++
    } else if (this.candidatePic != null) {
        console.log('choosen candidatePic: ' + this.candidatePic)
        var candidateArea = this.candidatePic[1] * this.candidatePic[2]
        this.updateAverageArea(candidateArea)
        this.pushPic(this.candidatePic)
        this.candidatePic = null
        this.nextStep()
    } else {
        // modified this page
        var modifyPage = new ModifyPage(this.tabId,this.bootAttr)
        modifyPage.modify()
    }
}

Filter.prototype.nextStep = function() {
    nextPage = new NextPage(this.tabId,this.bootAttr)
    nextPage.nextPage()
}


function NextPage(tabId,bootAttr) {
    this.tabId = tabId
    this.bootAttr = bootAttr 
    this.uniqueId = NextPage.prototype.s_uniqueId
    this.shouldNotStartTimer = false
    NextPage.prototype.s_uniqueId++
}

NextPage.prototype.s_uniqueId = 0

NextPage.prototype.markShouldNotStartTimer = function () {
    this.shouldNotStartTimer = true
}

NextPage.prototype.nextPage = function() {
    console.log('NextPage.nextPage: ', this.uniqueId)
    var object = this
    // observe the change of url
    object.listener = function (tabId,changeInfo,tab) {
        if(tabId == object.tabId && changeInfo.hasOwnProperty("status") ){
            if(changeInfo.status == "complete"){
                object.stopTimer()
                object.markShouldNotStartTimer()
                object.backToStart()
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
}

NextPage.prototype.startTimer = function() {
    // kill the old timer first
    if(this.timerOutVar)
        window.clearTimeout(this.timerOutVar)
    console.log('NextPage.startTimer: ' + this.uniqueId)
    this.timerOutVar = window.setTimeout(function() { this.timerFunc();}.bind(this), globalTimeout)
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
    console.log('NextPage.stopTimer: ' + this.uniqueId)
    window.clearTimeout(this.timerOutVar)
    this.timerOutVar = 0
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
    // var modifyPage = new ModifyPage(this.tabId,this.bootAttr)
    // modifyPage.modify()
    console.log('NextPage.finish: ' + this.uniqueId)
    filter = new Filter(this.tabId,this.bootAttr)
    filter.filter()
    this.finish = function() {}
}

function ModifyPage(tabId,bootAttr) {
    this.tabId = tabId
    this.bootAttr = bootAttr 
}

ModifyPage.prototype.modify = function() {
    chrome.tabs.executeScript(this.tabId,{"allFrames":true,"file":"modifyInjectCode.js"},function(){
            var urls = []
            for (var i = 0; i < this.bootAttr.imgArray.length; ++i) {
                urls.push(this.bootAttr.imgArray[i][0])
            }
            chrome.tabs.sendMessage(this.tabId, urls, function() {
                // TODO:next node
            }.bind(this));
        }.bind(this))
}
