/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />

import { NavigationType, WebViewExtBase } from "./webview-ext-common";

export class UIWebViewDelegateImpl extends NSObject implements UIWebViewDelegate {
    public static ObjCProtocols = [UIWebViewDelegate];

    private _owner: WeakRef<WebViewExtBase>;

    public static initWithOwner(owner: WeakRef<WebViewExtBase>): UIWebViewDelegateImpl {
        let delegate = <UIWebViewDelegateImpl>UIWebViewDelegateImpl.new();
        delegate._owner = owner;
        return delegate;
    }

    public webViewShouldStartLoadWithRequestNavigationType(webView: UIWebView, request: NSURLRequest, navigationType: number) {
        const owner = this._owner.get();
        if (!owner) {
            return true;
        }

        if (!request.URL) {
            return true;
        }

        let navType: NavigationType = "other";

        switch (navigationType) {
            case UIWebViewNavigationType.LinkClicked: {
                navType = "linkClicked";
                break;
            }
            case UIWebViewNavigationType.FormSubmitted: {
                navType = "formSubmitted";
                break;
            }
            case UIWebViewNavigationType.BackForward: {
                navType = "backForward";
                break;
            }
            case UIWebViewNavigationType.Reload: {
                navType = "reload";
                break;
            }
            case UIWebViewNavigationType.FormResubmitted: {
                navType = "formResubmitted";
                break;
            }
            default: {
                navType = "other";
                break;
            }
        }

        const absoluteUrl = request.URL.absoluteString;
        owner.writeTrace(`UIWebViewDelegateClass.webViewShouldStartLoadWithRequestNavigationType("${absoluteUrl}", "${navigationType}")`);
        if (absoluteUrl.startsWith("js2ios:")) {
            owner.writeTrace(`UIWebViewDelegateClass.webViewShouldStartLoadWithRequestNavigationType("${absoluteUrl}", "${navigationType}") -> onUIWebViewEvent`);
            owner.onUIWebViewEvent(absoluteUrl);
            return false;
        }

        const urlOverrideHandlerFn = owner.urlOverrideHandler;
        if (urlOverrideHandlerFn && urlOverrideHandlerFn(absoluteUrl) === true) {
            owner.writeTrace(`UIWebViewDelegateClass.webViewShouldStartLoadWithRequestNavigationType("${absoluteUrl}", "${navigationType}") - urlOverrideHandler`);
            return false;
        }
        owner._onLoadStarted(request.URL.absoluteString, navType);

        return true;
    }

    public uiWebViewJSNavigation = false;

    public webViewDidStartLoad(webView: UIWebView) {
        const owner = this._owner.get();
        if (!owner) {
            return;
        }

        owner.writeTrace(`UIWebViewDelegateClass.webViewDidStartLoad("${webView.request.URL}")`);
    }

    public webViewDidFinishLoad(webView: UIWebView) {
        const owner = this._owner.get();
        if (!owner) {
            return;
        }

        owner.writeTrace(`UIWebViewDelegateClass.webViewDidFinishLoad("${webView.request.URL}")`);
        let src = owner.src;
        if (webView.request && webView.request.URL) {
            src = webView.request.URL.absoluteString;
        }
        owner._onLoadFinished(src);
    }

    public webViewDidFailLoadWithError(webView: UIWebView, error: NSError) {
        const owner = this._owner.get();
        if (!owner) {
            return;
        }

        let src = owner.src;
        if (webView.request && webView.request.URL) {
            src = webView.request.URL.absoluteString;
        }

        owner.writeTrace(`UIWebViewDelegateClass.webViewDidFailLoadWithError("${error.localizedDescription}") url: "${src}"`);
        owner._onLoadFinished(src, error.localizedDescription);
    }
}
