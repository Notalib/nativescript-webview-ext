/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />
/// <reference path="./platforms/ios/NotaWebViewExt.d.ts" />

import * as fs from "tns-core-modules/file-system";
import { metadataViewPort, webViewBridge } from "./nativescript-webview-bridge-loader";
import { IOSWebViewBridge, NavigationType, traceMessageType, WebViewExtBase } from "./webview-ext-common";

export class WKNavigationDelegateImpl extends NSObject implements WKNavigationDelegate {
    public static ObjCProtocols = [WKNavigationDelegate];
    public static initWithOwner(owner: WeakRef<WebViewExtBase>): WKNavigationDelegateImpl {
        const handler = <WKNavigationDelegateImpl>WKNavigationDelegateImpl.new();
        handler.owner = owner;
        return handler;
    }

    private owner: WeakRef<WebViewExtBase>;

    public webViewDecidePolicyForNavigationActionDecisionHandler(webView: WKWebView, navigationAction: WKNavigationAction, decisionHandler: any): void {
        const owner = this.owner.get();
        if (!owner) {
            decisionHandler(WKNavigationActionPolicy.Cancel);
            return;
        }

        const request = navigationAction.request;
        const httpMethod = request.HTTPMethod;
        const url = request.URL && request.URL.absoluteString;

        owner.writeTrace(`webViewDecidePolicyForNavigationActionDecisionHandler: "${url}"`);
        if (!url) {
            return;
        }

        let navType: NavigationType = "other";

        switch (navigationAction.navigationType) {
            case WKNavigationType.LinkActivated: {
                navType = "linkClicked";
                break;
            }
            case WKNavigationType.FormSubmitted: {
                navType = "formSubmitted";
                break;
            }
            case WKNavigationType.BackForward: {
                navType = "backForward";
                break;
            }
            case WKNavigationType.Reload: {
                navType = "reload";
                break;
            }
            case WKNavigationType.FormResubmitted: {
                navType = "formResubmitted";
                break;
            }
            default: {
                navType = "other";
                break;
            }
        }

        const shouldOverrideUrlLoading = owner._onShouldOverrideUrlLoading(url, httpMethod, navType);
        if (shouldOverrideUrlLoading === true) {
            owner.writeTrace(
                `WKNavigationDelegateClass.webViewDecidePolicyForNavigationActionDecisionHandler("${url}", "${
                    navigationAction.navigationType
                }") -> method:${httpMethod} "${navType}" -> cancel`,
            );
            decisionHandler(WKNavigationActionPolicy.Cancel);
            return;
        }
        decisionHandler(WKNavigationActionPolicy.Allow);

        owner.writeTrace(
            `WKNavigationDelegateClass.webViewDecidePolicyForNavigationActionDecisionHandler("${url}", "${
                navigationAction.navigationType
            }") -> method:${httpMethod} "${navType}"`,
        );
        owner._onLoadStarted(url, navType);
    }

    public webViewDidStartProvisionalNavigation(webView: WKWebView, navigation: WKNavigation): void {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        owner.writeTrace(`WKNavigationDelegateClass.webViewDidStartProvisionalNavigation("${webView.URL}")`);
    }

    public webViewDidFinishNavigation(webView: WKWebView, navigation: WKNavigation): void {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        owner.writeTrace(`WKNavigationDelegateClass.webViewDidFinishNavigation("${webView.URL}")`);
        let src = owner.src;
        if (webView.URL) {
            src = webView.URL.absoluteString;
        }
        owner._onLoadFinished(src).catch(() => void 0);
    }

    public webViewDidFailNavigationWithError(webView: WKWebView, navigation: WKNavigation, error: NSError): void {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        let src = owner.src;
        if (webView.URL) {
            src = webView.URL.absoluteString;
        }
        owner.writeTrace(`WKNavigationDelegateClass.webViewDidFailNavigationWithError("${error.localizedDescription}")`);
        owner._onLoadFinished(src, error.localizedDescription).catch(() => void 0);
    }
}

export class WKScriptMessageHandlerImpl extends NSObject implements WKScriptMessageHandler {
    public static ObjCProtocols = [WKScriptMessageHandler];

    private owner: WeakRef<WebViewExtBase>;

    public static initWithOwner(owner: WeakRef<WebViewExtBase>): WKScriptMessageHandlerImpl {
        const delegate = <WKScriptMessageHandlerImpl>WKScriptMessageHandlerImpl.new();
        delegate.owner = owner;
        return delegate;
    }

    public userContentControllerDidReceiveScriptMessage(userContentController: WKUserContentController, webViewMessage: WKScriptMessage) {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        try {
            const message = JSON.parse(webViewMessage.body as string);
            owner.onWebViewEvent(message.eventName, message.data);
        } catch (err) {
            owner.writeTrace(
                `userContentControllerDidReceiveScriptMessage(${userContentController}, ${webViewMessage}) - bad message: ${webViewMessage.body}`,
                traceMessageType.error,
            );
        }
    }
}

