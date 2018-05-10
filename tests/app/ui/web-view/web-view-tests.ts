import * as TKUnit from "../../TKUnit";
import * as testModule from "../../ui-test";

// >> webview-require
import * as webViewModule from "@nota/nativescript-webview-ext";
// << webview-require

import * as trace from 'tns-core-modules/trace';
trace.setCategories('NOTA');

// >> declare-webview-xml
//  <Page>
//       {%raw%}<WebView src="{{ someUrl | pathToLocalFile | htmlString }}" />{%endraw%}
//  </Page>
// << declare-webview-xml

function timeoutPromise(delay = 100) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

// HTML test files
const emptyHTMLFile = '~/ui/web-view/assets/html/empty.html';
const javascriptCallsFile = '~/ui/web-view/assets/html/javascript-calls.html';
const javascriptCallsXLocalFile = '~/ui/web-view/assets/html/javascript-calls-x-local.html';
const cssNotPredefinedFile = '~/ui/web-view/assets/html/css-not-predefined.html';
const cssPreDefinedlinkFile = '~/ui/web-view/assets/html/css-predefined-link-tags.html';

// Resource loads
const localStyleSheetCssNAME = 'local-stylesheet.css';
const localStyleSheetCssFile = '~/ui/web-view/assets/css/local-stylesheet.css';

const localJavaScriptName = 'local-javascript.js';
const localJavaScriptFile = '~/ui/web-view/assets/js/local-javascript.js';

const jsGetElementStyleSheet = `
(function() {
    const els = document.getElementsByClassName('red');
    if (!els.length) {
        return 'Element not found';
    }

    var el = els[0];

    var style = window.getComputedStyle(el);
    var result = {};

    Object.keys(style)
        .filter(function(key) {
            return isNaN(key);
        })
        .forEach(function(key) {
            result[key] = style[key];
        });

    return result;
})();
`;

export class WebViewTest extends testModule.UITest<webViewModule.WebViewExt> {

    public create(): webViewModule.WebViewExt {
        // >> declare-webview
        let webView = new webViewModule.WebViewExt();
        // << declare-webview
        return webView;
    }

