import { WebViewExt } from "@nota/nativescript-webview-ext";
import { Color, Page } from "tns-core-modules/ui/page";
import {
    cssNotPredefinedFile,
    cssPreDefinedLinkFile,
    getRootFrame,
    javascriptCallsXLocalFile,
    jsGetElementStyleSheet,
    localJavaScriptFile,
    localJavaScriptName,
    localStyleSheetCssFile,
    localStyleSheetCssNAME,
    preparePageForTest,
    timeoutPromise,
    destroyPageAfterTest,
} from "./helpers";

describe("Inject files", () => {
    let currentPage: Page;
    let webView: WebViewExt;

    beforeAll(async () => {
        currentPage = await preparePageForTest();
    });

    beforeEach(() => {
        webView = new WebViewExt();
        currentPage.content = webView;
    });

    afterAll(() => {
        destroyPageAfterTest(currentPage);

        currentPage = null;
        webView = null;
    });

    it("Predefined StyleSheet Link", async () => {
        const expectedRedColor = new Color("rgb(0, 128, 0)");

        webView.registerLocalResource(localStyleSheetCssNAME, localStyleSheetCssFile);
        const args = await webView.loadUrl(cssPreDefinedLinkFile);

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

    it("StyleSheet Link", async () => {
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

    it("JavaScript on-demand", async () => {
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
