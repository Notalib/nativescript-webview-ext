let webViewBridgeJsCodePromise: Promise<string>;
let promisePolyfillJsCodePromise: Promise<string>;

if (global.TNS_WEBPACK) {
    webViewBridgeJsCodePromise = Promise.resolve(require("raw-loader!./www/ns-webview-bridge.js"));

    promisePolyfillJsCodePromise = Promise.resolve(require("raw-loader!./www/promise-polyfill.js"));
} else {
    const { knownFolders } = require("tns-core-modules/file-system");

    const currentApp = knownFolders.currentApp();

    webViewBridgeJsCodePromise = currentApp.getFile("tns_modules/@nota/nativescript-webview-ext/www/ns-webview-bridge.js").readText();

    promisePolyfillJsCodePromise = currentApp.getFile("tns_modules/@nota/nativescript-webview-ext/www/promise-polyfill.js").readText();
}

export { webViewBridgeJsCodePromise, promisePolyfillJsCodePromise };
