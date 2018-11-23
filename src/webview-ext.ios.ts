/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />

import * as platform from "tns-core-modules/platform";
import { profile } from "tns-core-modules/profiling";
import { traceMessageType } from "tns-core-modules/ui/core/view";

import { autoInjectJSBridgeProperty, IOSWebViewBridge, WebViewExtBase } from "./webview-ext-common";
import { UIWebViewWrapper } from "./webview-ext.uiwebview";
import { WKWebViewWrapper } from "./webview-ext.wkwebview";

export * from "./webview-ext-common";

export class WebViewExt extends WebViewExtBase {
    protected _ios: WKWebView | UIWebView;

    protected nativeBridge: IOSWebViewBridge;

    constructor() {
        super();

        if (Number(platform.device.sdkVersion) >= 11) {
            this.initIOS11Plus();
        } else {
            this.initIOS9and10();
        }
    }

    protected initIOS11Plus() {
        this.isUIWebView = false;
        this.isWKWebView = true;

        const nativeBridge = new WKWebViewWrapper(this);
        this.nativeViewProtected = this._ios = nativeBridge.createNativeView();
        nativeBridge.initNativeView();

        this.nativeBridge = nativeBridge;
    }

    protected initIOS9and10() {
        this.isUIWebView = true;
        this.isWKWebView = false;

        const nativeBridge = new UIWebViewWrapper(this);
        this.nativeViewProtected = this._ios = nativeBridge.createNativeView();
        nativeBridge.initNativeView();

        this.nativeBridge = nativeBridge;
    }

    protected injectWebViewBridge() {
        if (this.nativeBridge.shouldInjectWebViewBridge) {
            return super.injectWebViewBridge();
        }

        return Promise.resolve();
    }

    public executeJavaScript<T>(scriptCode: string, stringifyResult = true): Promise<T> {
        if (stringifyResult) {
            scriptCode = `
                (function(window) {
                    var result = null;

                    try {
                        result = ${scriptCode.trim()};
                    } catch (err) {
                        return JSON.stringify({
                            error: true,
                            message: err.message,
                            stack: err.stack
                        });
                    }

                    try {
                        return JSON.stringify(result);
                    } catch (err) {
                        return result;
                    }
                })(window);
            `;
        }

        return this.nativeBridge
            .executeJavaScript(scriptCode.trim())
            .then((result): T => this.parseWebViewJavascriptResult(result))
            .then((result) => {
                const r = result as any;
                if (r && typeof r === "object" && r.error) {
                    const error = new Error(r.message);
                    (error as any).webStack = r.stack;
                    return Promise.reject(error);
                }

                return Promise.resolve(result);
            });
    }

    @profile
    public onLoaded() {
        super.onLoaded();

        this.nativeBridge.onLoaded();
    }

    public onUnloaded() {
        this.nativeBridge.onUnloaded();

        super.onUnloaded();
    }

    public stopLoading() {
        this.nativeBridge.stopLoading();
    }

    public _loadUrl(src: string) {
        this.nativeBridge.loadUrl(src);
    }

    public _loadData(content: string) {
        this.nativeBridge.loadData(content);
    }

    public get canGoBack(): boolean {
        return this.nativeBridge.canGoBack;
    }

    public get canGoForward(): boolean {
        return this.nativeBridge.canGoForward;
    }

    public goBack() {
        return this.nativeBridge.goBack();
    }

    public goForward() {
        return this.nativeBridge.goForward();
    }

    public reload() {
        return this.nativeBridge.reload();
    }

    public registerLocalResource(resourceName: string, path: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        const filepath = this.resolveLocalResourceFilePath(path);
        if (!filepath) {
            this.writeTrace(`WebViewExt<ios>.registerLocalResource("${resourceName}", "${path}") -> file doesn't exist`, traceMessageType.error);
            return;
        }

        this.writeTrace(`WebViewExt<ios>.registerLocalResource("${resourceName}", "${path}") -> file: "${filepath}"`);

        this.nativeBridge.registerLocalResourceForNative(resourceName, filepath);
    }

    public unregisterLocalResource(resourceName: string) {
        this.writeTrace(`WebViewExt<ios>.unregisterLocalResource("${resourceName}")`);

        resourceName = this.fixLocalResourceName(resourceName);

        this.nativeBridge.unregisterLocalResourceForNative(resourceName);
    }

    public getRegisteredLocalResource(resourceName: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        let result = this.nativeBridge.getRegisteredLocalResourceFromNative(resourceName);

        this.writeTrace(`WebViewExt<android>.getRegisteredLocalResource("${resourceName}") -> "${result}"`);
        return result;
    }

    public onUIWebViewEvent(url: string) {
        if (!this.isUIWebView) {
            this.writeTrace(`WebViewExt.onUIWebViewEvent("${url}") - only works for UIWebView`, traceMessageType.error);
            return;
        }

        if (!url.startsWith("js2ios")) {
            this.writeTrace(`WebViewExt.onUIWebViewEvent("${url}") - only supports js2ios-scheme`, traceMessageType.error);
            return;
        }

        try {
            const message = decodeURIComponent(url.replace(/^js2ios:/, ""));
            const { eventName, resId } = JSON.parse(message);
            this.executeJavaScript<any>(`window.nsWebViewBridge.getUIWebViewResponse(${JSON.stringify(resId)})`)
                .then((data) => {
                    this.onWebViewEvent(eventName, data);
                })
                .catch((err) => {
                    this.writeTrace(`WebViewExt.onUIWebViewEvent("${url}") - getUIWebViewResponse - ${err}`, traceMessageType.error);
                });
        } catch (err) {
            this.writeTrace(`WebViewExt.onUIWebViewEvent("${url})" - "${err}"`, traceMessageType.error);
        }
    }

    public getTitle() {
        return this.executeJavaScript<string>("document.title");
    }

    public autoLoadStyleSheetFile(resourceName: string, filepath: string, insertBefore?: boolean) {
        if (this.isWKWebView) {
            return this.nativeBridge.autoLoadStyleSheetFile(resourceName, filepath, insertBefore);
        } else {
            return super.autoLoadStyleSheetFile(resourceName, filepath, insertBefore);
        }
    }

    public removeAutoLoadStyleSheetFile(resourceName: string) {
        if (this.isWKWebView) {
            this.nativeBridge.removeAutoLoadStyleSheetFile(resourceName);
        } else {
            super.removeAutoLoadStyleSheetFile(resourceName);
        }
    }

    public autoLoadJavaScriptFile(resourceName: string, filepath: string) {
        if (this.isWKWebView) {
            this.nativeBridge.autoLoadJavaScriptFile(resourceName, filepath);
        } else {
            super.autoLoadJavaScriptFile(resourceName, filepath);
        }
    }

    public removeAutoLoadJavaScriptFile(resourceName: string) {
        if (this.isWKWebView) {
            this.nativeBridge.removeAutoLoadJavaScriptFile(resourceName);
        } else {
            super.removeAutoLoadJavaScriptFile(resourceName);
        }
    }

    [autoInjectJSBridgeProperty.setNative](enabled: boolean) {
        this.nativeBridge.enableAutoInject(enabled);
    }
}
