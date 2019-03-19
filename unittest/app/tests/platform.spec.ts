import { WebViewExt } from "@nota/nativescript-webview-ext";
import * as platform from "tns-core-modules/platform";
import { ActionBar } from "tns-core-modules/ui/action-bar/action-bar";
import * as frameModule from "tns-core-modules/ui/frame";
import { isAndroid, isIOS, Page, View } from "tns-core-modules/ui/page";
import { TabView, TabViewItem } from "tns-core-modules/ui/tab-view";
import * as utils from "tns-core-modules/utils/utils";
import { DefaultPageOptions, emptyHTMLFile, eventAsPromise, layout, PageOptions, waitUntilReady } from "./helpers";

describe("Platform", () => {
    let currentPage: Page;
    let webView: WebViewExt;
    const topmost = frameModule.topmost();

    beforeAll(async () => {
        currentPage = new Page();
        currentPage.actionBar = new ActionBar();
        currentPage.actionBar.title = "WebView Test";

        topmost.navigate({
            create() {
                return currentPage;
            },
            animated: false,
        });

        await eventAsPromise(currentPage, Page.navigatedToEvent);
    });

    beforeEach(async () => {
        webView = new WebViewExt();
    });

    afterEach(() => {
        currentPage.content = null;
        webView = null;
    });

    afterAll(() => {
        currentPage.content = null;
        currentPage = null;
        webView = null;

        topmost.goBack(topmost.backStack[0]);
    });

    function getWebView() {
        return webView;
    }

    function getPage() {
        return currentPage;
    }

    android_Tests(getWebView, getPage);
    iOS_Tests(getWebView, getPage);
});

function android_Tests(getWebView: () => WebViewExt, getPage: () => Page) {
    if (!isAndroid) {
        return;
    }
    let currentPage: Page;

    beforeEach(() => {
        currentPage = getPage();
        currentPage.content = getWebView();
    });

    afterEach(() => (currentPage = null));

    it("builtInZoomControls", async () => {
        const webView = getWebView();
        // >> webview-built-in-zoom-controls

        const androidWebView = webView.android as android.webkit.WebView;
        const args = await webView.loadUrl(emptyHTMLFile);

        const expectedTitle = "Blank";
        expect(args.error).toBeUndefined();

        const actualTitle = await webView.getTitle();
        expect(actualTitle).toBe(expectedTitle);

        let expected = true;
        expect(webView.builtInZoomControls).toBe(expected);
        expect(androidWebView.getSettings().getBuiltInZoomControls()).toBe(expected);

        let currentValue: any = false;
        expected = false;
        webView.builtInZoomControls = currentValue;

        expect(webView.builtInZoomControls).toBe(expected);
        expect(androidWebView.getSettings().getBuiltInZoomControls()).toBe(expected);

        currentValue = "true";
        expected = true;
        webView.builtInZoomControls = currentValue;

        expect(webView.builtInZoomControls).toBe(expected);
        expect(androidWebView.getSettings().getBuiltInZoomControls()).toBe(expected);

        currentValue = "false";
        expected = false;
        webView.builtInZoomControls = currentValue;

        expect(webView.builtInZoomControls).toBe(expected);
        expect(androidWebView.getSettings().getBuiltInZoomControls()).toBe(expected);
        // << webview-built-in-zoom-controls
    });

    it("displayZoomControls", async () => {
        const webView = getWebView();
        // >> webview-built-in-zoom-controls
        const androidWebView = webView.android as android.webkit.WebView;
        const args = await webView.loadUrl(emptyHTMLFile);

        const expectedTitle = "Blank";
        expect(args.error).toBeUndefined();

        const actualTitle = await webView.getTitle();
        expect(actualTitle).toBe(expectedTitle);

        let expected = true;
        expect(webView.displayZoomControls).toBe(expected);
        expect(androidWebView.getSettings().getDisplayZoomControls()).toBe(expected);

        let currentValue: any = false;
        expected = false;
        webView.displayZoomControls = currentValue;

        expected = false;
        expect(webView.displayZoomControls).toBe(expected);
        expect(androidWebView.getSettings().getDisplayZoomControls()).toBe(expected);

        currentValue = "true";
        expected = true;
        webView.displayZoomControls = currentValue;

        expect(webView.displayZoomControls).toBe(expected);
        expect(androidWebView.getSettings().getDisplayZoomControls()).toBe(expected);

        currentValue = "false";
        expected = false;
        webView.displayZoomControls = currentValue;

        expect(webView.displayZoomControls).toBe(expected);
        expect(androidWebView.getSettings().getDisplayZoomControls()).toBe(expected);
        // << webview-built-in-zoom-controls
    });
}

