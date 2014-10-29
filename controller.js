var globalTimeout = 500
var globalScripts = ["alert","confirm"]
var globalFilterTimes = 10
var globalFilterTimeout = 500

function TabController() {
    this.state = this.NOT_STARTED
    this.oldState = this.NOT_STARTED
    this.tabId = 0
    this.bootAttr = null
    this.globalFilterTimeout = globalFilterTimeout
    this.globalTimeout =globalTimeout
}

TabController.prototype = {
    changeState : function (newState) {
        this.oldState = this.state
        this.state = newState
    },
    boot : function (bootAttr) {
        console.log('boot called')
        if (!("overrideScripts" in bootAttr)) {
            bootAttr['overrideScripts'] = globalScripts
        }
        chrome.tabs.query({"active":true},function (tabs){
                var tab = tabs[0]
                console.assert(this.state === this.NOT_STARTED)
                this.changeState(this.INSTALL_OBSERVER)
                this.tabId = tab.id
                this.bootAttr = bootAttr
                var myInstallObserver = new InstallObserver(bootAttr, this, tab.id) 
                myInstallObserver.installObserver()
                }.bind(this));
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
                // TODO: modify other upper controller to finish.
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
