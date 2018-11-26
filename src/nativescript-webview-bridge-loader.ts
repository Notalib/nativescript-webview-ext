import { isIOS } from "tns-core-modules/platform";
import * as platform from "tns-core-modules/platform";

let fetchPolyfill = Promise.resolve("");
let promisePolyfill = Promise.resolve("");
let webViewBridge = Promise.resolve("");
let nsXMLHttpRequest = Promise.resolve("");
let metadataViewPort = Promise.resolve("");

const loadNSXMLHttpRequest = isIOS && Number(platform.device.sdkVersion) >= 11;

if (global.TNS_WEBPACK) {
    fetchPolyfill = Promise.resolve(require("raw-loader!./www/fetch-polyfill.js"));

    promisePolyfill = Promise.resolve(require("raw-loader!./www/promise-polyfill.js"));

    webViewBridge = Promise.resolve(require("raw-loader!./www/ns-webview-bridge.js"));

    if (loadNSXMLHttpRequest) {
        nsXMLHttpRequest = Promise.resolve(require("raw-loader!./www/ns-xml-http-request.js"));
    }

    metadataViewPort = Promise.resolve(require("raw-loader!./www/metadata-view-port.js"));
} else {
    const { knownFolders } = require("tns-core-modules/file-system");

    const currentApp = knownFolders.currentApp();

    const loadScriptFile = (scriptName: string) => {
        const basePath = "tns_modules/@nota/nativescript-webview-ext/www";
        return currentApp.getFile(`${basePath}/${scriptName}`).readText();
    };

    fetchPolyfill = loadScriptFile("fetch-polyfill.js");

    promisePolyfill = loadScriptFile("promise-polyfill.js");

    webViewBridge = loadScriptFile("ns-webview-bridge.js");

    if (loadNSXMLHttpRequest) {
        nsXMLHttpRequest = loadScriptFile("ns-xml-http-request.js");
    }

    metadataViewPort = loadScriptFile("metadata-view-port.js");
}

export { fetchPolyfill, promisePolyfill, webViewBridge, nsXMLHttpRequest, metadataViewPort };
