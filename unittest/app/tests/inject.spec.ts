import { WebViewExt } from "@nota/nativescript-webview-ext";
import { ActionBar } from "tns-core-modules/ui/action-bar/action-bar";
import * as frameModule from "tns-core-modules/ui/frame";
import { Color, Page } from "tns-core-modules/ui/page";
import {
    cssNotPredefinedFile,
    cssPreDefinedlinkFile,
    eventAsPromise,
    jsGetElementStyleSheet,
    localStyleSheetCssFile,
    localStyleSheetCssNAME,
    timeoutPromise,
    localJavaScriptName,
    localJavaScriptFile,
    javascriptCallsXLocalFile,
} from "./helpers";

describe("Inject files", () => {
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

    it("Inject files predefined StyleSheet Link", async () => {
        const expectedRedColor = new Color("rgb(0, 128, 0)");

        webView.registerLocalResource(localStyleSheetCssNAME, localStyleSheetCssFile);
        const args = await webView.loadUrl(cssPreDefinedlinkFile);

        // >> webview-x-local-predefined-link
        // >> (hide)
        const expectedTitle = "Load predefined x-local stylesheet";
        expect(args.error).toBeUndefined();
        const actualTitle = await webView.getTitle();
        expect(actualTitle).toBe(expectedTitle);

        const styles = await webView.executeJavaScript<any>(jsGetElementStyleSheet);
        expect(styles).toBeDefined();
        expect(new Color(styles.color).hex).toBe(expectedRedColor.hex);
        // << webview-x-local-predefined-link
    });

    it("Inject files StyleSheet Link", async () => {
        const expectedRedColor = new Color("rgb(0, 128, 0)");

        webView.registerLocalResource(localStyleSheetCssNAME, localStyleSheetCssFile);
        const args = await webView.loadUrl(cssNotPredefinedFile);

        // >> webview-x-local-inject-css-link
        // >> (hide)
        const expectedTitle = "Inject stylesheet via x-local";

        expect(args.error).toBeUndefined();
        const actualTitle = await webView.getTitle();
        expect(actualTitle).toBe(expectedTitle);

        await webView.loadStyleSheetFile(localStyleSheetCssNAME, localStyleSheetCssFile);
        await timeoutPromise();
        const styles = await webView.executeJavaScript<any>(jsGetElementStyleSheet);
        expect(styles).toBeDefined();
        expect(new Color(styles.color).hex).toBe(expectedRedColor.hex);
    });
    it("Inject JavaScript Once", async () => {
        webView.registerLocalResource(localJavaScriptName, localJavaScriptFile);
        const args = await webView.loadUrl(javascriptCallsXLocalFile);

        // >> webview-x-local-inject-once
        const expectedTitle = "Blank";

        const actualTitle = await webView.getTitle();
        expect(args.error).toBeUndefined();
        expect(actualTitle).toBe(expectedTitle);

        await webView.loadJavaScriptFile(localJavaScriptName, localJavaScriptFile);
        await timeoutPromise();

        expect(await webView.executeJavaScript(`getNumber()`)).toBe(42);
        // << webview-x-local-inject-once
    });
});
