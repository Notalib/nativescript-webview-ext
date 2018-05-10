/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />

import * as fs from 'tns-core-modules/file-system';
import * as platform from "tns-core-modules/platform";
import { profile } from "tns-core-modules/profiling";
import { layout, traceMessageType } from "tns-core-modules/ui/core/view";
import { knownFolders, NavigationType, traceCategories, traceEnabled, traceWrite, WebViewExtBase } from "./webview-ext-common";
import { UIWebViewDelegateImpl } from './webview-ext.uiwebview';
import { WKNavigationDelegateImpl, WKScriptMessageHandlerImpl } from './webview-ext.wkwebview';

export * from "./webview-ext-common";

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

        this.setupWebViewInterface();
    }

    public executeJavaScript<T>(scriptCode: string, stringifyResult = true): Promise<T> {
        if (stringifyResult) {
            scriptCode = `
            var result = ${scriptCode};

            try {
                JSON.stringify(result);
            } catch (err) {
                result;
            }
            `;
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

    public get canGoBack(): boolean {
        if (this._wkWebView) {
            return this._wkWebView.canGoBack;
        } else if (this._uiWebView) {
            return this._uiWebView.canGoBack;
        } else {
            return false;
        }
    }

    public get canGoForward(): boolean {
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

    public registerLocalResource(resourceName: string, path: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        const filepath = this.resolveLocalResourceFilePath(path);
        if (!filepath) {
            return;
        }

        if (this._wkWebView) {
            this._wkCustomUrlSchemeHandler.registerLocalResourceForKeyFilepath(resourceName, filepath);
        } else if (this._uiWebView) {
            CustomNSURLProtocol.registerLocalResourceForKeyFilepath(resourceName, filepath);
        }
    }

    public unregisterLocalResource(resourceName: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        if (this._wkWebView) {
            this._wkCustomUrlSchemeHandler.unregisterLocalResourceForKey(resourceName);
        } else if (this._uiWebView) {
            CustomNSURLProtocol.unregisterLocalResourceForKey(resourceName);
        }
    }

    public getRegistretLocalResource(resourceName: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        if (this._wkWebView) {
            return this._wkCustomUrlSchemeHandler.getRegisteredLocalResourceForKey(resourceName);
        } else if (this._uiWebView) {
            return CustomNSURLProtocol.getRegisteredLocalResourceForKey(resourceName);
        } else {
            throw new Error('Not implemented for UIWebView');
        }
    }

    public onUIWebViewEvent(url: string) {
        if (!this.isUIWebView) {
            this.writeTrace(`WebViewExt.onUIWebViewEvent(${url}) - only works for UIWebView`, traceMessageType.error);
            return;
        }

        if (!url.startsWith('js2ios')) {
            this.writeTrace(`WebViewExt.onUIWebViewEvent(${url}) - only supports js2ios-scheme`, traceMessageType.error);
            return;
        }

        try {
            const message = decodeURIComponent(url.replace(/^js2ios:/, ''));
            const { eventName, resId } = JSON.parse(message);
            this.executeJavaScript(`window.nsWebViewBridge.getUIWebViewResponse(${JSON.stringify(resId)})`)
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

    public getTitle() {
        return this.executeJavaScript<string>('document.title');
    }
}
