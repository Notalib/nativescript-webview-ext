/// <reference path="./node_modules/tns-platform-declarations/android.d.ts" />

import { WebViewExtBase, knownFolders, traceEnabled, traceWrite, traceCategories, extToMimeType } from "./webview-ext.common";
import * as fs from 'tns-core-modules/file-system';

export * from "./webview-ext.common";

interface WebViewClient {
    new (owner: WebViewExt): android.webkit.WebViewClient;
}

let WebViewClient: any;

function initializeWebViewClient(): void {
    if (WebViewClient) {
        return;
    }

    class WebViewExtClientImpl extends android.webkit.WebViewClient {

        constructor(public owner: WebViewExtBase) {
            super();
            return global.__native(this);
        }

        public shouldOverrideUrlLoading(view: android.webkit.WebView, url: string) {
            let urlOverrideHandlerFn = this.owner.urlOverrideHandler;
            if (urlOverrideHandlerFn && urlOverrideHandlerFn(url) === true) {
                return true;
            }

            if (traceEnabled()) {
                traceWrite("WebViewClientClass.shouldOverrideUrlLoading(" + url + ")", traceCategories.Debug);
            }
            return false;
        }

        public shouldInterceptRequest(view: android.webkit.WebView, request: any) {
            let url = request as string;
            if (typeof request === 'object') {
                url = request.getUrl().toString();
            }

            if (typeof url !== 'string') {
                return super.shouldInterceptRequest(view, request);
            }

            if (!url.startsWith('x-local://')) {
                return super.shouldInterceptRequest(view, request);
            }
            const path = this.owner.getRegistretLocalResource(url.replace('x-local://', ''));
            if (!path || !fs.File.exists(path)) {
                return super.shouldInterceptRequest(view, request);
            }

            const file = fs.File.fromPath(path);

            const javaFile = new java.io.File(file.path);
            const stream = new java.io.FileInputStream(javaFile);
            const mimeType = extToMimeType.get(file.extension.substr(1)) || 'application/octet-stream';
            const encoding = mimeType.startsWith('image/') || mimeType === 'application/octet-stream' ?  'binary' : 'UTF-8';

            return new android.webkit.WebResourceResponse(mimeType, encoding, stream);
        }

        public onPageStarted(view: android.webkit.WebView, url: string, favicon: android.graphics.Bitmap) {
            super.onPageStarted(view, url, favicon);
            const owner = this.owner;
            if (owner) {
                if (traceEnabled()) {
                    traceWrite("WebViewClientClass.onPageStarted(" + url + ", " + favicon + ")", traceCategories.Debug);
                }
                owner._onLoadStarted(url, undefined);
            }
        }

        public onPageFinished(view: android.webkit.WebView, url: string) {
            super.onPageFinished(view, url);
            const owner = this.owner;
            if (owner) {
                if (traceEnabled()) {
                    traceWrite("WebViewClientClass.onPageFinished(" + url + ")", traceCategories.Debug);
                }
                owner._onLoadFinished(url, undefined);
            }
        }

        public onReceivedError() {
            let view: android.webkit.WebView = arguments[0];

            if (arguments.length === 4) {
                let errorCode: number = arguments[1];
                let description: string = arguments[2];
                let failingUrl: string = arguments[3];

                super.onReceivedError(view, errorCode, description, failingUrl);

                const owner = this.owner;
                if (owner) {
                    if (traceEnabled()) {
                        traceWrite("WebViewClientClass.onReceivedError(" + errorCode + ", " + description + ", " + failingUrl + ")", traceCategories.Debug);
                    }
                    owner._onLoadFinished(failingUrl, description + "(" + errorCode + ")");
                }
            } else {
                let request: any = arguments[1];
                let error: any = arguments[2];

                super.onReceivedError(view, request, error);
                const owner = this.owner;
                if (owner) {
                    if (traceEnabled()) {
                        traceWrite("WebViewClientClass.onReceivedError(" + error.getErrorCode() + ", " + error.getDescription() + ", " + (error.getUrl && error.getUrl()) + ")", traceCategories.Debug);
                    }
                    owner._onLoadFinished(error.getUrl && error.getUrl(), error.getDescription() + "(" + error.getErrorCode() + ")");
                }
            }
        }
    }

    WebViewClient = WebViewExtClientImpl;
}

export class WebViewExt extends WebViewExtBase {
    nativeViewProtected: any; /* android.webkit.WebView */

    public createNativeView() {
        initializeWebViewClient();

        const nativeView = new android.webkit.WebView(this._context);
        nativeView.getSettings().setJavaScriptEnabled(true);
        nativeView.getSettings().setBuiltInZoomControls(true);
        const client = new WebViewClient(this);
        nativeView.setWebViewClient(client);
        (<any>nativeView).client = client;
        return nativeView;
    }

    public initNativeView(): void {
        super.initNativeView();
        (<any>this.nativeViewProtected).client.owner = this;
    }

    public disposeNativeView() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            nativeView.destroy();
        }

        (<any>nativeView).client.owner = null;
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

    get canGoBack(): boolean {
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
}
