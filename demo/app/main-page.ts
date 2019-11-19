import * as observable from "@nativescript/core/data/observable";
import * as trace from "@nativescript/core/trace";
import { isAndroid, LoadEventData, LoadFinishedEventData, ShouldOverrideUrlLoadEventData, WebViewExt } from "@nota/nativescript-webview-ext";
import * as _ from "lodash";

let webview: WebViewExt;

trace.setCategories("NOTA");
trace.enable();

// Event handler for Page 'loaded' event attached in main-page.xml
export function pageLoaded(args: observable.EventData) {}

let gotMessageData: any = null;
export function webviewLoaded(args: LoadEventData) {
    webview = args.object;

    if (isAndroid) {
        webview.src = "http://10.0.2.2:8080";
    } else {
        webview.src = "http://localhost:8080";
    }

    webview.on(WebViewExt.shouldOverrideUrlLoadingEvent, (args: ShouldOverrideUrlLoadEventData) => {
        console.log(args.url);
        console.log(args.httpMethod);
        if (args.url.indexOf("google.com") !== -1) {
            args.cancel = true;
        }
    });

    webview.on(WebViewExt.loadFinishedEvent, (args: LoadFinishedEventData) => {
        console.log(`WebViewExt.loadFinishedEvent: ${args.url}`);
        webview.loadStyleSheetFile("local-stylesheet.css", "~/assets/test-data/css/local-stylesheet.css", false);
    });

    webview.on("gotMessage", (msg) => {
        gotMessageData = msg.data;
        console.log(`webview.gotMessage: ${JSON.stringify(msg.data)} (${typeof msg})`);
    });
}

function executeJavaScriptTest<T>(js: string, expected?: T): Promise<T> {
    return webview
        .executeJavaScript<T>(js)
        .then((res: T) => {
            console.log(`executeJavaScript '${js}' => ${JSON.stringify(res)} (${typeof res})`);
            const jsonRes = JSON.stringify(res);
            const expectedJson = JSON.stringify(expected);
            if (expected !== undefined && !_.isEqual(expected, res)) {
                return Promise.reject(new Error(`Expected: ${expectedJson}. Got: ${jsonRes}`));
            }
            return Promise.resolve(res);
        })
        .catch((err) => {
            console.log(`executeJavaScript '${js}' => ERROR: ${err}`);
            throw err;
        });
}

export function runTests() {
    console.time("tests");
    Promise.all([
        executeJavaScriptTest("callFromNativeScript()").then(() => {
            const expected = { huba: "hop" };
            const expectedJson = JSON.stringify(expected);
            const gotJson = JSON.stringify(gotMessageData);
            if (!_.isEqual(expected, gotMessageData)) {
                console.log(`executeJavaScript via message 'callFromNativeScript()' => ${gotJson} (${typeof gotMessageData})`);
                return Promise.resolve(gotMessageData);
            }

            return Promise.reject(new Error(`Expected: ${expectedJson}. Got: ${gotJson}`));
        }),
        executeJavaScriptTest("getNumber()", 42),
        executeJavaScriptTest("getNumberFloat()", 3.14),
        executeJavaScriptTest("getBoolean()", false),
        executeJavaScriptTest("getString()", "string result from webview JS function"),
        executeJavaScriptTest("getArray()", [1.5, true, "hello"]),
        executeJavaScriptTest("getObject()", { name: "object-test", prop: "test", values: [42, 3.14] }),
    ]).then(() => {
        console.timeEnd("tests");
    });
}
