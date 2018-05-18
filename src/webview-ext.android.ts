/// <reference path="./node_modules/tns-platform-declarations/android.d.ts" />

import * as fs from 'tns-core-modules/file-system';
import * as platform from "tns-core-modules/platform";

import { knownFolders, traceCategories, traceEnabled, traceMessageType, WebViewExtBase } from "./webview-ext-common";

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
    ['gif', 'image/gif'],
    ['jpeg', 'image/jpeg'],
    ['jpg', 'image/jpeg'],
    ['js', 'text/javascript'],
    ['otf', 'application/vnd.ms-opentype'],
    ['png', 'image/png'],
    ['svg', 'image/svg+xml'],
    ['ttf', 'application/x-font-ttf'],
]);

const extToBinaryEncoding = new Set<string>([
    "gif",
    "jpeg",
    "jpg",
    "otf",
    "png",
    "ttf",
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
                owner.writeTrace(`WebViewClientClass.shouldOverrideUrlLoading(${url})`);
            }
            return false;
        }

        public shouldInterceptRequest(view: android.webkit.WebView, request: any) {
            const owner = this.owner;
            if (!owner) {
                return super.shouldInterceptRequest(view, request);
            }

            let url = request as string;
            if (typeof request === 'object') {
                url = request.getUrl().toString();
            }

            if (typeof url !== 'string') {
                owner.writeTrace(`WebViewClientClass.shouldInterceptRequest(${url}) - is not a string`);
                return super.shouldInterceptRequest(view, request);
            }

            if (!url.startsWith(owner.interceptScheme)) {
                return super.shouldInterceptRequest(view, request);
            }

            const filepath = owner.getRegistretLocalResource(url);
            if (!filepath) {
                owner.writeTrace(`WebViewClientClass.shouldInterceptRequest(${url}) - no matching file`);
                return super.shouldInterceptRequest(view, request);
            }

            if (!fs.File.exists(filepath)) {
                owner.writeTrace(`WebViewClientClass.shouldInterceptRequest(${url}) - file: ${filepath} doesn't exists`);
                return super.shouldInterceptRequest(view, request);
            }

            const tnsFile = fs.File.fromPath(filepath);

            const javaFile = new java.io.File(tnsFile.path);
            const stream = new java.io.FileInputStream(javaFile);
            const ext = tnsFile.extension.substr(1).toLowerCase();
            const mimeType = extToMimeType.get(ext) || 'application/octet-stream';
            const encoding = extToBinaryEncoding.has(ext) || mimeType === 'application/octet-stream' ? 'binary' : 'UTF-8';

            owner.writeTrace(`WebViewClientClass.shouldInterceptRequest(${url}) - file: ${filepath} mimeType:${mimeType} encoding:${encoding}`);

            const response = new android.webkit.WebResourceResponse(mimeType, encoding, stream);

            if ((response as any).getResponseHeaders) {
                console.log((response as any).getResponseHeaders());
            }

            return response;
        }

        public onPageStarted(view: android.webkit.WebView, url: string, favicon: android.graphics.Bitmap) {
            super.onPageStarted(view, url, favicon);
            const owner = this.owner;
            if (!owner) {
                return;
            }
            if (traceEnabled()) {
                owner.writeTrace(`WebViewClientClass.onPageStarted(${url}, ${favicon})`);
            }
            owner._onLoadStarted(url);
        }

        public onPageFinished(view: android.webkit.WebView, url: string) {
            super.onPageFinished(view, url);
            const owner = this.owner;
            if (!owner) {
                return;
            }
            if (traceEnabled()) {
                owner.writeTrace(`WebViewClientClass.onPageFinished(${url})`);
            }
            owner._onLoadFinished(url);
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
            if (!owner) {
                return;
            }

            if (traceEnabled()) {
                owner.writeTrace(`WebViewClientClass.onReceivedError(${error.getErrorCode()}, ${error.getDescription()}, ${error.getUrl && error.getUrl()})`);
            }

            owner._onLoadFinished(error.getUrl && error.getUrl(), `${error.getDescription()}(${error.getErrorCode()})`);

        }

        private onReceivedErrorBeforeAPI23(view: android.webkit.WebView, errorCode: number, description: string, failingUrl: string) {
            super.onReceivedError(view, errorCode, description, failingUrl);

            const owner = this.owner;
            if (owner) {
                if (traceEnabled()) {
                    owner.writeTrace(`WebViewClientClass.onReceivedError(${errorCode}, ${description}, ${failingUrl})`);
                }
                owner._onLoadFinished(failingUrl, `${description}(${errorCode})`);
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
    }

    public disposeNativeView() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            nativeView.destroy();
            nativeView.client.owner = null;
            nativeView.bridgeInterface.owner = null;
        }

        super.disposeNativeView();
    }

    public _loadUrl(src: string) {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }

        this.writeTrace(`WebViewExt<android>._loadUrl(${src})`);
        nativeView.loadUrl(src);
    }

    public _loadData(src: string) {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }

        const baseUrl = `file:///${knownFolders.currentApp().path}/`;
        this.writeTrace(`WebViewExt<android>._loadData(${src}) -> baseUrl: ${baseUrl}`);
        nativeView.loadDataWithBaseURL(baseUrl, src, "text/html", "utf-8", null);
    }

    public get canGoBack(): boolean {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            return nativeView.canGoBack();
        }
        return false;
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
            this.writeTrace(`WebViewExt<android>.registerLocalResource(${resourceName}, ${path}) -> file doesn't exist`, traceMessageType.error);
            return;
        }

        this.writeTrace(`WebViewExt<android>.registerLocalResource(${resourceName}, ${path}) -> file: ${filepath}`);

        this.localResourceMap.set(resourceName, filepath);
    }

    public unregisterLocalResource(resourceName: string) {
        this.writeTrace(`WebViewExt<android>.unregisterLocalResource(${resourceName})`);
        resourceName = this.fixLocalResourceName(resourceName);

        this.localResourceMap.delete(resourceName);
    }

    public getRegistretLocalResource(resourceName: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        const result = this.localResourceMap.get(resourceName);

        this.writeTrace(`WebViewExt<android>.getRegistretLocalResource(${resourceName}) -> ${result} ${new Error().stack}`);

        return result;
    }

    public executeJavaScript<T>(scriptCode: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            if (Number(platform.device.sdkVersion) < 19) {
                this.writeTrace(`WebViewExt<android>.executeJavaScript() -> SDK:${platform.device.sdkVersion} not supported`, traceMessageType.error);
                reject(new Error('Android API < 19 not supported'));
                return;
            }
            if (!this.android) {
                this.writeTrace(`WebViewExt<android>.executeJavaScript() -> no nativeview?`, traceMessageType.error);
                reject(new Error('Native Android not inited, cannot call executeJavaScript'));
                return;
            }

            const that = this;
            this.android.evaluateJavascript(scriptCode, new android.webkit.ValueCallback({
                onReceiveValue(result) {
                    resolve(that.parseWebViewJavascriptResult(result));
                },
            }));
        });
    }

    public getTitle() {
        return Promise.resolve(this.nativeViewProtected.getTitle());
    }
}