function iOS_Tests(getWebView: () => WebViewExt, getPage: () => Page) {
    if (!isIOS) {
        return;
    }

    iOS_SafeArea(getWebView, getPage);
}

function iOS_SafeArea(getWebView: () => WebViewExt, getPage: () => Page) {
    if (utils.ios.MajorVersion <= 10) {
        return;
    }

    function waitUntilTestElementLayoutIsValid(view: View, timeoutSec?: number): void {
        waitUntilReady(() => {
            return view.isLayoutValid;
        }, timeoutSec || 1);
    }

    function webview_in_full_screen(webView: WebViewExt, page: Page, options: PageOptions) {
        if (options.actionBar) {
            page.actionBarHidden = false;
            page.actionBar.title = "Test ActionBar";
            page.actionBar.flat = false;
            page.content = webView;
        } else if (options.actionBarFlat) {
            page.actionBarHidden = false;
            page.actionBar.title = "Test ActionBar Flat";
            page.actionBar.flat = true;
            page.content = webView;
        } else if (options.actionBarHidden) {
            page.actionBarHidden = true;
            page.content = webView;
        } else if (options.tabBar) {
            page.actionBarHidden = false;
            const tabView = new TabView();
            const tabEntry = new TabViewItem();
            tabEntry.title = "Test";
            tabEntry.view = webView;
            tabView.items = [tabEntry];
            page.content = tabView;
        }

        page.requestLayout();

        waitUntilTestElementLayoutIsValid(webView);

        const expectedTop = 0;
        const expectedLeft = 0;
        const expectedRight = platform.screen.mainScreen.widthPixels;
        const expectedBottom = platform.screen.mainScreen.heightPixels;

        const left = layout.left(webView);
        const top = layout.top(webView);
        const right = layout.right(webView);
        const bottom = layout.bottom(webView);
        expect(left).toBe(expectedLeft); // `${webView}.left - actual:${l}; expected: ${0}`);
        expect(top).toBe(expectedTop); // `${webView}.top - actual:${t}; expected: ${expectedTop}`);
        expect(right).toBe(expectedRight); // `${webView}.right - actual:${r}; expected: ${platform.screen.mainScreen.widthPixels}`);
        expect(bottom).toBe(expectedBottom); // `${webView}.bottom - actual:${b}; expected: ${platform.screen.mainScreen.heightPixels}`);
    }

    it("test_webview_in_full_screen_action_bar", () => {
        webview_in_full_screen(getWebView(), getPage(), {
            ...DefaultPageOptions,
            actionBar: true,
        });
    });

    it("test_webview_in_full_screen_action_bar_hidden", () => {
        webview_in_full_screen(getWebView(), getPage(), {
            ...DefaultPageOptions,
            actionBarHidden: true,
        });
    });

    it("test_webview_in_full_screen_action_bar_flat", () => {
        webview_in_full_screen(getWebView(), getPage(), {
            ...DefaultPageOptions,
            actionBarFlat: true,
        });
    });

    it("test_webview_in_full_screen_tab_bar", () => {
        webview_in_full_screen(getWebView(), getPage(), {
            ...DefaultPageOptions,
            tabBar: true,
        });
    });
}
