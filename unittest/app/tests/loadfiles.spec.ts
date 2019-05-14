import { LoadFinishedEventData, WebViewExt } from "@nota/nativescript-webview-ext";
import { ActionBar } from "tns-core-modules/ui/action-bar/action-bar";
import * as frameModule from "tns-core-modules/ui/frame";
import { Page } from "tns-core-modules/ui/page";
import * as url from "url";
import { emptyHTMLFile, emptyHTMLXLocalSource, eventAsPromise, loadFile, resolveFilePath, testFile, testWithSpacesFile } from "./helpers";

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

    describe("Load external URL", () => {
        const targetSrc = "https://github.com/";

        it("via src property", async () => {
            // >> webview-external-url
            const event = eventAsPromise<LoadFinishedEventData>(webView, WebViewExt.loadFinishedEvent);

            webView.src = targetSrc;

            const args = await event;
            expect(args.error).toBeUndefined();
            expect(url.parse(args.url)).toEqual(url.parse(targetSrc));

            // << webview-external-url
        });

        it("with promise from loadUrl()", async () => {
            // >> webview-existing-url-via-promise
            const args = await webView.loadUrl(targetSrc);

            expect(args.error).toBeUndefined();
            expect(url.parse(args.url)).toEqual(url.parse(targetSrc));
            // << webview-existing-url-via-promise
        });
    });

    it("Load UpperCase Src", async () => {
        // >> webview-UPPER_CASE
        const event = eventAsPromise<LoadFinishedEventData>(webView, WebViewExt.loadFinishedEvent);

        const targetSrc = "HTTPS://github.com/";
        webView.src = targetSrc;

        const args = await event;
        expect(args.error).toBeUndefined();
        expect(url.parse(args.url)).toEqual(url.parse(targetSrc));
        // << webview-UPPER_CASE
    });

    describe("Load local files", () => {
        it("test.html", async () => {
            const targetSrc = testFile;
            const expectedSrc = `file://${resolveFilePath(testFile)}`;
            const expectedTitle = "MyTitle";

            const event = eventAsPromise<LoadFinishedEventData>(webView, WebViewExt.loadFinishedEvent);
            // >> webview-localfile
            webView.src = targetSrc;

            const args = await event;
            expect(args.error).toBeUndefined();
            expect(url.parse(args.url)).toEqual(url.parse(expectedSrc));

            const actualTitle = await webView.getTitle();
            expect(actualTitle).toBe(expectedTitle);
            // << webview-localfile
        });

        it("File with spaces in the path", async () => {
            const targetSrc = testWithSpacesFile;
            const expectedSrc = `file://${resolveFilePath(targetSrc)}`;
            const expectedTitle = "MyTitle";

            const event = eventAsPromise<LoadFinishedEventData>(webView, WebViewExt.loadFinishedEvent);
            // >> webview-localfile-with-space
            webView.src = targetSrc;

            const args = await event;
            expect(args.error).toBeUndefined();
            expect(url.parse(args.url)).toEqual(url.parse(expectedSrc));

            const actualTitle = await webView.getTitle();
            expect(actualTitle).toBe(expectedTitle);
            // << webview-localfile-with-space
        });
    });

    describe("Load HTML string", () => {
        const expectedTitle = "MyTitle";

        it("src-attribute", async () => {
            const targetSrc = await loadFile(testFile);

            const event = eventAsPromise<LoadFinishedEventData>(webView, WebViewExt.loadFinishedEvent);
            // >> webview-string
            webView.src = targetSrc;

            const args = await event;
            expect(args.error).toBeUndefined();

            const actualTitle = await webView.getTitle();
            expect(actualTitle).toBe(expectedTitle);
            // << webview-string
        });

        it("with promise from loadUrl()", async () => {
            const targetSrc = await loadFile(testFile);

            // >> webview-existing-url-via-promise
            const args = await webView.loadUrl(targetSrc);

            expect(args.error).toBeUndefined();

            const actualTitle = await webView.getTitle();
            expect(actualTitle).toBe(expectedTitle);
            // << webview-existing-url-via-promise
        });
    });

    describe("Load x-local files", () => {
        const targetSrc = emptyHTMLXLocalSource;
        const expectedTitle = "Blank";

        it("src-attribute", async () => {
            const event = eventAsPromise<LoadFinishedEventData>(webView, WebViewExt.loadFinishedEvent);
            // >> webview-x-localfile
            webView.registerLocalResource("empty.html", emptyHTMLFile);
            webView.src = targetSrc;

            const args = await event;
            expect(args.error).toBeUndefined();

            const actualTitle = await webView.getTitle();
            expect(actualTitle).toBe(expectedTitle);
            // << webview-x-localfile
        });

        it("with promise from loadUrl()", async () => {
            // >> webview-x-localfile-promise
            webView.registerLocalResource("empty.html", emptyHTMLFile);
            const args = await webView.loadUrl(targetSrc);

            expect(args.error).toBeUndefined();

            const actualTitle = await webView.getTitle();
            expect(actualTitle).toBe(expectedTitle);
            // << webview-x-localfile-promise
        });
    });
});
