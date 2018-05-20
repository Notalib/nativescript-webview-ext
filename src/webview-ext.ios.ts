/// <reference path="./node_modules/tns-platform-declarations/ios.d.ts" />

import * as fs from 'tns-core-modules/file-system';
import * as platform from "tns-core-modules/platform";
import { profile } from "tns-core-modules/profiling";
import { traceMessageType } from "tns-core-modules/ui/core/view";
import { WebViewExtBase } from "./webview-ext-common";
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
    }

    public executeJavaScript<T>(scriptCode: string, stringifyResult = true): Promise<T> {
        if (stringifyResult) {
            scriptCode = `
            var result = ${scriptCode.trim()};

            try {
                JSON.stringify(result);
            } catch (err) {
                result;
            }
            `;
        }

        // this.writeTrace('Executing Javascript: ' + scriptCode);
        return new Promise((resolve, reject) => {
            if (this._wkWebView) {
                this._wkWebView.evaluateJavaScriptCompletionHandler(scriptCode, (data, error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(this.parseWebViewJavascriptResult(data));
                });
            } else if (this._uiWebView) {
                const resStr = this._uiWebView.stringByEvaluatingJavaScriptFromString(scriptCode);
                resolve(this.parseWebViewJavascriptResult(resStr));
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
        const nsURL = NSURL.URLWithString(src);
        if (this._wkWebView) {
            if (src.startsWith('file:///')) {
                const nsReadAccessUrl = NSURL.URLWithString(src);
                this.writeTrace(`WebViewExt<ios>._loadUrl(${src}) -> this._wkWebView.loadFileURLAllowingReadAccessToURL(${nsURL}, ${nsReadAccessUrl})`);
                this._wkWebView.loadFileURLAllowingReadAccessToURL(nsURL, nsReadAccessUrl);
            } else {
                const nsRequestWithUrl = NSURLRequest.requestWithURL(nsURL);
                this.writeTrace(`WebViewExt<ios>._loadUrl(${src}) -> this._wkWebView.loadRequest(${nsRequestWithUrl})`);
                this._wkWebView.loadRequest(nsRequestWithUrl);
            }
        } else if (this._uiWebView) {
            const nsRequestWithUrl = NSURLRequest.requestWithURL(nsURL);
            this.writeTrace(`WebViewExt<ios>._loadUrl(${src}) -> this._uiWebView.loadRequest(${nsRequestWithUrl})`);
            this._uiWebView.loadRequest(nsRequestWithUrl);
        }
    }

    public _loadData(content: string) {
        const nsURL = NSURL.alloc().initWithString(`file:///${fs.knownFolders.currentApp().path}/`);
        if (this._wkWebView) {
            this.writeTrace(`WebViewExt<ios>._loadUrl(content) -> this._wkWebView.loadHTMLStringBaseURL(${nsURL})`);
            this._wkWebView.loadHTMLStringBaseURL(content, nsURL);
        } else if (this._uiWebView) {
            this.writeTrace(`WebViewExt<ios>._loadUrl(content) -> this._uiWebView.loadHTMLStringBaseURL(${nsURL})`);
            this._uiWebView.loadHTMLStringBaseURL(content, nsURL);
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
            this.writeTrace(`WebViewExt<ios>.registerLocalResource(${resourceName}, ${path}) -> file doesn't exist`, traceMessageType.error);
            return;
        }

        this.writeTrace(`WebViewExt<ios>.registerLocalResource(${resourceName}, ${path}) -> file: ${filepath}`);

        if (this._wkWebView) {
            this._wkCustomUrlSchemeHandler.registerLocalResourceForKeyFilepath(resourceName, filepath);
        } else if (this._uiWebView) {
            CustomNSURLProtocol.registerLocalResourceForKeyFilepath(resourceName, filepath);
        }
    }

    public unregisterLocalResource(resourceName: string) {
        this.writeTrace(`WebViewExt<ios>.unregisterLocalResource(${resourceName})`);

        resourceName = this.fixLocalResourceName(resourceName);

        if (this._wkWebView) {
            this._wkCustomUrlSchemeHandler.unregisterLocalResourceForKey(resourceName);
        } else if (this._uiWebView) {
            CustomNSURLProtocol.unregisterLocalResourceForKey(resourceName);
        }
    }

    public getRegistretLocalResource(resourceName: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        let result: string;
        if (this._wkWebView) {
            result = this._wkCustomUrlSchemeHandler.getRegisteredLocalResourceForKey(resourceName);
        } else if (this._uiWebView) {
            result = CustomNSURLProtocol.getRegisteredLocalResourceForKey(resourceName);
        } else {
            throw new Error('Not implemented for UIWebView');
        }

        this.writeTrace(`WebViewExt<android>.getRegistretLocalResource(${resourceName}) -> ${result}`);
        return result;
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
