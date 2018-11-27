/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />

import { profile } from "tns-core-modules/profiling";
import { traceMessageType } from "tns-core-modules/ui/core/view";

import { autoInjectJSBridgeProperty, IOSWebViewWrapper, useWKWebView, WebViewExtBase } from "./webview-ext-common";
import { UIWebViewWrapper } from "./webview-ext.uiwebview";
import { WKWebViewWrapper } from "./webview-ext.wkwebview";

export * from "./webview-ext-common";

export class WebViewExt extends WebViewExtBase {
    protected _ios: WKWebView | UIWebView;

    protected nativeWrapper: IOSWebViewWrapper;

    constructor() {
        super();

        if (useWKWebView) {
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

        this.nativeWrapper = nativeBridge;
    }

    protected initIOS9and10() {
        this.isUIWebView = true;
        this.isWKWebView = false;

        const nativeBridge = new UIWebViewWrapper(this);
        this.nativeViewProtected = this._ios = nativeBridge.createNativeView();
        nativeBridge.initNativeView();

        this.nativeWrapper = nativeBridge;
    }

    protected injectWebViewBridge() {
        if (this.nativeWrapper.shouldInjectWebViewBridge) {
            return super.injectWebViewBridge();
        }

        // WkWebView handles injecting the bridge via WKUserScripts
        return this.ensurePolyfills();
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

        return this.nativeWrapper
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

        this.nativeWrapper.onLoaded();
    }

    public onUnloaded() {
        this.nativeWrapper.onUnloaded();

        super.onUnloaded();
    }

    public stopLoading() {
        this.nativeWrapper.stopLoading();
    }

    public _loadUrl(src: string) {
        this.nativeWrapper.loadUrl(src);
    }

    public _loadData(content: string) {
        this.nativeWrapper.loadData(content);
    }

    public get canGoBack(): boolean {
        return this.nativeWrapper.canGoBack;
    }

    public get canGoForward(): boolean {
        return this.nativeWrapper.canGoForward;
    }

    public goBack() {
        return this.nativeWrapper.goBack();
    }

    public goForward() {
        return this.nativeWrapper.goForward();
    }

    public reload() {
        return this.nativeWrapper.reload();
    }

    public registerLocalResource(resourceName: string, path: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        const filepath = this.resolveLocalResourceFilePath(path);
        if (!filepath) {
            this.writeTrace(`WebViewExt<ios>.registerLocalResource("${resourceName}", "${path}") -> file doesn't exist`, traceMessageType.error);
            return;
        }

        this.writeTrace(`WebViewExt<ios>.registerLocalResource("${resourceName}", "${path}") -> file: "${filepath}"`);

        this.nativeWrapper.registerLocalResourceForNative(resourceName, filepath);
    }

    public unregisterLocalResource(resourceName: string) {
        this.writeTrace(`WebViewExt<ios>.unregisterLocalResource("${resourceName}")`);

        resourceName = this.fixLocalResourceName(resourceName);

        this.nativeWrapper.unregisterLocalResourceForNative(resourceName);
    }

    public getRegisteredLocalResource(resourceName: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        let result = this.nativeWrapper.getRegisteredLocalResourceFromNative(resourceName);

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
            return this.nativeWrapper.autoLoadStyleSheetFile(resourceName, filepath, insertBefore);
        } else {
            return super.autoLoadStyleSheetFile(resourceName, filepath, insertBefore);
        }
    }

    public removeAutoLoadStyleSheetFile(resourceName: string) {
        if (this.isWKWebView) {
            this.nativeWrapper.removeAutoLoadStyleSheetFile(resourceName);
        } else {
            super.removeAutoLoadStyleSheetFile(resourceName);
        }
    }

    public autoLoadJavaScriptFile(resourceName: string, filepath: string) {
        if (this.isWKWebView) {
            this.nativeWrapper.autoLoadJavaScriptFile(resourceName, filepath);
        } else {
            super.autoLoadJavaScriptFile(resourceName, filepath);
        }
    }

    public removeAutoLoadJavaScriptFile(resourceName: string) {
        if (this.isWKWebView) {
            this.nativeWrapper.removeAutoLoadJavaScriptFile(resourceName);
        } else {
            super.removeAutoLoadJavaScriptFile(resourceName);
        }
    }

    [autoInjectJSBridgeProperty.setNative](enabled: boolean) {
        this.nativeWrapper.enableAutoInject(enabled);
    }
}
