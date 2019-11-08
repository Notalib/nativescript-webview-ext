import { Page } from "@nativescript/core/ui/page";
import { WebViewExt } from "@nota/nativescript-webview-ext";
import { destroyPageAfterTest, eventAsPromise, javascriptCallsFile, preparePageForTest, timeoutPromise } from "./helpers";

describe("JavaScript Bridge", () => {
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

    /**
     * Tests event callback by triggering an event in the webview that emits an event to the nativescript layer.
     */
    it("Bridge events", async () => {
        const expected = {
            huba: "hop",
        };

        const args = await webView.loadUrl(javascriptCallsFile);
        expect(args.error).toBeUndefined();

        const webEventData = eventAsPromise<any>(webView, "web-message");
        await webView.executeJavaScript(`setupEventListener()`);
        await timeoutPromise();

        webView.emitToWebView("tns-message", expected);

        const { data: result } = await webEventData;

        expect(result).toEqual(expected);
    });

    async function runWebViewJavaScriptInterfaceTest<T>(scriptCode: string, expected: T) {
        const args = await webView.loadUrl(javascriptCallsFile);
        expect(args.error).toBeUndefined();

        const result = await webView.executeJavaScript(scriptCode);
        expect(result).toEqual(expected);
    }

    /**
     * Test calling a function that returns an integer
     */
    it("The answer to the ultimate question of life, the universe and everything", async () => {
        await runWebViewJavaScriptInterfaceTest("getNumber()", 42);
    });

    /**
     * Test calling a function that returns a floating number
     */
    it("Get pi", async () => {
        await runWebViewJavaScriptInterfaceTest("getNumberFloat()", 3.14);
    });

    /**
     * Test calling a function that returns a boolean - true
     */
    it("Get boolean - true", async () => {
        await runWebViewJavaScriptInterfaceTest("getTruth()", true);
    });

    /**
     * Test calling a function that returns a boolean - false
     */
    it("Get boolean - false", async () => {
        await runWebViewJavaScriptInterfaceTest("getFalse()", false);
    });

    /**
     * Test calling a function that returns a string
     */
    it("string result from webview JS function", async () => {
        await runWebViewJavaScriptInterfaceTest("getString()", "string result from webview JS function");
    });

    /**
     * Test calling a function that returns an array
     */
    it("getArray()", async () => {
        await runWebViewJavaScriptInterfaceTest("getArray()", [1.5, true, "hello"]);
    });

    /**
     * Test calling a function that returns an object
     */
    it("getObject()", async () => {
        await runWebViewJavaScriptInterfaceTest("getObject()", { prop: "test", name: "object-test", values: [42, 3.14] });
    });

    /**
     * Test calls in the WebView that resolves or rejects a promise.
     */
    it("executeJavaScript promises", async () => {
        const args = await webView.loadUrl(javascriptCallsFile);

        expect(args.error).toBeUndefined();
        expectAsync(webView.executePromise(`testPromiseResolve()`)).toBeResolvedTo(42);
        expectAsync(webView.executePromise(`testPromiseReject()`)).toBeRejectedWith("The Cake is a Lie");
    });
});
