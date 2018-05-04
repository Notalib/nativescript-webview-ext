/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />
/// <reference path="./platforms/ios/NotaWebViewExt.d.ts" />

import * as fs from 'tns-core-modules/file-system';
import * as platform from "tns-core-modules/platform";
import { profile } from "tns-core-modules/profiling";
import { layout, traceMessageType } from "tns-core-modules/ui/core/view";
import { LoadEventData } from "./webview-ext";
import { knownFolders, NavigationType, traceCategories, traceEnabled, traceWrite, WebViewExtBase } from "./webview-ext-common";

export * from "./webview-ext-common";

export class WKNavigationDelegateImpl extends NSObject
    implements WKNavigationDelegate {
    public static ObjCProtocols = [WKNavigationDelegate];
    public static initWithOwner(owner: WeakRef<WebViewExt>): WKNavigationDelegateImpl {
        const handler = <WKNavigationDelegateImpl>WKNavigationDelegateImpl.new();
        handler._owner = owner;
        return handler;
    }
    private _owner: WeakRef<WebViewExt>;

    public webViewDecidePolicyForNavigationActionDecisionHandler(webView: WKWebView, navigationAction: WKNavigationAction, decisionHandler: any): void {
        const owner = this._owner.get();

        if (!owner) {
            decisionHandler(WKNavigationActionPolicy.Allow);
            return;
        }

        const url = navigationAction.request.URL && navigationAction.request.URL.absoluteString;
        owner.writeTrace(`webViewDecidePolicyForNavigationActionDecisionHandler: ${url}`);
        if (url) {
            let urlOverrideHandlerFn = owner.urlOverrideHandler;
            if (urlOverrideHandlerFn && urlOverrideHandlerFn(url) === true) {
                decisionHandler(WKNavigationActionPolicy.Cancel);
                return;
            }

            let navType: NavigationType = "other";

            switch (navigationAction.navigationType) {
                case WKNavigationType.LinkActivated:
                    navType = "linkClicked";
                    break;
                case WKNavigationType.FormSubmitted:
                    navType = "formSubmitted";
                    break;
                case WKNavigationType.BackForward:
                    navType = "backForward";
                    break;
                case WKNavigationType.Reload:
                    navType = "reload";
                    break;
                case WKNavigationType.FormResubmitted:
                    navType = "formResubmitted";
                    break;
            }
            decisionHandler(WKNavigationActionPolicy.Allow);

            if (traceEnabled()) {
                traceWrite("WKNavigationDelegateClass.webViewDecidePolicyForNavigationActionDecisionHandler(" + navigationAction.request.URL.absoluteString + ", " + navigationAction.navigationType + ")", traceCategories.Debug);
            }
            owner._onLoadStarted(navigationAction.request.URL.absoluteString, navType);
        }
    }

    public webViewDidStartProvisionalNavigation(webView: WKWebView, navigation: WKNavigation): void {
        if (traceEnabled()) {
            traceWrite("WKNavigationDelegateClass.webViewDidStartProvisionalNavigation(" + webView.URL + ")", traceCategories.Debug);
        }
    }

    public webViewDidFinishNavigation(webView: WKWebView, navigation: WKNavigation): void {
        if (traceEnabled()) {
            traceWrite("WKNavigationDelegateClass.webViewDidFinishNavigation(" + webView.URL + ")", traceCategories.Debug);
        }
        const owner = this._owner.get();
        if (owner) {
            let src = owner.src;
            if (webView.URL) {
                src = webView.URL.absoluteString;
            }
            owner._onLoadFinished(src);
        }
    }

    public webViewDidFailNavigationWithError(webView: WKWebView, navigation: WKNavigation, error: NSError): void {
        const owner = this._owner.get();
        if (owner) {
            let src = owner.src;
            if (webView.URL) {
                src = webView.URL.absoluteString;
            }
            if (traceEnabled()) {
                traceWrite("WKNavigationDelegateClass.webViewDidFailNavigationWithError(" + error.localizedDescription + ")", traceCategories.Debug);
            }
            owner._onLoadFinished(src, error.localizedDescription);
        }
    }
}

