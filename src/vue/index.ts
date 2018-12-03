import { registerElement } from "nativescript-vue";

const webviewElementName = "WebViewExt";

registerElement(webviewElementName, () => require("@nota/nativescript-webview-ext").WebViewExt);
