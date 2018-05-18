/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />

import { NavigationType, traceCategories, traceEnabled, traceMessageType, WebViewExtBase } from "./webview-ext-common";

export class UIWebViewDelegateImpl extends NSObject implements UIWebViewDelegate {
  public static ObjCProtocols = [UIWebViewDelegate];

  private _owner: WeakRef<WebViewExtBase>;

  public static initWithOwner(owner: WeakRef<WebViewExtBase>): UIWebViewDelegateImpl {
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
          owner.writeTrace(`UIWebViewDelegateClass.webViewShouldStartLoadWithRequestNavigationType(${absoluteUrl}, ${navigationType})`);
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
          owner.writeTrace(`UIWebViewDelegateClass.webViewDidStartLoad(${webView.request.URL})`);
      }
  }

  public webViewDidFinishLoad(webView: UIWebView) {
      let owner = this._owner.get();

      if (owner) {
          owner.writeTrace(`UIWebViewDelegateClass.webViewDidFinishLoad(${webView.request.URL})`);

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

          owner.writeTrace(`UIWebViewDelegateClass.webViewDidFailLoadWithError(${error.localizedDescription}) url: ${src}`);
          owner._onLoadFinished(src, error.localizedDescription);
      }
  }
}
