import { WebViewExt } from "@nota/nativescript-webview-ext";
import { ActionBar } from "tns-core-modules/ui/action-bar/action-bar";
import * as frameModule from "tns-core-modules/ui/frame";
import { isAndroid, Page } from "tns-core-modules/ui/page";
import * as url from "url";
import { emptyHTMLFile, eventAsPromise } from "./helpers";

describe("Load files", () => {
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

    beforeEach(() => {
        webView = new WebViewExt();
        currentPage.content = webView;
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

    androidTest(getWebView);
});

function androidTest(getWebView: () => WebViewExt) {
    if (!isAndroid) {
        return;
    }

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