export class WKWebViewWrapper implements IOSWebViewBridge {
    protected wkWebViewConfiguration: WKWebViewConfiguration;
    protected wkNavigationDelegate: WKNavigationDelegateImpl;
    protected wkCustomUrlSchemeHandler: CustomUrlSchemeHandler;
    protected wkUserContentController: WKUserContentController;
    protected wkUserScriptInjectWebViewBrigde: Promise<WKUserScript> | void;
    protected wkUserScriptViewPortCode: Promise<WKUserScript>;
    protected wkNamedUserScripts = [] as Array<{
        resourceName: string;
        wkUserScript: WKUserScript;
    }>;

    public owner: WeakRef<WebViewExtBase>;
    public get ios(): WKWebView | void {
        const owner = this.owner.get();
        return owner && owner.ios;
    }

    public readonly shouldInjectWebViewBridge = false;

    public get autoInjectJSBridge() {
        const owner = this.owner.get();
        return owner && owner.autoInjectJSBridge;
    }

    constructor(owner: WebViewExtBase) {
        this.owner = new WeakRef(owner);
    }

    public createNativeView() {
        const owner = this.owner.get();
        if (!owner) {
            throw new Error("No owner, this should not happen");
        }

        const configuration = WKWebViewConfiguration.new();
        this.wkWebViewConfiguration = configuration;

        const messageHandler = WKScriptMessageHandlerImpl.initWithOwner(this.owner);
        const wkUController = (this.wkUserContentController = WKUserContentController.new());
        wkUController.addScriptMessageHandlerName(messageHandler, "nsBridge");
        configuration.userContentController = wkUController;
        configuration.preferences.setValueForKey(true, "allowFileAccessFromFileURLs");
        configuration.setValueForKey(true, "allowUniversalAccessFromFileURLs");

        this.wkCustomUrlSchemeHandler = new CustomUrlSchemeHandler();

        configuration.setURLSchemeHandlerForURLScheme(this.wkCustomUrlSchemeHandler, owner.interceptScheme);

        const webview = new WKWebView({
            frame: CGRectZero,
            configuration,
        });

        return webview;
    }

    public initNativeView() {
        this.wkNavigationDelegate = WKNavigationDelegateImpl.initWithOwner(this.owner);

        this.loadWKUserScripts();
    }

    public disposeNativeView() {
        this.wkNavigationDelegate = null;
        this.wkCustomUrlSchemeHandler = null;
    }

    public onLoaded() {
        const ios = this.ios;
        if (ios) {
            ios.navigationDelegate = this.wkNavigationDelegate;
        }
    }

    public onUnloaded() {
        const ios = this.ios;
        if (ios) {
            ios.navigationDelegate = null;
        }
    }

    public loadUrl(src: string) {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        const ios = this.ios;
        if (!ios) {
            return;
        }

        const nsURL = NSURL.URLWithString(src);
        if (src.startsWith("file:///")) {
            const nsReadAccessUrl = NSURL.URLWithString(src);
            owner.writeTrace(`WebViewExt<ios>._loadUrl("${src}") -> this._wkWebView.loadFileURLAllowingReadAccessToURL("${nsURL}", "${nsReadAccessUrl}"`);
            ios.loadFileURLAllowingReadAccessToURL(nsURL, nsReadAccessUrl);
        } else {
            const nsRequestWithUrl = NSURLRequest.requestWithURL(nsURL);
            owner.writeTrace(`WebViewExt<ios>._loadUrl("${src}") -> this._wkWebView.loadRequest("${nsRequestWithUrl}"`);
            ios.loadRequest(nsRequestWithUrl);
        }
    }

    public loadData(content: string) {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        const ios = this.ios;
        if (!ios) {
            return;
        }

        const nsURL = NSURL.alloc().initWithString(`file:///${fs.knownFolders.currentApp().path}/`);

        owner.writeTrace(`WebViewExt<ios>._loadUrl(content) -> this._wkWebView.loadHTMLStringBaseURL("${nsURL}")`);
        ios.loadHTMLStringBaseURL(content, nsURL);
    }

    public get canGoBack(): boolean {
        const ios = this.ios;
        return ios && !!ios.canGoBack;
    }

    public get canGoForward(): boolean {
        const ios = this.ios;
        return ios && !!ios.canGoForward;
    }

    public goBack() {
        const ios = this.ios;
        if (!ios) {
            return;
        }

        ios.goBack();
    }

    public goForward() {
        const ios = this.ios;
        if (!ios) {
            return;
        }

        ios.goForward();
    }

    public reload() {
        const ios = this.ios;
        if (!ios) {
            return;
        }

        ios.reload();
    }

    public executeJavaScript(scriptCode: string) {
        const ios = this.ios;
        if (!ios) {
            return Promise.reject(new Error("WebView is missing"));
        }

        return new Promise<any>((resolve, reject) => {
            ios.evaluateJavaScriptCompletionHandler(scriptCode, (result, error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            });
        });
    }

    public stopLoading() {
        const ios = this.ios;
        if (!ios) {
            return;
        }

        ios.stopLoading();
    }

    public fixLocalResourceName(resourceName: string) {
        const owner = this.owner.get();
        if (!owner) {
            return null;
        }

        return owner.fixLocalResourceName(resourceName);
    }

