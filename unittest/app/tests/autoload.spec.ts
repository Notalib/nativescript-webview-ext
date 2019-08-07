import { WebViewExt } from "@nota/nativescript-webview-ext";
import { Page } from "tns-core-modules/ui/page";
import {
    destroyPageAfterTest,
    emptyHTMLFile,
    eventAsPromise,
    javascriptCallsXLocalFile,
    localJavaScriptFile,
    localJavaScriptName,
    preparePageForTest,
} from "./helpers";

describe("Auto load", () => {
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

    it("autoExecuteJavaScript", async () => {
        const expectedTitle = "Blank";
        const expectedMessage = `${new Date()}`;

        const messageEvent1 = eventAsPromise<any>(webView, "tns-message-1");
        const messageEvent2 = eventAsPromise<any>(webView, "tns-message-2");
        const messageEvent3 = eventAsPromise<any>(webView, "tns-message-3");

        // >> webview-auto-exec-javascript
        const autoLoadScript1 = `
          new Promise(function(resolve) {
            window.nsWebViewBridge.emit("tns-message-1", ${JSON.stringify(expectedMessage)});

            setTimeout(resolve, 50);
          }).then(function() {
            window.firstPromiseResolved = true;
          });
        `;

        const autoLoadScript2 = `
          new Promise(function(resolve, reject) {
            // console.log('SECOND_PROMISE: ' + !!window.firstPromiseResolved);
            if (!window.firstPromiseResolved) {
              reject(new Error('First promise not resolved'));
              return;
            }
            window.nsWebViewBridge.emit("tns-message-2", ${JSON.stringify(expectedMessage)});
            resolve();
          }).then(function() {
            window.secondPromiseResolved = true;
          });
        `;
        const autoLoadScript3 = `
          new Promise(function(resolve, reject) {
            // console.log('THIRD_PROMISE: ' + !!window.secondPromiseResolved);
            if (!window.secondPromiseResolved) {
              reject(new Error('Second promise not resolved'));
              return;
            }
            window.nsWebViewBridge.emit("tns-message-3", ${JSON.stringify(expectedMessage)});
            resolve();
        });`;
        webView.autoExecuteJavaScript(autoLoadScript1, "tns-message");
        webView.autoExecuteJavaScript(autoLoadScript2, "tns-message-2");
        webView.autoExecuteJavaScript(autoLoadScript3, "tns-message-3");

        const args = await webView.loadUrl(emptyHTMLFile);
        expect(args.error).toBeUndefined();

        const actualTitle = await webView.getTitle();
        expect(actualTitle).toBe(expectedTitle);
        const messageArgs = await Promise.all([messageEvent1, messageEvent2, messageEvent3]);

        for (const { data } of messageArgs) {
            expect(data).toBe(expectedMessage);
        }

        // << webview-auto-exec-javascript
    });

    it("autoLoadJavaScriptFile", async () => {
        const expectedTitle = "Blank";

        // >> webview-autoload-javascript
        webView.autoLoadJavaScriptFile(localJavaScriptName, localJavaScriptFile);

        const args1 = await webView.loadUrl(javascriptCallsXLocalFile);
        expect(args1.error).toBeUndefined();

        const actualTitle1 = await webView.getTitle();
        expect(actualTitle1).toBe(expectedTitle);
        expect(await webView.executeJavaScript(`getNumber()`)).toBe(42);

        const args2 = await webView.loadUrl(emptyHTMLFile);
        expect(args2.error).toBeUndefined();

        const actualTitle2 = await webView.getTitle();
        expect(actualTitle2).toBe(expectedTitle);
        expect(await webView.executeJavaScript(`getNumber()`)).toBe(42);
        // << webview-autoload-javascript
    });
});
