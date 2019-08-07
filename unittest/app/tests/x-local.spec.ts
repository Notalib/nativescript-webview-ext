import { WebViewExt } from "@nota/nativescript-webview-ext";
import { Page } from "tns-core-modules/ui/page";
import { destroyPageAfterTest, emptyHTMLFile, loadFile, localStyleSheetCssFile, localStyleSheetCssNAME, preparePageForTest } from "./helpers";

describe("x-local schema", () => {
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

    it("XHR", async () => {
        // >> webview-x-localfile-xhr
        webView.registerLocalResource(localStyleSheetCssNAME, localStyleSheetCssFile);

        const expectedData = await loadFile(localStyleSheetCssFile);

        webView.autoExecuteJavaScript(
            `
              (function(window) {
                  window.makeRequestPromise = function(obj) {
                      return new Promise(function(resolve, reject) {
                          var xhr = new XMLHttpRequest();
                          xhr.open(obj.method || "GET", obj.url);

                          xhr.onload = function() {
                              if (xhr.status >= 200 && xhr.status < 300) {
                                  resolve(xhr.response);
                              } else {
                                  reject(new Error('StatusCode: ' + xhr.status));
                              }
                          };

                          xhr.onerror = function(err) {
                              reject(err || xhr.status);
                          };

                          xhr.send(obj.body);
                      });
                  };
              })(window);`,
            "make-request-fn",
        );

        const args = await webView.loadUrl(emptyHTMLFile);

        const expectedTitle = "Blank";
        const actualTitle = await webView.getTitle();
        expect(args.error).toBeUndefined();
        expect(actualTitle).toBe(expectedTitle);

        const actualData = (await webView.executePromise<string>(`makeRequestPromise({url: 'x-local://${localStyleSheetCssNAME}'})`)) || "";

        expect(actualData.trim()).toBe(expectedData.trim());

        // << webview-x-localfile-xhr
    });

    it("Fetch-API", async () => {
        // >> webview-x-localfile-fetch
        webView.registerLocalResource(localStyleSheetCssNAME, localStyleSheetCssFile);

        const expectedData = await loadFile(localStyleSheetCssFile);

        const args = await webView.loadUrl(emptyHTMLFile);

        // >> (hide)
        const expectedTitle = "Blank";
        const actualTitle = await webView.getTitle();
        expect(args.error).toBeUndefined();
        expect(actualTitle).toBe(expectedTitle);

        const fetchUrl = `x-local://${localStyleSheetCssNAME}`;
        const actualData = await webView.executePromise<string>(
            `
              fetch(${JSON.stringify(fetchUrl)})
                  .then(function(response) {
                      const statusCode = response.status;
                      if (statusCode >= 200 && statusCode < 300) {
                          return response.text();
                      }

                      return Promise.reject("StatusCode: " + statusCode);
                  })
          `,
        );

        expect(actualData.trim()).toBe(expectedData.trim());
        // << webview-x-localfile-fetch
    });
});
