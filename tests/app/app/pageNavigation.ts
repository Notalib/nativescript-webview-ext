import * as buttonModule from "tns-core-modules/ui/button";
import * as frame from "tns-core-modules/ui/frame";
import * as pages from "tns-core-modules/ui/page";
import * as tabViewModule from "tns-core-modules/ui/tab-view";

export function createPage() {
    let tab = new tabViewModule.TabView();
    tab.items = [];
    for (let i = 0; i < 10; i++) {

        let button = new buttonModule.Button();
        button.text = "Test";
        button.on(buttonModule.Button.tapEvent, function () {
            let topFrame = frame.topmost();
            topFrame.goBack();
        });

        let item = new tabViewModule.TabViewItem();
        item.title = "Tab " + i;
        item.view = button;
        tab.items.push(item);
    }
    let page = new pages.Page();
    page.content = tab;
    return page;
}
// export var Page = new pages.Page();
