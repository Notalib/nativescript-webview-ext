import { LoadFinishedEventData, WebViewExt } from "@nota/nativescript-webview-ext";
import * as frameModule from "tns-core-modules/ui/frame";
import { Page } from "tns-core-modules/ui/page";
import * as url from "url";
import { eventAsPromise } from "./helpers";

describe("@nota/nativescript-webview-ext", () => {
    let currentPage: Page;
    let webView: WebViewExt;
    const topmost = frameModule.topmost();

    beforeEach((cb) => {
        currentPage = new Page();
        topmost.navigate({
            create() {
                return currentPage;
            },
            animated: false,
        });

        currentPage.once(Page.navigatedToEvent, () => {
            webView = new WebViewExt();
            currentPage.content = webView;

            cb();
        });
    });

    afterEach((cb) => {
        currentPage = null;
        webView = null;

        topmost.goBack();
        cb();
    });

    describe("Load external URL", () => {
        const targetSrc = "https://github.com/";

        it("via src property", async () => {
            // >> webview-external-url
            const event = eventAsPromise<LoadFinishedEventData>(webView, WebViewExt.loadFinishedEvent);

            webView.src = targetSrc;

            // >> (hide)
            const args = await event;
            expect(args.error).toBeUndefined();
            expect(url.parse(args.url)).toEqual(url.parse(targetSrc));
            // << (hide)

            // << webview-external-url
        });

        it("with promise from loadUrl()", async () => {
            // >> webview-existing-url-via-promise
            const args = await webView.loadUrl(targetSrc);

            // >> (hide)
            expect(args.error).toBeUndefined();
            expect(url.parse(args.url)).toEqual(url.parse(targetSrc));
            // << (hide)

            // << webview-existing-url-via-promise
        });
    });
});
