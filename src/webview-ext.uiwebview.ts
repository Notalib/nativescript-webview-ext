/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />

import { NavigationType, WebViewExtBase } from "./webview-ext-common";

export class UIWebViewDelegateImpl extends NSObject implements UIWebViewDelegate {
    public static ObjCProtocols = [UIWebViewDelegate];

    private owner: WeakRef<WebViewExtBase>;

    public static initWithOwner(owner: WeakRef<WebViewExtBase>): UIWebViewDelegateImpl {
        const delegate = <UIWebViewDelegateImpl>UIWebViewDelegateImpl.new();
        delegate.owner = owner;
        return delegate;
    }

    public webViewShouldStartLoadWithRequestNavigationType(webView: UIWebView, request: NSURLRequest, navigationType: number) {
        const owner = this.owner.get();
        if (!owner) {
            return true;
        }

        if (!request.URL) {
            return true;
        }

        const httpMethod = request.HTTPMethod;

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

        const url = request.URL.absoluteString;
        owner.writeTrace(`UIWebViewDelegateClass.webViewShouldStartLoadWithRequestNavigationType("${url}", "${navigationType}")`);
        if (url.startsWith("js2ios:")) {
            owner.writeTrace(`UIWebViewDelegateClass.webViewShouldStartLoadWithRequestNavigationType("${url}", "${navigationType}") -> onUIWebViewEvent`);
            owner.onUIWebViewEvent(url);
            return false;
        }

        const shouldOverrideUrlLoading = owner._onShouldOverrideUrlLoading(url, httpMethod, navType);
        if (shouldOverrideUrlLoading === true) {
            owner.writeTrace(`UIWebViewDelegateClass.webViewShouldStartLoadWithRequestNavigationType("${url}", "${navigationType}") - cancel`);
            return false;
        }

        owner._onLoadStarted(url, navType);

        return true;
    }

    public uiWebViewJSNavigation = false;

    public webViewDidStartLoad(webView: UIWebView) {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        owner.writeTrace(`UIWebViewDelegateClass.webViewDidStartLoad("${webView.request.URL}")`);
    }

    public webViewDidFinishLoad(webView: UIWebView) {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        owner.writeTrace(`UIWebViewDelegateClass.webViewDidFinishLoad("${webView.request.URL}")`);
        let src = owner.src;
        if (webView.request && webView.request.URL) {
            src = webView.request.URL.absoluteString;
        }
        owner._onLoadFinished(src).catch(() => void 0);
    }

    public webViewDidFailLoadWithError(webView: UIWebView, error: NSError) {
        const owner = this.owner.get();
        if (!owner) {
            return;
        }

        let src = owner.src;
        if (webView.request && webView.request.URL) {
            src = webView.request.URL.absoluteString;
        }

        owner.writeTrace(`UIWebViewDelegateClass.webViewDidFailLoadWithError("${error.localizedDescription}") url: "${src}"`);
        owner._onLoadFinished(src, error.localizedDescription).catch(() => void 0);
    }
}