    public registerLocalResourceForNative(resourceName: string, filepath: string) {
        this.wkCustomUrlSchemeHandler.registerLocalResourceForKeyFilepath(resourceName, filepath);
    }

    public unregisterLocalResourceForNative(resourceName: string) {
        this.wkCustomUrlSchemeHandler.unregisterLocalResourceForKey(resourceName);
    }

    public getRegisteredLocalResourceFromNative(resourceName: string) {
        return this.wkCustomUrlSchemeHandler.getRegisteredLocalResourceForKey(resourceName);
    }

    public autoLoadStyleSheetFile(resourceName: string, filepath: string, insertBefore?: boolean) {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        resourceName = this.fixLocalResourceName(resourceName);
        if (filepath) {
            owner.registerLocalResource(resourceName, filepath);
        }

        const href = `${owner.interceptScheme}://${resourceName}`;
        const scriptCode = owner.generaateLoadCSSFileScriptCode(href, insertBefore);

        this.addNamedWKUserScript(`auto-load-css-${resourceName}`, scriptCode);
    }

    public removeAutoLoadStyleSheetFile(resourceName: string) {
        resourceName = this.fixLocalResourceName(resourceName);
        this.removeNamedWKUserScript(`auto-load-css-${resourceName}`);
    }

    public autoLoadJavaScriptFile(resourceName: string, path: string) {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        resourceName = this.fixLocalResourceName(resourceName);

        const filepath = owner.resolveLocalResourceFilePath(path);
        if (!filepath) {
            owner.writeTrace(`WKWebViewWrapper.autoLoadJavaScriptFile("${resourceName}", "${path}") - couldn't resolve filepath`);
            return;
        }
        owner.registerLocalResource(resourceName, path);

        fs.File.fromPath(filepath)
            .readText()
            .then((scriptCode) => this.addNamedWKUserScript(resourceName, scriptCode));
    }

    public removeAutoLoadJavaScriptFile(resourceName: string) {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        const fixedResourceName = this.fixLocalResourceName(resourceName);
        const href = `${owner.interceptScheme}://${fixedResourceName}`;
        this.removeNamedWKUserScript(href);
    }

    /**
     * iOS11+
     *
     * Sets up loading WKUserScripts
     *
     * @param autoInjectJSBridge If true viewport-code, bridge-code and named scripts will be loaded, if false only viewport-code
     */
    protected loadWKUserScripts(autoInjectJSBridge = this.autoInjectJSBridge) {
        if (!this.wkUserScriptViewPortCode) {
            this.wkUserScriptViewPortCode = this.makeWKUserScriptPromise(metadataViewPort);
        }

        this.wkUserContentController.removeAllUserScripts();

        const wkUserScriptViewPortCode = this.wkUserScriptViewPortCode;

        this.addUserScriptFromPromise(wkUserScriptViewPortCode);
        if (!autoInjectJSBridge) {
            return;
        }

        if (!this.wkUserScriptInjectWebViewBrigde) {
            this.wkUserScriptInjectWebViewBrigde = this.makeWKUserScriptPromise(webViewBridge);
        }

        this.addUserScriptFromPromise(this.wkUserScriptInjectWebViewBrigde);
        for (const { wkUserScript } of this.wkNamedUserScripts) {
            this.addUserScript(wkUserScript);
        }
    }

    protected makeWKUserScriptPromise(scriptCodePromise: Promise<string>) {
        return scriptCodePromise.then((scriptCode) => this.createWkUserScript(scriptCode));
    }

    protected addUserScriptFromPromise(userScriptPromise: Promise<WKUserScript>) {
        return userScriptPromise.then((userScript) => this.addUserScript(userScript));
    }

    protected addUserScript(userScript: WKUserScript) {
        this.wkUserContentController.addUserScript(userScript);
    }

    /**
     * iOS11+
     *
     * Add/replace a named WKUserScript.
     * These scripts will be injected when a new documnet is loaded.
     */
    protected addNamedWKUserScript(resourceName: string, scriptCode: string) {
        if (!scriptCode) {
            return;
        }

        this.removeNamedWKUserScript(resourceName);

        const wkUserScript = this.createWkUserScript(scriptCode);

        this.wkNamedUserScripts.push({ resourceName, wkUserScript });

        this.addUserScript(wkUserScript);
    }

    /**
     * iOS11+
     *
     * Remove a named WKUserScript
     */
    protected removeNamedWKUserScript(resourceName: string) {
        const idx = this.wkNamedUserScripts.findIndex((val) => val.resourceName === resourceName);
        if (idx === -1) {
            return;
        }

        this.wkNamedUserScripts.splice(idx, 1);

        this.loadWKUserScripts();
    }

    /**
     * iOS11+
     *
     * Factory function for creating a WKUserScript instance.
     */
    protected createWkUserScript(scriptCode: string) {
        return WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly(scriptCode.trim(), WKUserScriptInjectionTime.AtDocumentEnd, true);
    }

    public enableAutoInject(enable: boolean) {
        this.loadWKUserScripts(enable);
    }
}
