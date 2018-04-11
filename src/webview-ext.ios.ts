/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />
/// <reference path="./platforms/ios/NotaWebViewExt.d.ts" />

import { WebViewExtBase, knownFolders, traceWrite, traceEnabled, traceCategories, NavigationType } from "./webview-ext.common";
import { profile } from "tns-core-modules/profiling";
import { layout } from "tns-core-modules/ui/core/view";
import * as fs from 'tns-core-modules/file-system';
import * as platform from "tns-core-modules/platform";

import { LoadEventData } from "./webview-ext";

export * from "./webview-ext.common";

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

        console.log(`webViewDecidePolicyForNavigationActionDecisionHandler: ${navigationAction.request.URL && navigationAction.request.URL.absoluteString}`);
        if (owner && navigationAction.request.URL) {
            let urlOverrideHandlerFn = owner.urlOverrideHandler;
            if (urlOverrideHandlerFn && urlOverrideHandlerFn(navigationAction.request.URL.absoluteString) === true) {
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
            webView.evaluateJavaScriptCompletionHandler("document.body.height", (val, err) => {
                console.log(val);
            });
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

            owner.writeTrace("UIWebViewDelegateClass.webViewShouldStartLoadWithRequestNavigationType(" + request.URL.absoluteString + ", " + navigationType + ")");
            owner._onLoadStarted(request.URL.absoluteString, navType);
        }

        return true;
    }

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

            owner.writeTrace("UIWebViewDelegateClass.webViewDidFailLoadWithError(" + error.localizedDescription + ")");
            if (owner) {
                owner._onLoadFinished(src, error.localizedDescription);
            }
        }
    }
}

let registeredCustomNSURLProtocol = false;

export class WebViewExt extends WebViewExtBase {
    private _wkWebView: WKWebView;
    private _webViewConfiguration: WKWebViewConfiguration;
    private _wkNavigationDelegate: WKNavigationDelegateImpl;
    private _wkCustomUrlSchemeHandler: CustomUrlSchemeHandler;

    private _uiWebView: UIWebView;
    private _uiWebViewDelegate: UIWebViewDelegateImpl;

    constructor() {
        super();

        if (Number(platform.device.sdkVersion) >= 11) {
            const configuration = this._webViewConfiguration = WKWebViewConfiguration.new();
            this._wkNavigationDelegate = WKNavigationDelegateImpl.initWithOwner(new WeakRef(this));
            const jScript = "var meta = document.createElement('meta'); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'initial-scale=1.0'); document.getElementsByTagName('head')[0].appendChild(meta);";
            const wkUScript = WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly(jScript, WKUserScriptInjectionTime.AtDocumentEnd, true);
            const wkUController = WKUserContentController.new();
            wkUController.addUserScript(wkUScript);
            configuration.userContentController = wkUController;
            configuration.preferences.setValueForKey(
                true,
                'allowFileAccessFromFileURLs'
            );

            this._wkCustomUrlSchemeHandler = new CustomUrlSchemeHandler();
            this._webViewConfiguration.setURLSchemeHandlerForURLScheme(this._wkCustomUrlSchemeHandler, this.interceptScheme);

            this.nativeViewProtected = this._wkWebView = new WKWebView({
                frame: CGRectZero,
                configuration: configuration
            });
        } else {
            if (!registeredCustomNSURLProtocol) {
                NSURLProtocol.registerClass(CustomNSURLProtocol as any);
                registeredCustomNSURLProtocol = true;
            }

            this.nativeViewProtected = this._uiWebView = UIWebView.new();
            this._uiWebViewDelegate = UIWebViewDelegateImpl.initWithOwner(new WeakRef(this));

            this.nativeViewProtected.scrollView.bounce = false;
            this.nativeViewProtected.scrollView.scrollEnabled = false;
            this.nativeViewProtected.scalesPageToFit = false;
        }
    }

    public executeJavaScript(scriptCode) {
        return new Promise<any>((resolve, reject) => {
            if (this._wkWebView) {
                this._wkWebView.evaluateJavaScriptCompletionHandler(scriptCode, (data, error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(data);
                });
            } else if (this._uiWebView) {
                resolve(this._uiWebView.stringByEvaluatingJavaScriptFromString(scriptCode));
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
        this.disposeWebViewInterface();
        super.onUnloaded();
    }

    get ios(): WKWebView | UIWebView {
        return this._wkWebView || this._uiWebView;
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
        } else if (this._wkWebView) {
            this._uiWebView.loadRequest(NSURLRequest.requestWithURL(NSURL.URLWithString(src)));
        }
    }

    public _loadData(content: string) {
        if (this._wkWebView) {
            this._wkWebView.loadHTMLStringBaseURL(content, NSURL.alloc().initWithString(`file:///${knownFolders.currentApp().path}/`));
        } else if (this._wkWebView) {
            this._uiWebView.loadHTMLStringBaseURL(content, NSURL.alloc().initWithString(`file:///${knownFolders.currentApp().path}/`));
        }
    }

    get canGoBack(): boolean {
        if (this._wkWebView) {
            return this._wkWebView.canGoBack;
        } else if (this._wkWebView) {
            return this._wkWebView.canGoBack;
        } else {
            return false;
        }
    }

    get canGoForward(): boolean {
        if (this._wkWebView) {
            return this._wkWebView.canGoForward;
        } else if (this._wkWebView) {
            return this._wkWebView.canGoForward;
        } else {
            return false;
        }
    }

    public goBack() {
        if (this._wkWebView) {
            this._wkWebView.goBack();
        } else if (this._wkWebView) {
            this._wkWebView.goBack();
        }
    }

    public goForward() {
        if (this._wkWebView) {
            this._wkWebView.goForward();
        } else if (this._wkWebView) {
            this._wkWebView.goForward();
        }
    }

    public reload() {
        if (this._wkWebView) {
            this._wkWebView.reload();
        } else if (this._wkWebView) {
            this._wkWebView.reload();
        }
    }

    registerLocalResource(name: string, filepath: string) {
        if (!filepath) {
            return;
        }

        if (filepath.startsWith('~')) {
            filepath = fs.path.normalize(knownFolders.currentApp().path + filepath.substr(1));
        }

        if (!fs.File.exists(filepath)) {
            return;
        }

        const path = fs.File.fromPath(filepath).path;
        if (this._wkWebView) {
            this._wkCustomUrlSchemeHandler.registerLocalResourceForKeyFilepath(name, path);
        } else if (this._wkWebView) {
            CustomNSURLProtocol.registerLocalResourceForKeyFilepath(name, path);
        }
    }

    unregisterLocalResource(name: string) {
        if (this._wkWebView) {
            this._wkCustomUrlSchemeHandler.unregisterLocalResourceForKey(name);
        } else if (this._wkWebView) {
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
}
