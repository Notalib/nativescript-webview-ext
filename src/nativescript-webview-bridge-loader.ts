import { isAndroid } from "tns-core-modules/platform";

let fetchPolyfillJsCodePromise = Promise.resolve("");
let promisePolyfillJsCodePromise = Promise.resolve("");
let webViewBridgeJsCodePromise = Promise.resolve("");

if (global.TNS_WEBPACK) {
    fetchPolyfillJsCodePromise = Promise.resolve(require("raw-loader!./www/fetch-polyfill.js"));
    if (isAndroid) {
        promisePolyfillJsCodePromise = Promise.resolve(require("raw-loader!./www/promise-polyfill.js"));
    }
    webViewBridgeJsCodePromise = Promise.resolve(require("raw-loader!./www/ns-webview-bridge.js"));
} else {
    const { knownFolders } = require("tns-core-modules/file-system");

    const currentApp = knownFolders.currentApp();

    fetchPolyfillJsCodePromise = currentApp.getFile("tns_modules/@nota/nativescript-webview-ext/www/fetch-polyfill.js").readText();
    if (isAndroid) {
        promisePolyfillJsCodePromise = currentApp.getFile("tns_modules/@nota/nativescript-webview-ext/www/promise-polyfill.js").readText();
    }
    webViewBridgeJsCodePromise = currentApp.getFile("tns_modules/@nota/nativescript-webview-ext/www/ns-webview-bridge.js").readText();
}

export { fetchPolyfillJsCodePromise, promisePolyfillJsCodePromise, webViewBridgeJsCodePromise };
