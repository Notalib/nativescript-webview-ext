import { NgModule } from "@angular/core";
import { isKnownView, NativeScriptCommonModule, registerElement } from "@nativescript/angular";

const webviewElementName = "WebViewExt";

if (!isKnownView(webviewElementName)) {
    registerElement(webviewElementName, () => require("@nota/nativescript-webview-ext").WebViewExt);
}

@NgModule()
export class WebViewExtModule {
    imports: [NativeScriptCommonModule];
}
