import { Color, Page } from "@nativescript/core/ui/page";
import { WebViewExt } from "@nota/nativescript-webview-ext";
import {
    cssNotPredefinedFile,
    cssPreDefinedLinkFile,
    destroyPageAfterTest,
    javascriptCallsXLocalFile,
    jsGetElementStyleSheet,
    localJavaScriptFile,
    localJavaScriptName,
    localStyleSheetCssFile,
    localStyleSheetCssNAME,
    preparePageForTest,
    timeoutPromise,
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

        const expectedTitle = "Load predefined x-local stylesheet";
        expect(args.error).toBeUndefined();
        const actualTitle = await webView.getTitle();
        expect(actualTitle).toBe(expectedTitle);

        const styles = await webView.executeJavaScript<any>(jsGetElementStyleSheet);
        expect(styles).toBeDefined();
        expect(new Color(styles.color).hex).toBe(expectedRedColor.hex);
    });

    it("StyleSheet Link", async () => {
        const expectedRedColor = new Color("rgb(0, 128, 0)");

        webView.registerLocalResource(localStyleSheetCssNAME, localStyleSheetCssFile);
        const args = await webView.loadUrl(cssNotPredefinedFile);

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

        const expectedTitle = "Blank";

        const actualTitle = await webView.getTitle();
        expect(args.error).toBeUndefined();
        expect(actualTitle).toBe(expectedTitle);

        await webView.loadJavaScriptFile(localJavaScriptName, localJavaScriptFile);
        await timeoutPromise();

        expect(await webView.executeJavaScript(`getNumber()`)).toBe(42);
    });
});