class WKScriptMessageHandlerImpl extends NSObject implements WKScriptMessageHandler {
    public static ObjCProtocols = [WKScriptMessageHandler];

    private _owner: WeakRef<WebViewExt>;

    public static initWithOwner(owner: WeakRef<WebViewExt>): WKScriptMessageHandlerImpl {
        let delegate = <WKScriptMessageHandlerImpl>WKScriptMessageHandlerImpl.new();
        delegate._owner = owner;
        return delegate;
    }

    public userContentControllerDidReceiveScriptMessage(userContentController: WKUserContentController, webViewMessage: WKScriptMessage) {
        const owner = this._owner.get();
        if (!owner) {
            return;
        }

        try {
            const message = JSON.parse(webViewMessage.body as string);
            console.log(message);
            owner.onWebViewEvent(message.eventName, message.data);
        } catch (err) {
            console.log(err);
            console.log(webViewMessage);
        }
    }
}

class UIWebViewDelegateImpl extends NSObject implements UIWebViewDelegate {
    public static ObjCProtocols = [UIWebViewDelegate];

    private _owner: WeakRef<WebViewExt>;

    public static initWithOwner(owner: WeakRef<WebViewExt>): UIWebViewDelegateImpl {
        let delegate = <UIWebViewDelegateImpl>UIWebViewDelegateImpl.new();
        delegate._owner = owner;
        return delegate;
    }

    public webViewShouldStartLoadWithRequestNavigationType(webView: UIWebView, request: NSURLRequest, navigationType: number) {
        let owner = this._owner.get();

        if (owner && request.URL) {
            let navType: NavigationType = "other";

            switch (navigationType) {
                case UIWebViewNavigationType.LinkClicked:
                    navType = "linkClicked";
                    break;
                case UIWebViewNavigationType.FormSubmitted:
                    navType = "formSubmitted";
                    break;
                case UIWebViewNavigationType.BackForward:
                    navType = "backForward";
                    break;
                case UIWebViewNavigationType.Reload:
                    navType = "reload";
                    break;
                case UIWebViewNavigationType.FormResubmitted:
                    navType = "formResubmitted";
                    break;
            }

            const absoluteUrl = request.URL.absoluteString;
            owner.writeTrace("UIWebViewDelegateClass.webViewShouldStartLoadWithRequestNavigationType(" + absoluteUrl + ", " + navigationType + ")");
            if (navType === "other" && absoluteUrl.startsWith("js2ios:")) {
                owner.onUIWebViewEvent(absoluteUrl);
                return false;
            }
            owner._onLoadStarted(request.URL.absoluteString, navType);
        }

        return true;
    }

    public uiWebViewJSNavigation = false;

    public webViewDidStartLoad(webView: UIWebView) {
        let owner = this._owner.get();
        if (owner) {
            owner.writeTrace("UIWebViewDelegateClass.webViewDidStartLoad(" + webView.request.URL + ")");
        }
    }

    public webViewDidFinishLoad(webView: UIWebView) {
        let owner = this._owner.get();

        if (owner) {
            owner.writeTrace("UIWebViewDelegateClass.webViewDidFinishLoad(" + webView.request.URL + ")");

            let src = owner.src;
            if (webView.request && webView.request.URL) {
                src = webView.request.URL.absoluteString;
            }
            owner._onLoadFinished(src);
        }
    }

    public webViewDidFailLoadWithError(webView: UIWebView, error: NSError) {
        let owner = this._owner.get();
        if (owner) {
            let src = owner.src;
            if (webView.request && webView.request.URL) {
                src = webView.request.URL.absoluteString;
            }

            owner.writeTrace("UIWebViewDelegateClass.webViewDidFailLoadWithError(" + error.localizedDescription + ") url: " + src);
            owner._onLoadFinished(src, error.localizedDescription);
        }
    }
}

let registeredCustomNSURLProtocol = false;

