var globalTimeout = 500
var globalScripts = ["alert","confirm"]
var globalFilterTimes = 10
var globalFilterTimeout = 500

function TabController(controller) {
    this.state = this.NOT_STARTED
    this.oldState = this.NOT_STARTED
    this.tabId = 0
    this.bootAttr = null
    this.parentController = controller
}

TabController.prototype = {
    globalFilterTimeout : globalFilterTimeout,
    globalFilterTimes : globalFilterTimes,
    globalTimeout : globalTimeout,
    changeState : function (newState) {
        this.oldState = this.state
        this.state = newState
    },
    boot : function (bootAttr) {
        console.log('boot called')
        chrome.tabs.query({"active" : true},function (tabs) {
                var tab = tabs[0]
                this.boot_(bootAttr, tab.id)
        }.bind(this));
    },
    boot_ : function(bootAttr, tabId) {
        if (!("overrideScripts" in bootAttr)) {
            bootAttr['overrideScripts'] = globalScripts
        }
        this.tabId = tabId
        console.assert(this.state === this.NOT_STARTED)
        this.changeState(this.INSTALL_OBSERVER)
        this.bootAttr = bootAttr
        var myInstallObserver = new InstallObserver(bootAttr, this, this.tabId) 
        myInstallObserver.installObserver()
    },
    restart : function () {
        console.log('restart called ')
        this.changeState(this.INSTALL_OBSERVER)
        var myInstallObserver = new InstallObserver(this.bootAttr, this, this.tabId)
        myInstallObserver.installObserver()
    },
    nextStep : function() {
        switch(this.state) {
            case this.NOT_STARTED:
                console.assert("this.state === this.NOT_STARTED should never happend." === 0)
                break
            case this.INSTALL_OBSERVER:
                this.changeState(this.FILTER)
                var filter = new Filter(this.tabId,this.bootAttr, this)
                filter.filter()
                break
            case this.FILTER:
                this.filterDrained()
                break
            case this.NEXT_PAGE:
                this.changeState(this.NOT_STARTED)
                chrome.tabs.get(this.tabId,function(tab) {
                    this.tabId = tab.id
                    this.restart();
                }.bind(this));
                break
            case this.MODIFY_PAGE:
                if (this.parentController != null)
                    this.parentController.tabFinished(this.tabId)
                break
        }
    },
    filterDrained : function () {
        console.assert(this.oldState === this.INSTALL_OBSERVER || this.oldState === this.NEXT_PAGE)
        console.log('TabController.filterDrained!')
        switch (this.oldState) {
            case this.INSTALL_OBSERVER:
                // Comes from install observer, just go next page.
                this.changeState(this.NEXT_PAGE)
                nextPage = new NextPage(this.tabId, this.bootAttr, this)
                nextPage.nextPage()
                break
            case this.NEXT_PAGE:
                this.changeState(this.MODIFY_PAGE)
                var modifyPage = new ModifyPage(this.tabId,this.bootAttr, this)
                modifyPage.modify()
                break
        }
    },
    nextPageJSFinishi : function () {
        console.assert(this.state === this.NEXT_PAGE)
        this.changeState(this.FILTER)
        filter = new Filter(this.tabId, this.bootAttr, this)
        filter.filter()
    },
    NOT_STARTED : 0,
    INSTALL_OBSERVER : 1,
    FILTER : 2,
    NEXT_PAGE : 3,
    MODIFY_PAGE: 4
}

function ChapterController () {
    this.bootAttr = null
    this.targetsQueue = null
    this.startedTab = false
}

ChapterController.prototype = {
    MAX_RUNNING_TABS : 4,
    boot : function (bootAttr) {
        this.bootAttr = bootAttr
        chrome.tabs.query({ "active" : true },function (tabs) {
            var tab = tabs[0]

            var selectElement = new SelectElement(tab.id, this)
            selectElement.select({ 'selector' : this.bootAttr.chapterString, 'target' : 'href'})
        }.bind(this));
    },
    selectElementError : function (errorString) {
        console.error("ChapterController selectElementError: " + errorString)
    },
    selectElementOkay : function (results) {
        this.targetsQueue = results
        if (!this.startedTab) {
            this.startedTab = true
            this.startTabs()
        }
    },
    startTabs : function () {
        for (var i = 0; i < this.MAX_RUNNING_TABS && this.targetsQueue.length != 0; ++i) {
            var url = this.targetsQueue.shift()
            this.startTabs_(url)
        }
    },
    startTabs_ : function (url) {
        chrome.tabs.create({ 'url' : url, 'active' : false }, function (tab) {
            var tabController  = new TabController(this)
            tabController.boot_({"nextPageQuery" : this.bootAttr.nextPageQuery, 'title' : null, imgArray : []}, tab.id)
        }.bind(this))
    },
    tabFinished : function (tabId) {
        this.capturePage(tabId)
        if (this.targetsQueue.length != 0) {
            var url = this.targetsQueue.shift()
            this.startTabs_(url)
        }
    },
    capturePage : function (tabId) {
        chrome.pageCapture.saveAsMHTML(tabId, function (blob) {
            this.sendPage(blob, tabId)
        }.bind(this))
    },
    sendPage : function (blob, tabId) {
        var xmlhttp=new XMLHttpRequest();

    }
}
