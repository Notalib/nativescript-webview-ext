import Vue from "nativescript-vue";

const webviewElementName = "WebViewExt";
Vue.registerElement(webviewElementName, () => require("@nota/nativescript-webview-ext").WebViewExt);
