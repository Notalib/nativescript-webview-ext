/// <reference path="./node_modules/tns-platform-declarations/android.d.ts" />

import * as fs from 'tns-core-modules/file-system';
import * as platform from "tns-core-modules/platform";

import { LoadEventData } from "./webview-ext";
import { knownFolders, traceCategories, traceEnabled, traceWrite, WebViewExtBase } from "./webview-ext-common";

export * from "./webview-ext-common";

export declare namespace dk {
    namespace nota {
        namespace webviewinterface {
            class WebViewBridgeInterface extends java.lang.Object {
                public owner?: WebViewExt;

                emitEventToNativeScript(eventName: string, data: string): void;
            }
        }
    }
}
export interface AndroidWebViewClient extends android.webkit.WebViewClient {
    owner?: WebViewExt;
}

export interface AndroidWebView extends android.webkit.WebView {
    client?: AndroidWebViewClient;
    bridgeInterface?: dk.nota.webviewinterface.WebViewBridgeInterface;
}

let WebViewExtClient: new () => AndroidWebViewClient;
let WebViewBridgeInterface: new () => dk.nota.webviewinterface.WebViewBridgeInterface;

const extToMimeType = new Map<string, string>([
    ['css', 'text/css'],
    ['js', 'text/javascript'],
    ['jpg', 'image/jpeg'],
    ['jpeg', 'image/jpeg'],
    ['png', 'image/png'],
    ['gif', 'image/gif'],
    ['svg', 'image/svg+xml'],
]);

function initializeWebViewClient(): void {
    if (WebViewExtClient) {
        return;
    }

    class WebViewExtClientImpl extends android.webkit.WebViewClient {
        public owner: WebViewExt;

        constructor() {
            super();
            return global.__native(this);
        }

        public shouldOverrideUrlLoading(view: android.webkit.WebView, request: any) {
            const owner = this.owner;
            if (!owner) {
                return true;
            }

            let url = request as string;
            if (typeof request === 'object') {
                url = request.getUrl().toString();
            }

            const scheme = `${owner.interceptScheme}://`;
            if (url.startsWith(scheme)) {
                return true;
            }

            let urlOverrideHandlerFn = owner.urlOverrideHandler;
            if (urlOverrideHandlerFn && urlOverrideHandlerFn(url) === true) {
                return true;
            }

            if (traceEnabled()) {
                traceWrite("WebViewClientClass.shouldOverrideUrlLoading(" + url + ")", traceCategories.Debug);
            }
            return false;
        }

        public shouldInterceptRequest(view: android.webkit.WebView, request: any) {
            const owner = this.owner;
            if (!owner) {
                return request;
            }

            let url = request as string;
            if (typeof request === 'object') {
                url = request.getUrl().toString();
            }

            if (typeof url !== 'string') {
                return super.shouldInterceptRequest(view, request);
            }

            const scheme = `${owner.interceptScheme}://`;
            if (!url.startsWith(scheme)) {
                return super.shouldInterceptRequest(view, request);
            }

            const filepath = owner.getRegistretLocalResource(url.replace(scheme, ''));
            if (!filepath || !fs.File.exists(filepath)) {
                return super.shouldInterceptRequest(view, request);
            }

            const tnsFile = fs.File.fromPath(filepath);

            const javaFile = new java.io.File(tnsFile.path);
            const stream = new java.io.FileInputStream(javaFile);
            const mimeType = extToMimeType.get(tnsFile.extension.substr(1)) || 'application/octet-stream';
            const encoding = mimeType.startsWith('image/') || mimeType === 'application/octet-stream' ? 'binary' : 'UTF-8';

            return new android.webkit.WebResourceResponse(mimeType, encoding, stream);
        }

        public onPageStarted(view: android.webkit.WebView, url: string, favicon: android.graphics.Bitmap) {
            super.onPageStarted(view, url, favicon);
            const owner = this.owner;
            if (!owner) {
                return;
            }
            if (traceEnabled()) {
                traceWrite("WebViewClientClass.onPageStarted(" + url + ", " + favicon + ")", traceCategories.Debug);
            }
            owner._onLoadStarted(url, undefined);
        }

        public onPageFinished(view: android.webkit.WebView, url: string) {
            super.onPageFinished(view, url);
            const owner = this.owner;
            if (!owner) {
                return;
            }
            if (traceEnabled()) {
                traceWrite("WebViewClientClass.onPageFinished(" + url + ")", traceCategories.Debug);
            }
            owner._onLoadFinished(url, undefined);
        }

        public onReceivedError() {
            if (arguments.length === 4) {
                const [view, errorCode, description, failingUrl] = Array.from(arguments) as [android.webkit.WebView, number, string, string];
                this.onReceivedErrorBeforeAPI23(view, errorCode, description, failingUrl);
            } else {
                const [view, request, error] = Array.from(arguments) as [android.webkit.WebView, any, any];
                this.onReceivedErrorAPI23(view, request, error);
            }
        }

        private onReceivedErrorAPI23(view: android.webkit.WebView, request: any, error: any) {
            super.onReceivedError(view, request, error);
            const owner = this.owner;
            if (owner) {
                if (traceEnabled()) {
                    traceWrite("WebViewClientClass.onReceivedError(" + error.getErrorCode() + ", " + error.getDescription() + ", " + (error.getUrl && error.getUrl()) + ")", traceCategories.Debug);
                }
                owner._onLoadFinished(error.getUrl && error.getUrl(), error.getDescription() + "(" + error.getErrorCode() + ")");
            }

        }

        private onReceivedErrorBeforeAPI23(view: android.webkit.WebView, errorCode: number, description: string, failingUrl: string) {
            super.onReceivedError(view, errorCode, description, failingUrl);

            const owner = this.owner;
            if (owner) {
                if (traceEnabled()) {
                    traceWrite("WebViewClientClass.onReceivedError(" + errorCode + ", " + description + ", " + failingUrl + ")", traceCategories.Debug);
                }
                owner._onLoadFinished(failingUrl, description + "(" + errorCode + ")");
            }

        }
    }

    WebViewExtClient = WebViewExtClientImpl;

    class WebViewBridgeInterfaceImpl extends dk.nota.webviewinterface.WebViewBridgeInterface {
        public owner: WebViewExt;

        constructor() {
            super();
            return global.__native(this);
        }

        emitEventToNativeScript(eventName: string, data: string) {
            const owner = this.owner;
            if (!owner) {
                return;
            }

            owner.onWebViewEvent(eventName, JSON.parse(data));
        }
    }

    WebViewBridgeInterface = WebViewBridgeInterfaceImpl;
}

