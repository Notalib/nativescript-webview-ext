/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />

import { profile } from "tns-core-modules/profiling";
import { traceMessageType } from "tns-core-modules/ui/core/view";
import { alert, confirm, prompt } from "tns-core-modules/ui/dialogs";
import {
    autoInjectJSBridgeProperty,
    IOSWebViewWrapper,
    scalesPageToFitProperty,
    scrollBounceProperty,
    supportXLocalSchema,
    WebViewExtBase,
} from "./webview-ext-common";
import { WKWebViewWrapper } from "./webview-ext.wkwebview";

export * from "./webview-ext-common";

export class WebViewExt extends WebViewExtBase {
    protected nativeWrapper: IOSWebViewWrapper;

    public get supportXLocalSchema() {
        return supportXLocalSchema;
    }

    public viewPortSize = { initialScale: 1.0 };

    public createNativeView() {
        this.nativeWrapper = new WKWebViewWrapper(this);

        return this.nativeWrapper.createNativeView();
    }

    public initNativeView() {
        super.initNativeView();

        this.nativeWrapper.initNativeView();
    }

    public disposeNativeView() {
        this.nativeWrapper.disposeNativeView();

        super.disposeNativeView();
    }

    protected injectWebViewBridge() {
        if (this.nativeWrapper.shouldInjectWebViewBridge) {
            return super.injectWebViewBridge();
        }

        // WkWebView handles injecting the bridge via WKUserScripts
        return this.ensurePolyfills();
    }

    protected async injectViewPortMeta() {
        this.nativeWrapper.resetViewPortCode();
        if (supportXLocalSchema) {
            return null;
        }

        return await super.injectViewPortMeta();
    }

    public async executeJavaScript<T>(scriptCode: string, stringifyResult = true): Promise<T> {
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

        const rawResult = await this.nativeWrapper.executeJavaScript(scriptCode.trim());

        const result: T = await this.parseWebViewJavascriptResult(rawResult);

        const r = result as any;
        if (r && typeof r === "object" && r.error) {
            const error = new Error(r.message);
            (error as any).webStack = r.stack;
            throw error;
        }

        return result;
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

    public _webAlert(message: string, callback: () => void) {
        if (!super._webAlert(message, callback)) {
            alert(message)
                .then(() => callback())
                .catch(() => callback());
        }

        return true;
    }

    public _webConfirm(message: string, callback: (response: boolean) => void) {
        if (!super._webConfirm(message, callback)) {
            confirm(message)
                .then((res) => callback(res))
                .catch(() => callback(null));
        }
        return true;
    }

    public _webPrompt(message: string, defaultText: string, callback: (response: string) => void) {
        if (!super._webPrompt(message, defaultText, callback)) {
            prompt(message, defaultText)
                .then((res) => {
                    if (res.result) {
                        callback(res.text);
                    } else {
                        callback(null);
                    }
                })
                .catch(() => callback(null));
        }

        return true;
    }

    public registerLocalResource(resourceName: string, path: string) {
        const cls = `WebViewExt<${this}.ios>.registerLocalResource("${resourceName}", "${path}")`;

        if (!supportXLocalSchema) {
            this.writeTrace(`${cls} -> custom schema isn't support on iOS <11`, traceMessageType.error);
            return;
        }

        resourceName = this.fixLocalResourceName(resourceName);

        const filepath = this.resolveLocalResourceFilePath(path);
        if (!filepath) {
            this.writeTrace(`${cls} -> file doesn't exist`, traceMessageType.error);
            return;
        }

        this.writeTrace(`${cls} -> file: "${filepath}"`);

        this.nativeWrapper.registerLocalResourceForNative(resourceName, filepath);
    }

    public unregisterLocalResource(resourceName: string) {
        const cls = `WebViewExt<${this}.ios>.unregisterLocalResource("${resourceName}")`;
        if (!supportXLocalSchema) {
            this.writeTrace(`${cls} -> custom schema isn't support on iOS <11`, traceMessageType.error);
            return;
        }

        this.writeTrace(cls);

        resourceName = this.fixLocalResourceName(resourceName);

        this.nativeWrapper.unregisterLocalResourceForNative(resourceName);
    }

    public getRegisteredLocalResource(resourceName: string) {
        resourceName = this.fixLocalResourceName(resourceName);
        const cls = `WebViewExt<${this}.ios>.getRegisteredLocalResource("${resourceName}")`;
        if (!supportXLocalSchema) {
            this.writeTrace(`${cls} -> custom schema isn't support on iOS <11`, traceMessageType.error);
            return null;
        }

        let result = this.nativeWrapper.getRegisteredLocalResourceFromNative(resourceName);

        this.writeTrace(`${cls} -> "${result}"`);
        return result;
    }

    public getTitle() {
        return this.executeJavaScript<string>("document.title");
    }

    public autoLoadStyleSheetFile(resourceName: string, filepath: string, insertBefore?: boolean) {
        return this.nativeWrapper.autoLoadStyleSheetFile(resourceName, filepath, insertBefore);
    }

    public removeAutoLoadStyleSheetFile(resourceName: string) {
        this.nativeWrapper.removeAutoLoadStyleSheetFile(resourceName);
    }

    public autoLoadJavaScriptFile(resourceName: string, filepath: string) {
        this.nativeWrapper.autoLoadJavaScriptFile(resourceName, filepath);
    }

    public removeAutoLoadJavaScriptFile(resourceName: string) {
        this.nativeWrapper.removeAutoLoadJavaScriptFile(resourceName);
    }

    [autoInjectJSBridgeProperty.setNative](enabled: boolean) {
        this.nativeWrapper.enableAutoInject(enabled);
    }

    [scrollBounceProperty.getDefault]() {
        return !!this.nativeWrapper.scrollBounce;
    }

    [scrollBounceProperty.setNative](enabled: boolean) {
        this.nativeWrapper.scrollBounce = !!enabled;
    }

    [scalesPageToFitProperty.getDefault]() {
        return !!this.nativeWrapper.scalesPageToFit;
    }

    [scalesPageToFitProperty.setNative](enabled: boolean) {
        this.nativeWrapper.scalesPageToFit = !!enabled;
    }
}