export class WebViewExt extends WebViewExtBase {
    public get ios() {
        return this._ios;
    }

    private _ios: WKWebView | UIWebView;

    private _wkWebViewConfiguration: WKWebViewConfiguration;
    private _wkNavigationDelegate: WKNavigationDelegateImpl;
    private _wkCustomUrlSchemeHandler: CustomUrlSchemeHandler;

    private _uiWebViewDelegate: UIWebViewDelegateImpl;

    private get _uiWebView(): UIWebView | void {
        if (this.isUIWebView) {
            return this._ios as UIWebView;
        }
    }

    private get _wkWebView(): WKWebView | void {
        if (this.isWKWebView) {
            return this._ios as WKWebView;
        }
    }

    constructor() {
        super();

        if (Number(platform.device.sdkVersion) >= 11) {
            this.isUIWebView = false;
            this.isWKWebView = true;

            const configuration = this._wkWebViewConfiguration = WKWebViewConfiguration.new();
            this._wkNavigationDelegate = WKNavigationDelegateImpl.initWithOwner(new WeakRef(this));
            const jScript = "var meta = document.createElement('meta'); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'initial-scale=1.0'); document.getElementsByTagName('head')[0].appendChild(meta);";
            const wkUScript = WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly(jScript, WKUserScriptInjectionTime.AtDocumentEnd, true);
            const messageHandler = WKScriptMessageHandlerImpl.initWithOwner(new WeakRef(this));
            const wkUController = WKUserContentController.new();
            wkUController.addUserScript(wkUScript);
            wkUController.addScriptMessageHandlerName(messageHandler, 'nsBridge');
            configuration.userContentController = wkUController;
            configuration.preferences.setValueForKey(
                true,
                'allowFileAccessFromFileURLs'
            );

            this._wkCustomUrlSchemeHandler = new CustomUrlSchemeHandler();
            this._wkWebViewConfiguration.setURLSchemeHandlerForURLScheme(this._wkCustomUrlSchemeHandler, this.interceptScheme);

            this.nativeViewProtected = this._ios = new WKWebView({
                frame: CGRectZero,
                configuration: configuration
            });
        } else {
            this.isUIWebView = true;
            this.isWKWebView = false;

            if (!registeredCustomNSURLProtocol) {
                NSURLProtocol.registerClass(CustomNSURLProtocol as any);
                registeredCustomNSURLProtocol = true;
            }

            const uiWebView = UIWebView.new();
            this.nativeViewProtected = this._ios = uiWebView;
            this._uiWebViewDelegate = UIWebViewDelegateImpl.initWithOwner(new WeakRef(this));

            uiWebView.scrollView.bounces = false;
            uiWebView.scrollView.scrollEnabled = false;
            uiWebView.scalesPageToFit = false;
        }
    }

    public executeJavaScript<T>(scriptCode: string, stringifyResult = true): Promise<T> {
        if (stringifyResult) {
            scriptCode = `var result = ${scriptCode};
            try { JSON.stringify(result); } catch (err) { result }`;
        }
        
        // this.writeTrace('Executing Javascript: ' + scriptCode);
        return new Promise((resolve, reject) => {
            let result: any;
            if (this._wkWebView) {
                this._wkWebView.evaluateJavaScriptCompletionHandler(scriptCode, (data, error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(this.parseWebviewJavascriptResult(data));
                });
            } else if (this._uiWebView) {
                const resStr = this._uiWebView.stringByEvaluatingJavaScriptFromString(scriptCode);
                resolve(this.parseWebviewJavascriptResult(resStr));
            }
        });
    }

    @profile
    public onLoaded() {
        super.onLoaded();
        if (this._wkWebView) {
            this._wkWebView.navigationDelegate = this._wkNavigationDelegate;
        } else if (this._uiWebView) {
            this._uiWebView.delegate = this._uiWebViewDelegate;
        }
    }

    public onUnloaded() {
        if (this._wkWebView) {
            this._wkWebView.navigationDelegate = null;
        } else if (this._uiWebView) {
            this._uiWebView.delegate = null;
        }
        super.onUnloaded();
    }

