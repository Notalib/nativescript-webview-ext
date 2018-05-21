/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />
/// <reference path="./platforms/ios/NotaWebViewExt.d.ts" />

import { NavigationType, traceMessageType, WebViewExtBase } from "./webview-ext-common";

export class WKNavigationDelegateImpl extends NSObject implements WKNavigationDelegate {
    public static ObjCProtocols = [WKNavigationDelegate];
    public static initWithOwner(owner: WeakRef<WebViewExtBase>): WKNavigationDelegateImpl {
        const handler = <WKNavigationDelegateImpl>WKNavigationDelegateImpl.new();
        handler._owner = owner;
        return handler;
    }
    private _owner: WeakRef<WebViewExtBase>;

    public webViewDecidePolicyForNavigationActionDecisionHandler(webView: WKWebView, navigationAction: WKNavigationAction, decisionHandler: any): void {
        const owner = this._owner.get();

        if (!owner) {
            decisionHandler(WKNavigationActionPolicy.Cancel);
            return;
        }

        const url = navigationAction.request.URL && navigationAction.request.URL.absoluteString;
        owner.writeTrace(`webViewDecidePolicyForNavigationActionDecisionHandler: "${url}"`);
        if (!url) {
            return;
        }

        const urlOverrideHandlerFn = owner.urlOverrideHandler;
        if (urlOverrideHandlerFn && urlOverrideHandlerFn(url) === true) {
            decisionHandler(WKNavigationActionPolicy.Cancel);
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
        decisionHandler(WKNavigationActionPolicy.Allow);

        owner.writeTrace(`WKNavigationDelegateClass.webViewDecidePolicyForNavigationActionDecisionHandler("${url}", "${navigationAction.navigationType}") -> "${navType}"`);
        owner._onLoadStarted(navigationAction.request.URL.absoluteString, navType);
    }

    public webViewDidStartProvisionalNavigation(webView: WKWebView, navigation: WKNavigation): void {
        const owner = this._owner.get();
        if (!owner) {
            return;
        }
            owner.writeTrace(`WKNavigationDelegateClass.webViewDidStartProvisionalNavigation("${webView.URL}")`);
    }

    public webViewDidFinishNavigation(webView: WKWebView, navigation: WKNavigation): void {
        const owner = this._owner.get();
        if (!owner) {
            return;
        }

        owner.writeTrace(`WKNavigationDelegateClass.webViewDidFinishNavigation("${webView.URL}")`);
        let src = owner.src;
        if (webView.URL) {
            src = webView.URL.absoluteString;
        }
        owner._onLoadFinished(src);
    }

    public webViewDidFailNavigationWithError(webView: WKWebView, navigation: WKNavigation, error: NSError): void {
        const owner = this._owner.get();
        if (!owner) {
            return;
        }

        let src = owner.src;
        if (webView.URL) {
            src = webView.URL.absoluteString;
        }
        owner.writeTrace(`WKNavigationDelegateClass.webViewDidFailNavigationWithError("${error.localizedDescription}")`);
        owner._onLoadFinished(src, error.localizedDescription);
    }
}

export class WKScriptMessageHandlerImpl extends NSObject implements WKScriptMessageHandler {
    public static ObjCProtocols = [WKScriptMessageHandler];

    private _owner: WeakRef<WebViewExtBase>;

    public static initWithOwner(owner: WeakRef<WebViewExtBase>): WKScriptMessageHandlerImpl {
        const delegate = <WKScriptMessageHandlerImpl>WKScriptMessageHandlerImpl.new();
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
            owner.onWebViewEvent(message.eventName, message.data);
        } catch (err) {
            owner.writeTrace(`userContentControllerDidReceiveScriptMessage(${userContentController}, ${webViewMessage}) - bad message: ${webViewMessage.body}`, traceMessageType.error);
        }
    }
}
