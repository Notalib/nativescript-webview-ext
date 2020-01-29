import * as observable from "@nativescript/core/data/observable";
import * as trace from "@nativescript/core/trace";
import { Page } from "@nativescript/core/ui/page";
import { isAndroid, LoadEventData, LoadFinishedEventData, ShouldOverrideUrlLoadEventData, WebViewExt, EventData } from "@nota/nativescript-webview-ext";
import * as _ from "lodash";

let webview: WebViewExt;
let page: Page;

trace.setCategories("NOTA");
trace.enable();

// Event handler for Page 'loaded' event attached in main-page.xml
export function pageLoaded(args: EventData) {
    page = args.object as Page;
}

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

async function executeJavaScriptTest<T>(js: string, expected?: T): Promise<T> {
    try {
        const res = await webview.executeJavaScript<T>(js);
        console.log(`executeJavaScript '${js}' => ${JSON.stringify(res)} (${typeof res})`);
        const jsonRes = JSON.stringify(res);
        const expectedJson = JSON.stringify(expected);
        if (expected !== undefined && !_.isEqual(expected, res)) {
            throw new Error(`Expected: ${expectedJson}. Got: ${jsonRes}`);
        }

        return res;
    } catch (err) {
        console.log(`executeJavaScript '${js}' => ERROR: ${err}`);
        throw err;
    }
}

export async function runTests() {
    console.time("runTests");

    await executeJavaScriptTest("callFromNativeScript()");

    const expected = {
        huba: "hop",
    };
    const gotJson = JSON.stringify(gotMessageData);

    if (_.isEqual(expected, gotMessageData)) {
        console.log(`executeJavaScript via message 'callFromNativeScript()' => ${gotJson} (${typeof gotMessageData})`);
    } else {
        throw new Error(`Expected: ${JSON.stringify(expected)}. Got: ${gotJson}`);
    }

    await executeJavaScriptTest("getNumber()", 42);
    await executeJavaScriptTest("getNumberFloat()", 3.14);
    await executeJavaScriptTest("getBoolean()", false);
    await executeJavaScriptTest("getString()", "string result from webview JS function");
    await executeJavaScriptTest("getArray()", [1.5, true, "hello"]);
    await executeJavaScriptTest("getObject()", { name: "object-test", prop: "test", values: [42, 3.14] });

    console.timeEnd("runTests");
}