declare function escape(input: string): string;

let instanceNo = 0;
export class WebViewExt extends WebViewExtBase {
    public nativeViewProtected: AndroidWebView;

    protected readonly localResourceMap = new Map<string, string>();

    public get isUIWebView() {
        return false;
    }

    public get isWKWebView() {
        return false;
    }

    public readonly instance = ++instanceNo;

    public createNativeView() {
        initializeWebViewClient();

        const nativeView = new android.webkit.WebView(this._context);
        const settings = nativeView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setBuiltInZoomControls(true);

        const client = new WebViewExtClient();
        nativeView.setWebViewClient(client);
        (nativeView as any).client = client;

        const bridgeInterface = new WebViewBridgeInterface();
        nativeView.addJavascriptInterface(bridgeInterface, 'androidWebViewBridge');
        (nativeView as any).bridgeInterface = bridgeInterface;
        return nativeView;
    }

    public initNativeView() {
        super.initNativeView();
        this.nativeViewProtected.client.owner = this;
        this.nativeViewProtected.bridgeInterface.owner = this;
        this.setupWebViewInterface();
    }

    public disposeNativeView() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            nativeView.destroy();
            (<any>nativeView).client.owner = null;
            (<any>nativeView).bridgeInterface.owner = null;
        }

        super.disposeNativeView();
    }

    public _loadUrl(src: string) {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }

        nativeView.loadUrl(src);
    }

    public _loadData(src: string) {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }

        const baseUrl = `file:///${knownFolders.currentApp().path}/`;
        nativeView.loadDataWithBaseURL(baseUrl, src, "text/html", "utf-8", null);
    }

    public get canGoBack(): boolean {
        return this.nativeViewProtected.canGoBack();
    }

    public stopLoading() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            nativeView.stopLoading();
        }
    }

    get canGoForward(): boolean {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            return nativeView.canGoForward();
        }
        return false;
    }

    public goBack() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            return nativeView.goBack();
        }
    }

    public goForward() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            return nativeView.goForward();
        }
    }

    public reload() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            return nativeView.reload();
        }
    }

    public registerLocalResource(resourceName: string, path: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        const filepath = this.resolveLocalResourceFilePath(path);
        if (!filepath) {
            return;
        }

        this.localResourceMap.set(resourceName, filepath);
    }

    public unregisterLocalResource(resourceName: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        this.localResourceMap.delete(resourceName);
    }

    public getRegistretLocalResource(resourceName: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        return this.localResourceMap.get(resourceName);
    }

    public executeJavaScript<T>(scriptCode): Promise<T> {
        if (!this.android) {
            return Promise.reject(new Error('Native Android not inited, cannot call executeJavaScript'));
        }

        return new Promise<any>((resolve, reject) => {
            if (Number(platform.device.sdkVersion) < 19) {
                reject(new Error('Android API < 19 not supported'));
                return;
            }
            const that = this;
            this.android.evaluateJavascript(scriptCode, new android.webkit.ValueCallback({
                onReceiveValue(result) {
                    resolve(that.parseWebviewJavascriptResult(result));
                },
            }));
        });
    }

    public getTitle() {
        return Promise.resolve(this.nativeViewProtected.getTitle());
    }
}