    public stopLoading() {
        if (this._wkWebView) {
            this._wkWebView.stopLoading();
        } else if (this._uiWebView) {
            this._uiWebView.stopLoading();
        }
    }

    public _loadUrl(src: string) {
        if (this._wkWebView) {
            if (src.startsWith('file:///')) {
                this._wkWebView.loadFileURLAllowingReadAccessToURL(NSURL.URLWithString(src), NSURL.URLWithString(src));
            } else {
                this._wkWebView.loadRequest(NSURLRequest.requestWithURL(NSURL.URLWithString(src)));
            }
        } else if (this._uiWebView) {
            this._uiWebView.loadRequest(NSURLRequest.requestWithURL(NSURL.URLWithString(src)));
        }
    }

    public _loadData(content: string) {
        if (this._wkWebView) {
            this._wkWebView.loadHTMLStringBaseURL(content, NSURL.alloc().initWithString(`file:///${knownFolders.currentApp().path}/`));
        } else if (this._uiWebView) {
            this._uiWebView.loadHTMLStringBaseURL(content, NSURL.alloc().initWithString(`file:///${knownFolders.currentApp().path}/`));
        }
    }

    get canGoBack(): boolean {
        if (this._wkWebView) {
            return this._wkWebView.canGoBack;
        } else if (this._uiWebView) {
            return this._uiWebView.canGoBack;
        } else {
            return false;
        }
    }

    get canGoForward(): boolean {
        if (this._wkWebView) {
            return this._wkWebView.canGoForward;
        } else if (this._uiWebView) {
            return this._uiWebView.canGoForward;
        } else {
            return false;
        }
    }

    public goBack() {
        if (this._wkWebView) {
            this._wkWebView.goBack();
        } else if (this._uiWebView) {
            this._uiWebView.goBack();
        }
    }

    public goForward() {
        if (this._wkWebView) {
            this._wkWebView.goForward();
        } else if (this._uiWebView) {
            this._uiWebView.goForward();
        }
    }

    public reload() {
        if (this._wkWebView) {
            this._wkWebView.reload();
        } else if (this._uiWebView) {
            this._uiWebView.reload();
        }
    }

    registerLocalResource(name: string, path: string) {
        const filepath = this.resolveLocalResourceFilePath(path);
        if (!filepath) {
            return;
        }

        if (this._wkWebView) {
            this._wkCustomUrlSchemeHandler.registerLocalResourceForKeyFilepath(name, filepath);
        } else if (this._uiWebView) {
            CustomNSURLProtocol.registerLocalResourceForKeyFilepath(name, filepath);
        }
    }

    unregisterLocalResource(name: string) {
        if (this._wkWebView) {
            this._wkCustomUrlSchemeHandler.unregisterLocalResourceForKey(name);
        } else if (this._uiWebView) {
            CustomNSURLProtocol.unregisterLocalResourceForKey(name);
        }
    }

    getRegistretLocalResource(name: string) {
        if (this._wkWebView) {
            return this._wkCustomUrlSchemeHandler.getRegisteredLocalResourceForKey(name);
        } else if (this._uiWebView) {
            return CustomNSURLProtocol.getRegisteredLocalResourceForKey(name);
        } else {
            throw new Error('Not implemented for UIWebView');
        }
    }

    public onUIWebViewEvent(url: string) {
        try {
            const { eventName, resId } = JSON.parse(url.replace(/^js2ios:/, ''));
            this.executeJavaScript(`window.nsWebViewInterface.getUIWebViewResponse(${resId}`)
                .then((data) => {
                    this.onWebViewEvent(eventName, data);
                })
                .catch((err) => {
                    this.writeTrace(`WebViewExt.onUIWebViewEvent(${url}) - getUIWebViewResponse - ${err}`, traceMessageType.error);
                });
        } catch (err) {
            this.writeTrace(`WebViewExt.onUIWebViewEvent(${url}) - ${err}`, traceMessageType.error);
        }
    }
}
