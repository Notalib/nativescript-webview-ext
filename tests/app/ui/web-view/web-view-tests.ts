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
        const webView = this.testView;

        // >> webview-url
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, (args: webViewModule.LoadEventData) =>  {
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
        const webView = this.testView;

        const targetSrc = '~/ui/web-view/test.html';

        // >> webview-localfile
        webView.on(webViewModule.WebViewExt.loadFinishedEvent, async (args: webViewModule.LoadEventData) =>  {
            // >> (hide)
            const actualTitle = await webView.getTitle();
            const expectedTitle = 'MyTitle';

            try {
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(actualTitle, expectedTitle, `File ${targetSrc} not loaded properly.`);
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
        webView.src = targetSrc;
        // << webview-localfile
    }

    public testLoadLocalFileWithSpaceInPath(done) {
        const webview = this.testView;

        webview.on(webViewModule.WebViewExt.loadFinishedEvent, async (args: webViewModule.LoadEventData) =>  {
            const actualTitle = await webview.getTitle();
            const expectedTitle = 'MyTitle';

            try {
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(actualTitle, expectedTitle, "File ~/ui/web-view/test.html not loaded properly.");
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
        webview.src = "~/ui/web-view/test with spaces.html";
    }

    public testLoadHTMLString(done) {
        const webview = this.testView;

        // >> webview-string
        webview.on(webViewModule.WebViewExt.loadFinishedEvent, async (args: webViewModule.LoadEventData) =>  {
            // >> (hide)
            const actualTitle = await webview.getTitle();
            const expectedTitle = 'MyTitle';

            try {
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(actualTitle, expectedTitle, "HTML string not loaded properly. Actual: ");
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
        webview.src = '<!DOCTYPE html><html><head><title>MyTitle</title><meta charset="utf-8" /></head><body><span style="color:red">TestÖ</span></body></html>';
        // << webview-string
    }

    public testLoadSingleXLocalFile(done) {
        const webview = this.testView;

        const emptyHTMLXLocalSource = 'x-local://empty.html';

        webview.registerLocalResource('empty.html', emptyHTMLFile);

        // >> webview-x-localfile
        webview.on(webViewModule.WebViewExt.loadFinishedEvent, async (args: webViewModule.LoadEventData) =>  {
            // >> (hide)
            const expectedTitle = 'Blank';
            const actualTitle = await webview.getTitle();

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
        webview.src = emptyHTMLXLocalSource;
        // << webview-x-localfile
    }

    public testInjectFilesPredefinedStyleSheetLink(done) {
        const webview = this.testView;

        const expectedRedColor = 'rgb(0, 128, 0)';

        webview.registerLocalResource(localStyleSheetCssNAME, localStyleSheetCssFile);

        // >> webview-x-local-predefined-link
        webview.on(webViewModule.WebViewExt.loadFinishedEvent, async (args: webViewModule.LoadEventData) =>  {
            // >> (hide)
            const expectedTitle = 'Load predefined x-local stylesheet';

            try {
                TKUnit.assertNull(args.error, args.error);

                const actualTitle = await webview.getTitle();
                TKUnit.assertEqual(actualTitle, expectedTitle, `File "${cssPreDefinedlinkFile}" not loaded properly.`);

                const styles = await webview.executeJavaScript<any>(jsGetElementStyleSheet);
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
        webview.src = cssPreDefinedlinkFile;
        // << webview-x-local-predefined-link
    }

    public testInjectFilesStyleSheetLink(done) {
        const webview = this.testView;

        const expectedRedColor = 'rgb(0, 128, 0)';

        webview.registerLocalResource(localStyleSheetCssNAME, localStyleSheetCssFile);

        // >> webview-x-local-inject-once
        webview.on(webViewModule.WebViewExt.loadFinishedEvent, async (args: webViewModule.LoadEventData) =>  {
            // >> (hide)
            const expectedTitle = 'Inject stylesheet via x-local';

            try {
                const actualTitle = await webview.getTitle();
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(actualTitle, expectedTitle, `File "${cssNotPredefinedFile}" not loaded properly.`);

                await webview.loadStyleSheetFile(localStyleSheetCssNAME, localStyleSheetCssFile);
                await timeoutPromise();

                const styles = await webview.executeJavaScript<any>(jsGetElementStyleSheet);
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
        webview.src = cssNotPredefinedFile;
        // << webview-x-local-inject-once
    }

    public testInjectJavaScriptOnce(done) {
        const webview = this.testView;

        webview.registerLocalResource(localJavaScriptName, localJavaScriptFile);

        // >> webview-x-local-inject-once
        webview.on(webViewModule.WebViewExt.loadFinishedEvent, async (args: webViewModule.LoadEventData) =>  {
            // >> (hide)
            const expectedTitle = 'Blank';

            try {
                const actualTitle = await webview.getTitle();
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(actualTitle, expectedTitle, `File "${javascriptCallsXLocalFile}" not loaded properly.`);

                await webview.loadJavaScriptFile(localJavaScriptName, localJavaScriptFile);
                await timeoutPromise();

                TKUnit.assertEqual(await webview.executeJavaScript(`getNumber()`), 42);
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
        webview.src = javascriptCallsXLocalFile;
        // << webview-x-local-inject-once
    }

    public testInjectJavaScriptAutoLoad(done) {
        const webview = this.testView;

        webview.autoLoadJavaScriptFile(localJavaScriptName, localJavaScriptFile);

        const sources = [javascriptCallsXLocalFile, emptyHTMLFile];
        let targetSrc = sources.pop();

        // >> webview-x-local-inject-once
        webview.on(webViewModule.WebViewExt.loadFinishedEvent, async (args: webViewModule.LoadEventData) =>  {
            // >> (hide)

            try {
                TKUnit.assertNull(args.error, args.error);

                await timeoutPromise();
                TKUnit.assertEqual(await webview.executeJavaScript(`getNumber()`), 42, `Failed to get number 42 from "${targetSrc}"`);

                targetSrc = sources.pop();
                if (targetSrc) {
                    webview.src = targetSrc;
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

        webview.src = targetSrc;
        // << webview-x-local-inject-once
    }

    // Testing JavaScript Bridge

    /**
     * Tests event callback by triggering an event in the webview that emits an event to the nativescript layer.
     */
    public testWebViewBridgeEvents(done) {
        const webview = this.testView;

        const expected = {
            huba: 'hop',
        };

        webview.on('web-message', (args: any) => {
            try {
                const data = args.data;
                TKUnit.assertDeepEqual(data, expected);
                done(null);
            } catch (err) {
                done(err);
            }

            webview.off('web-message');
        });

        // >> webview-x-local-inject-once
        webview.on(webViewModule.WebViewExt.loadFinishedEvent, async (args: webViewModule.LoadEventData) =>  {
            // >> (hide)

            try {
                TKUnit.assertNull(args.error, args.error);

                await webview.executeJavaScript(`setupEventListener()`);
                await timeoutPromise();
                webview.emitToWebView('tns-message', expected);
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

        webview.src = javascriptCallsFile;
        // << webview-x-local-inject-once
    }

    /**
     * Test calling a function that returns an integer
     */
    public testWebViewJavaScriptGetNumber(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getNumber()', 42, 'The answer to the ultimate question of life, the universe and everything');
    }

    /**
     * Test calling a function that returns a floating number
     */
    public testWebViewJavaScriptGetNumberFloat(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getNumberFloat()', 3.14, 'Get pi');
    }

    /**
     * Test calling a function that returns a boolean - true
     */
    public testWebViewJavaScriptGetBoeleanTrue(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getTruth()', true, 'Get boolean - true');
    }

    /**
     * Test calling a function that returns a boolean - false
     */
    public testWebViewJavaScriptGetBoeleanFalse(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getFalse()', false, 'Get boolean - false');
    }

    /**
     * Test calling a function that returns a string
     */
    public testWebViewJavaScriptGetString(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getString()', 'string result from webview JS function', 'string result from webview JS function');
    }

    /**
     * Test calling a function that returns an array
     */
    public testWebViewJavaScriptGetArray(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getArray()', [1.5, true, "hello"], 'getArray()');
    }

    /**
     * Test calling a function that returns an object
     */
    public testWebViewJavaScriptGetObject(done) {
        this.runWebViewJavaScriptInterfaceTest(done, 'getObject()', { prop: "test", name: "object-test", values: [42, 3.14] }, 'getObject()');
    }

    /**
     * Helper function for calling a javascript function in the webview and getting the value.
     */
    private runWebViewJavaScriptInterfaceTest<T>(done, scriptCode: string, expected: T, msg: string) {
        const webview = this.testView;

        // >> webview-x-local-inject-once
        webview.on(webViewModule.WebViewExt.loadFinishedEvent, async (args: webViewModule.LoadEventData) =>  {
            // >> (hide)

            try {
                TKUnit.assertNull(args.error, args.error);

                TKUnit.assertDeepEqual(await webview.executeJavaScript(scriptCode), expected, msg);
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

        webview.src = javascriptCallsFile;
        // << webview-x-local-inject-once
    }

    /**
     * Test calls in the WebView that resolves or rejects a promise.
     */
    public testWebViewJavaScriptPromiseInterface(done) {
        const webview = this.testView;

        // >> webview-x-local-inject-once
        webview.on(webViewModule.WebViewExt.loadFinishedEvent, async (args: webViewModule.LoadEventData) =>  {
            // >> (hide)

            try {
                TKUnit.assertNull(args.error, args.error);

                TKUnit.assertDeepEqual(await webview.executePromise(`testPromiseResolve()`), 42, 'Resolve promise');
            }
            catch (e) {
                done(e);
                return;
            }

            let rejectErr: Error = null;
            try {
                await webview.executePromise(`testPromiseReject()`);
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

        webview.src = javascriptCallsFile;
        // << webview-x-local-inject-once
    }

    public testLoadUpperCaseSrc(done) {
        const webview = this.testView;
        const targetSrc = "HTTPS://github.com/";

        webview.on(webViewModule.WebViewExt.loadFinishedEvent, (args: webViewModule.LoadEventData) =>  {
            try {
                TKUnit.assertNull(args.error, args.error);
                TKUnit.assertEqual(args.url, targetSrc.toLowerCase(), "args.url");
                done(null);
            }
            catch (e) {
                done(e);
            }
        });

        webview.src = targetSrc;
    }
}

export function createTestCase(): WebViewTest {
    return new WebViewTest();
}
