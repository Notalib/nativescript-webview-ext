import { NgModule } from "@angular/core";
import { isKnownView, registerElement } from "nativescript-angular/element-registry";

const webviewElementName = "WebViewExt";

if (!isKnownView(webviewElementName)) {
    registerElement(webviewElementName, () => require("../webview-ext").WebViewExt);
}

@NgModule()
export class WebViewExtModule {}
