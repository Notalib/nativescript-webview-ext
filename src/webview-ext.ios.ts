/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />
/// <reference path="./platforms/ios/NotaWebViewExt.d.ts" />

import { WebViewExtBase, knownFolders, traceWrite, traceEnabled, traceCategories, NavigationType } from "./webview-ext.common";
import { profile } from "tns-core-modules/profiling";
import { layout } from "tns-core-modules/ui/core/view";
import * as fs from 'tns-core-modules/file-system';
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

export class WebViewExt extends WebViewExtBase {
    private _ios: WKWebView;
    private _customUrlSchemeHandler: CustomUrlSchemeHandler;
    private _webViewConfiguration: WKWebViewConfiguration;
    private _delegate: any;

    private _interceptScheme = 'x-local';
    public set interceptScheme(scheme: string) {
        this._interceptScheme = scheme;

        (<any>this._customUrlSchemeHandler).setURLSchem(scheme);
        this._webViewConfiguration.setURLSchemeHandlerForURLScheme(this._customUrlSchemeHandler, scheme);
    }

    public get interceptScheme() {
        return this._interceptScheme;
    }

    constructor() {
        super();
        const configuration = this._webViewConfiguration = WKWebViewConfiguration.new();
        this._delegate = WKNavigationDelegateImpl.initWithOwner(new WeakRef(this));
        const jScript = "var meta = document.createElement('meta'); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'initial-scale=1.0'); document.getElementsByTagName('head')[0].appendChild(meta);";
        const wkUScript = WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly(jScript, WKUserScriptInjectionTime.AtDocumentEnd, true);
        const wkUController = WKUserContentController.new();
        wkUController.addUserScript(wkUScript);
        configuration.userContentController = wkUController;
        configuration.preferences.setValueForKey(
            true,
            'allowFileAccessFromFileURLs'
        );

        this._customUrlSchemeHandler = new CustomUrlSchemeHandler();

        this.nativeViewProtected = this._ios = new WKWebView({
            frame: CGRectZero,
            configuration: configuration
        });
    }

    public executeJavaScript(scriptCode) {
        this.ios.evaluateJavaScriptCompletionHandler(scriptCode, (data, error) => {
            if (error) {
                throw error;
            }
        });
    }

    @profile
    public onLoaded() {
        super.onLoaded();
        this._ios.navigationDelegate = this._delegate;
    }

    public onUnloaded() {
        this._ios.navigationDelegate = null;
        this.disposeWebViewInterface();
        super.onUnloaded();
    }

    get ios(): WKWebView {
        return this._ios;
    }

    public stopLoading() {
        this._ios.stopLoading();
    }

    public _loadUrl(src: string) {
        if (src.startsWith('file:///')) {
            this._ios.loadFileURLAllowingReadAccessToURL(NSURL.URLWithString(src), NSURL.URLWithString(src));
        } else {
            this._ios.loadRequest(NSURLRequest.requestWithURL(NSURL.URLWithString(src)));
        }
    }

    public _loadData(content: string) {
        this._ios.loadHTMLStringBaseURL(content, NSURL.alloc().initWithString(`file:///${knownFolders.currentApp().path}/`));
    }

    get canGoBack(): boolean {
        return this._ios.canGoBack;
    }

    get canGoForward(): boolean {
        return this._ios.canGoForward;
    }

    public goBack() {
        this._ios.goBack();
    }

    public goForward() {
        this._ios.goForward();
    }

    public reload() {
        this._ios.reload();
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

        this._customUrlSchemeHandler.registerLocalResourceForKeyFilepath(name, fs.File.fromPath(filepath).path);
    }

    unregisterLocalResource(name: string) {
        this._customUrlSchemeHandler.unregisterLocalResourceForKey(name);
    }

    getRegistretLocalResource(name: string) {
        return this._customUrlSchemeHandler.getRegisteredLocalResourceForKey(name);
    }
}
