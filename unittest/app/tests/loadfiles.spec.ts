import { LoadFinishedEventData, WebViewExt } from "@nota/nativescript-webview-ext";
import { ActionBar } from "tns-core-modules/ui/action-bar/action-bar";
import * as frameModule from "tns-core-modules/ui/frame";
import { Page } from "tns-core-modules/ui/page";
import * as url from "url";
import {
    emptyHTMLFile,
    emptyHTMLXLocalSource,
    eventAsPromise,
    loadFile,
    resolveFilePath,
    testFile,
    testWithSpacesFile,
    preparePageForTest,
    destroyPageAfterTest,
} from "./helpers";

describe("Load files", () => {
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

    it("UpperCase", async () => {
        // >> webview-UPPER_CASE
        try {
            const event = eventAsPromise<LoadFinishedEventData>(webView, WebViewExt.loadFinishedEvent);

            const targetSrc = "HTTPS://github.com/";
            webView.src = targetSrc;

            const args = await event;
            expect(args.error).toBeUndefined();
            expect(url.parse(args.url)).toEqual(url.parse(targetSrc));
        } catch (err) {
            console.log(err);
        }
        // << webview-UPPER_CASE
    });

    describe("Local files", () => {
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

    describe("HTML string", () => {
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

    describe("via x-local", () => {
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