    public testLoadExistingUrl(done) {
        let webView = this.testView;

        // >> webview-url
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, function (args: webViewModule.LoadEventData) {
            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }

            // >> (hide)
            try {
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(args.url, "https://github.com/", "args.url");
                done(null);
            }
            catch (e) {
                done(e);
            }

            // << (hide)
        });
        webView.src = "https://github.com/";
        // << webview-url
    }

    public testLoadLocalFile(done) {
        let webView = this.testView;

        // >> webview-localfile
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, function (args: webViewModule.LoadEventData) {
            // >> (hide)
            let actual;
            let expectedTitle = 'MyTitle';

            if (webView.ios) {
                actual = webView.ios.title;
            } else if (webView.android) {
                actual = webView.android.getTitle();
            }

            try {
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(actual, expectedTitle, "File ~/ui/web-view/test.html not loaded properly.");
                done(null);
            }
            catch (e) {
                done(e);
            }
            // << (hide)

            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }
        });
        webView.src = "~/ui/web-view/test.html";
        // << webview-localfile
    }

    public testLoadLocalFileWithSpaceInPath(done) {
        let webView = this.testView;

        webView.on(webViewModule.WebViewExt.loadFinishedEvent, function (args: webViewModule.LoadEventData) {
            let actual;
            let expectedTitle = 'MyTitle';

            if (webView.ios) {
                actual = webView.ios.title;
            } else if (webView.android) {
                actual = webView.android.getTitle();
            }

            try {
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(actual, expectedTitle, "File ~/ui/web-view/test.html not loaded properly.");
                done(null);
            }
            catch (e) {
                done(e);
            }

            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }
        });
        webView.src = "~/ui/web-view/test with spaces.html";
    }

    public testLoadHTMLString(done) {
        let webView = this.testView;

        // >> webview-string
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, function (args: webViewModule.LoadEventData) {
            // >> (hide)

            let actual;
            const expected = 'MyTitle';

            if (webView.ios) {
                actual = webView.ios.title;
            } else if (webView.android) {
                actual = webView.android.getTitle();
            }

            try {
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(actual, expected, "HTML string not loaded properly. Actual: ");
                done(null);
            }
            catch (e) {
                done(e);
            }
            // << (hide)

            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }
        });
        webView.src = '<!DOCTYPE html><html><head><title>MyTitle</title><meta charset="utf-8" /></head><body><span style="color:red">TestÖ</span></body></html>';
        // << webview-string
    }

    public testLoadSingleXLocalFile(done) {
        let webView = this.testView;

        const emptyHTMLXLocalSource = 'x-local://empty.html';

        webView.registerLocalResource('empty.html', emptyHTMLFile);

        // >> webview-x-localfile
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, async function (args: webViewModule.LoadEventData) {
            // >> (hide)
            const expectedTitle = 'Blank';
            const actualTitle = await webView.getTitle();

            try {
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(actualTitle, expectedTitle, `File "${emptyHTMLXLocalSource}" not loaded properly.`);
                done(null);
            }
            catch (e) {
                done(e);
            }
            // << (hide)

            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }
        });
        webView.src = emptyHTMLXLocalSource;
        // << webview-x-localfile
    }

    public testInjectFilesPredefinedStyleSheetLink(done) {
        let webView = this.testView;

        const expectedRedColor = 'rgb(0, 128, 0)';

        webView.registerLocalResource(localStyleSheetCssNAME, localStyleSheetCssFile);

        // >> webview-x-local-predefined-link
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, async function (args: webViewModule.LoadEventData) {
            // >> (hide)
            const expectedTitle = 'Load predefined x-local stylesheet';

            try {
                TKUnit.assertNull(args.error, args.error);

                const actualTitle = await webView.getTitle();
                TKUnit.assertEqual(actualTitle, expectedTitle, `File "${cssPreDefinedlinkFile}" not loaded properly.`);

                const styles = await webView.executeJavaScript<any>(jsGetElementStyleSheet);
                TKUnit.assertNotNull(styles, `Couldn't load styles`);
                TKUnit.assertEqual(styles.color, expectedRedColor, `div.red isn't red`);
                done(null);
            }
            catch (e) {
                done(e);
            }
            // << (hide)

            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }
        });
        webView.src = cssPreDefinedlinkFile;
        // << webview-x-local-predefined-link
    }

    public testInjectFilesStyleSheetLink(done) {
        let webView = this.testView;

        const expectedRedColor = 'rgb(0, 128, 0)';

        webView.registerLocalResource(localStyleSheetCssNAME, localStyleSheetCssFile);

        // >> webview-x-local-inject-once
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, async function (args: webViewModule.LoadEventData) {
            // >> (hide)
            const expectedTitle = 'Inject stylesheet via x-local';

            try {
                const actualTitle = await webView.getTitle();
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(actualTitle, expectedTitle, `File "${cssNotPredefinedFile}" not loaded properly.`);

                await webView.loadStyleSheetFile(localStyleSheetCssNAME, localStyleSheetCssFile);
                await timeoutPromise();

                const styles = await webView.executeJavaScript<any>(jsGetElementStyleSheet);
                TKUnit.assertNotNull(styles, `Couldn't load styles`);
                TKUnit.assertEqual(styles.color, expectedRedColor, `div.red isn't red`);
                done(null);
            }
            catch (e) {
                done(e);
            }
            // << (hide)

            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }
        });
        webView.src = cssNotPredefinedFile;
        // << webview-x-local-inject-once
    }

    public testInjectJavaScriptOnce(done) {
        let webView = this.testView;

        webView.registerLocalResource(localJavaScriptName, localJavaScriptFile);

        // >> webview-x-local-inject-once
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, async function (args: webViewModule.LoadEventData) {
            // >> (hide)
            const expectedTitle = '';

            try {
                const actualTitle = await webView.getTitle();
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(actualTitle, expectedTitle, `File "${javascriptCallsXLocalFile}" not loaded properly.`);

                await webView.loadJavaScriptFile(localJavaScriptName, localJavaScriptFile);
                await timeoutPromise();

                TKUnit.assertEqual(await webView.executeJavaScript(`getNumber()`), 42);
                done(null);
            }
            catch (e) {
                done(e);
            }
            // << (hide)

            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }
        });
        webView.src = javascriptCallsXLocalFile;
        // << webview-x-local-inject-once
    }

    public testInjectJavaScriptAutoLoad(done) {
        let webView = this.testView;

        webView.autoLoadJavaScriptFile(localJavaScriptName, localJavaScriptFile);

        const sources = [javascriptCallsXLocalFile, emptyHTMLFile];
        let src = sources.pop();

        // >> webview-x-local-inject-once
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, async function (args: webViewModule.LoadEventData) {
            // >> (hide)

            try {
                TKUnit.assertNull(args.error, args.error);

                await timeoutPromise();
                TKUnit.assertEqual(await webView.executeJavaScript(`getNumber()`), 42, `Failed to get number 42 from ${src}`);

                src = sources.pop();
                if (src) {
                    webView.src = src;
                } else {
                    done(null);
                }
            }
            catch (e) {
                done(e);
            }
            // << (hide)

            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }
        });

        webView.src = src;
        // << webview-x-local-inject-once
    }

    public testWebViewBridgeEvents(done) {
        let webView = this.testView;

        const expected = {
            huba: 'hop',
        };

        webView.on('web-message', (args: any) => {
            try {
                const data = args.data;
                TKUnit.assertDeepEqual(data, expected);
                done(null);
            } catch (err) {
                done(err);
            }

            webView.off('web-message');
        });

        // >> webview-x-local-inject-once
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, async function (args: webViewModule.LoadEventData) {
            // >> (hide)

            try {
                TKUnit.assertNull(args.error, args.error);

                await webView.executeJavaScript(`setupEventListener()`);
                await timeoutPromise();
                webView.emitToWebView('tns-message', expected);
            }
            catch (e) {
                done(e);
            }
            // << (hide)

            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }
        });

        webView.src = javascriptCallsFile;
        // << webview-x-local-inject-once
    }

    public testWebViewJavaScriptGetNumber(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getNumber()', 42, 'The answer to the ultimate question of life, the universe and everything');
    }

    public testWebViewJavaScriptGetNumberFloat(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getNumberFloat()', 3.14, 'Get pi');
    }

    public testWebViewJavaScriptGetBoeleanTrue(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getTruth()', true, 'Get boolean - true');
    }

    public testWebViewJavaScriptGetBoeleanFalse(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getFalse()', false, 'Get boolean - false');
    }

    public testWebViewJavaScriptGetString(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getString()', 'string result from webview JS function', 'string result from webview JS function');
    }

    public testWebViewJavaScriptGetArray(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getArray()', [1.5, true, "hello"], 'getArray()');
    }

    public testWebViewJavaScriptGetObject(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getObject()', { prop: "test", name: "object-test", values: [42, 3.14] }, 'getObject()');
    }

    private runWebViewJavaScriptInterfaceTest(done, scriptCode: string, expected: any, msg: string) {
        let webView = this.testView;

        // >> webview-x-local-inject-once
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, async function (args: webViewModule.LoadEventData) {
            // >> (hide)

            try {
                TKUnit.assertNull(args.error, args.error);

                TKUnit.assertDeepEqual(await webView.executeJavaScript(scriptCode), expected, msg);
                done(null);
            }
            catch (e) {
                done(e);
            }
            // << (hide)

            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }
        });

        webView.src = javascriptCallsFile;
        // << webview-x-local-inject-once
    }

    public testWebViewJavaScriptPromiseInterface(done) {
        let webView = this.testView;

        // >> webview-x-local-inject-once
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, async function (args: webViewModule.LoadEventData) {
            // >> (hide)

            try {
                TKUnit.assertNull(args.error, args.error);

                TKUnit.assertDeepEqual(await webView.executePromise(`testPromiseResolve()`), 42, 'Resolve promise');
            }
            catch (e) {
                done(e);
                return;
            }

            let rejectErr: Error = null;
            try {
                await webView.executePromise(`testPromiseReject()`);
            } catch (err) {
                rejectErr = err;
            }

            try {
                TKUnit.assertNotNull(rejectErr);

                TKUnit.assertEqual(rejectErr.message, 'The Cake is a Lie');
                done(null);
            } catch (err) {
                done(err);
            }

            // << (hide)

            let message;
            if (!args.error) {
                message = "WebView finished loading " + args.url;
            }
            else {
                message = "Error loading " + args.url + ": " + args.error;
            }
        });

        webView.src = javascriptCallsFile;
        // << webview-x-local-inject-once
    }

    public testLoadUpperCaseSrc(done) {
        let webView = this.testView;
        let targetSrc = "HTTPS://github.com/";

        webView.on(webViewModule.WebViewExt.loadFinishedEvent, function (args: webViewModule.LoadEventData) {
            try {
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(args.url, targetSrc.toLowerCase(), "args.url");
                done(null);
            }
            catch (e) {
                done(e);
            }
        });

        webView.src = targetSrc;
    }
}

export function createTestCase(): WebViewTest {
    return new WebViewTest();
}
