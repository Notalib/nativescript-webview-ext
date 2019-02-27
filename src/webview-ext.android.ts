/// <reference path="./platforms/android/webviewinterface.d.ts" />

import * as fs from "tns-core-modules/file-system";
import {
    androidSDK,
    builtInZoomControlsProperty,
    cacheModeProperty,
    databaseStorageProperty,
    debugModeProperty,
    displayZoomControlsProperty,
    domStorageProperty,
    supportZoomProperty,
    traceMessageType,
    UnsupportedSDKError,
    WebViewExtBase,
} from "./webview-ext-common";

export * from "./webview-ext-common";

const extToMimeType = new Map<string, string>([
    ["html", "text/html"],
    ["htm", "text/html"],
    ["xhtml", "text/html"],
    ["xhtm", "text/html"],
    ["css", "text/css"],
    ["gif", "image/gif"],
    ["jpeg", "image/jpeg"],
    ["jpg", "image/jpeg"],
    ["js", "text/javascript"],
    ["otf", "application/vnd.ms-opentype"],
    ["png", "image/png"],
    ["svg", "image/svg+xml"],
    ["ttf", "application/x-font-ttf"],
]);

const extToBinaryEncoding = new Set<string>(["gif", "jpeg", "jpg", "otf", "png", "ttf"]);

type CacheMode = "default" | "cache_first" | "no_cache" | "cache_only" | "normal";

//#region android_native_classes
let cacheModeMap: Map<CacheMode, number>;

export interface AndroidWebViewClient extends android.webkit.WebViewClient {}

export interface AndroidWebView extends android.webkit.WebView {
    client: AndroidWebViewClient | null;
    bridgeInterface?: dk.nota.webviewinterface.WebViewBridgeInterface;
}

let WebViewExtClient: new (owner: WebViewExt) => AndroidWebViewClient;
let WebChromeViewExtClient: new (owner: WebViewExt) => android.webkit.WebChromeClient;
let WebViewBridgeInterface: new (owner: WebViewExt) => dk.nota.webviewinterface.WebViewBridgeInterface;

function initializeWebViewClient(): void {
    if (WebViewExtClient) {
        return;
    }

    cacheModeMap = new Map<CacheMode, number>([
        ["cache_first", android.webkit.WebSettings.LOAD_CACHE_ELSE_NETWORK],
        ["cache_only", android.webkit.WebSettings.LOAD_CACHE_ONLY],
        ["default", android.webkit.WebSettings.LOAD_DEFAULT],
        ["no_cache", android.webkit.WebSettings.LOAD_NO_CACHE],
        ["normal", android.webkit.WebSettings.LOAD_NORMAL],
    ]);

    class WebViewExtClientImpl extends android.webkit.WebViewClient {
        private owner: WeakRef<WebViewExt>;
        constructor(owner: WebViewExt) {
            super();

            this.owner = new WeakRef(owner);
            return global.__native(this);
        }

        /**
         * Give the host application a chance to take control when a URL is about to be loaded in the current WebView.
         */
        public shouldOverrideUrlLoading(view: android.webkit.WebView, request: string | android.webkit.WebResourceRequest) {
            const owner = this.owner.get();
            if (!owner) {
                console.warn("WebViewExtClientImpl.shouldOverrideUrlLoading(...) - no owner");
                return true;
            }

            let url = request as string;
            let httpMethod = "GET";
            let isRedirect = false;
            let hasGesture = false;
            let isForMainFrame = false;
            let requestHeaders: java.util.Map<string, string> | null = null;
            if (typeof request === "object") {
                httpMethod = request.getMethod();
                isRedirect = request.isRedirect();
                hasGesture = request.hasGesture();
                isForMainFrame = request.isForMainFrame();
                requestHeaders = request.getRequestHeaders();

                url = request.getUrl().toString();
            }

            owner.writeTrace(
                `WebViewClientClass.shouldOverrideUrlLoading("${url}") - method:${httpMethod} isRedirect:${isRedirect} hasGesture:${hasGesture} isForMainFrame:${isForMainFrame} headers:${requestHeaders}`,
            );

            if (url.startsWith(owner.interceptScheme)) {
                owner.writeTrace(`WebViewClientClass.shouldOverrideUrlLoading("${url}") - "${owner.interceptScheme}" - cancel`);
                return true;
            }

            const shouldOverrideUrlLoading = owner._onShouldOverrideUrlLoading(url, httpMethod);
            if (shouldOverrideUrlLoading === true) {
                owner.writeTrace(`WebViewClientClass.shouldOverrideUrlLoading("${url}") - cancel loading url`);
                return true;
            }

            return false;
        }

        public shouldInterceptRequest(view: android.webkit.WebView, request: any) {
            const owner = this.owner.get();
            if (!owner) {
                console.warn("WebViewExtClientImpl.shouldInterceptRequest(...) - no owner");
                return super.shouldInterceptRequest(view, request);
            }

            let url: string;
            if (typeof request === "string") {
                url = request;
            } else if (typeof request === "object") {
                url = request.getUrl().toString();
            }

            if (typeof url !== "string") {
                owner.writeTrace(`WebViewClientClass.shouldInterceptRequest("${url}") - is not a string`);
                return super.shouldInterceptRequest(view, request);
            }

            if (!url.startsWith(owner.interceptScheme)) {
                return super.shouldInterceptRequest(view, request);
            }

            const filepath = owner.getRegisteredLocalResource(url);
            if (!filepath) {
                owner.writeTrace(`WebViewClientClass.shouldInterceptRequest("${url}") - no matching file`);
                return super.shouldInterceptRequest(view, request);
            }

            if (!fs.File.exists(filepath)) {
                owner.writeTrace(`WebViewClientClass.shouldInterceptRequest("${url}") - file: "${filepath}" doesn't exists`);
                return super.shouldInterceptRequest(view, request);
            }

            const tnsFile = fs.File.fromPath(filepath);

            const javaFile = new java.io.File(tnsFile.path);
            const stream = new java.io.FileInputStream(javaFile);
            const ext = tnsFile.extension.substr(1).toLowerCase();
            const mimeType = extToMimeType.get(ext) || "application/octet-stream";
            const encoding = extToBinaryEncoding.has(ext) || mimeType === "application/octet-stream" ? "binary" : "UTF-8";

            owner.writeTrace(`WebViewClientClass.shouldInterceptRequest("${url}") - file: "${filepath}" mimeType:${mimeType} encoding:${encoding}`);

            const response = new android.webkit.WebResourceResponse(mimeType, encoding, stream);
            if (androidSDK < 21) {
                return response;
            }

            if (!response.getResponseHeaders) {
                return response;
            }

            let responseHeaders = response.getResponseHeaders() as java.util.HashMap<string, string>;
            if (!responseHeaders) {
                responseHeaders = new java.util.HashMap<string, string>();
            }

            responseHeaders.put("Access-Control-Allow-Origin", "*");
            response.setResponseHeaders(responseHeaders);

            return response;
        }

        public onPageStarted(view: android.webkit.WebView, url: string, favicon: android.graphics.Bitmap) {
            super.onPageStarted(view, url, favicon);
            const owner = this.owner.get();
            if (!owner) {
                console.warn(`WebViewExtClientImpl.onPageStarted("${view}", "${url}", "${favicon}") - no owner`);
                return;
            }

            owner.writeTrace(`WebViewClientClass.onPageStarted("${view}", "${url}", "${favicon}")`);
            owner._onLoadStarted(url);
        }

        public onPageFinished(view: android.webkit.WebView, url: string) {
            super.onPageFinished(view, url);
            const owner = this.owner.get();
            if (!owner) {
                console.warn(`WebViewExtClientImpl.onPageFinished("${view}", ${url}") - no owner`);
                return;
            }

            owner.writeTrace(`WebViewClientClass.onPageFinished("${view}", ${url}")`);
            owner._onLoadFinished(url).catch(() => void 0);
        }

        public onReceivedError() {
            if (arguments.length === 4) {
                const [view, errorCode, description, failingUrl] = [...arguments] as [android.webkit.WebView, number, string, string];
                this.onReceivedErrorBeforeAPI23(view, errorCode, description, failingUrl);
            } else {
                const [view, request, error] = [...arguments] as [android.webkit.WebView, any, any];
                this.onReceivedErrorAPI23(view, request, error);
            }
        }

        private onReceivedErrorAPI23(view: android.webkit.WebView, request: any, error: any) {
            super.onReceivedError(view, request, error);

            const owner = this.owner.get();
            if (!owner) {
                console.warn("WebViewExtClientImpl.onReceivedErrorAPI23(...) - no owner");
                return;
            }

            let url = error.getUrl && error.getUrl();
            if (!url && typeof request === "object") {
                url = request.getUrl().toString();
            }

            owner.writeTrace(`WebViewClientClass.onReceivedErrorAPI23(${error.getErrorCode()}, ${error.getDescription()}, ${url})`);

            owner._onLoadFinished(url, `${error.getDescription()}(${error.getErrorCode()})`).catch(() => void 0);
        }

        private onReceivedErrorBeforeAPI23(view: android.webkit.WebView, errorCode: number, description: string, failingUrl: string) {
            super.onReceivedError(view, errorCode, description, failingUrl);

            const owner = this.owner.get();
            if (!owner) {
                console.warn("WebViewExtClientImpl.onReceivedErrorBeforeAPI23(...) - no owner");
                return;
            }

            owner.writeTrace(`WebViewClientClass.onReceivedErrorBeforeAPI23(${errorCode}, "${description}", "${failingUrl}")`);
            owner._onLoadFinished(failingUrl, `${description}(${errorCode})`).catch(() => void 0);
        }
    }

    WebViewExtClient = WebViewExtClientImpl;

    class WebChromeViewExtClientImpl extends android.webkit.WebChromeClient {
        private owner: WeakRef<WebViewExt>;
        constructor(owner: WebViewExt) {
            super();

            this.owner = new WeakRef(owner);
            return global.__native(this);
        }

        public onGeolocationPermissionsHidePrompt(): void {
            return super.onGeolocationPermissionsHidePrompt();
        }

        public onProgressChanged(view: AndroidWebView, newProgress: number) {
            const owner = this.owner.get();
            if (!owner) {
                return;
            }

            owner._loadProgress(newProgress);
        }

        public onReceivedTitle(view: AndroidWebView, title: string) {
            const owner = this.owner.get();
            if (!owner) {
                return;
            }

            owner._titleChanged(title);
        }

        public onJsAlert(view: android.webkit.WebView, url: string, message: string, result: android.webkit.JsResult): boolean {
            const owner = this.owner.get();
            if (!owner) {
                return false;
            }

            let gotResponse = false;
            return owner._webAlert(message, () => {
                if (!gotResponse) {
                    result.confirm();
                }
                gotResponse = true;
            });
        }

        public onJsConfirm(view: android.webkit.WebView, url: string, message: string, result: android.webkit.JsResult): boolean {
            const owner = this.owner.get();
            if (!owner) {
                return false;
            }

            let gotResponse = false;
            return owner._webConfirm(message, (confirmed: boolean) => {
                if (!gotResponse) {
                    if (confirmed) {
                        result.confirm();
                    } else {
                        result.cancel();
                    }
                }

                gotResponse = true;
            });
        }

        public onJsPrompt(view: android.webkit.WebView, url: string, message: string, defaultValue: string, result: android.webkit.JsPromptResult): boolean {
            const owner = this.owner.get();
            if (!owner) {
                return false;
            }

            let gotResponse = false;
            return owner._webPrompt(message, defaultValue, (message: string) => {
                if (!gotResponse) {
                    if (message) {
                        result.confirm(message);
                    } else {
                        result.confirm();
                    }
                }

                gotResponse = true;
            });
        }

        public onConsoleMessage(...args: any): boolean {
            if (arguments.length !== 1) {
                return false;
            }

            const owner = this.owner.get();
            if (!owner) {
                return false;
            }

            const consoleMessage = args[0] as android.webkit.ConsoleMessage;

            if (consoleMessage instanceof android.webkit.ConsoleMessage) {
                const message = consoleMessage.message();
                const lineNo = consoleMessage.lineNumber();
                let level = "log";
                const { DEBUG, LOG, WARNING } = android.webkit.ConsoleMessage.MessageLevel;
                switch (consoleMessage.messageLevel()) {
                    case DEBUG: {
                        level = "debug";
                        break;
                    }
                    case LOG: {
                        level = "log";
                        break;
                    }
                    case WARNING: {
                        level = "warn";
                        break;
                    }
                }

                owner.notify({
                    eventName: "webConsole",
                    data: {
                        lineNo,
                        message,
                        level,
                    },
                } as any);
            }

            return false;
        }
    }

    WebChromeViewExtClient = WebChromeViewExtClientImpl;

    class WebViewBridgeInterfaceImpl extends dk.nota.webviewinterface.WebViewBridgeInterface {
        private owner: WeakRef<WebViewExt>;
        constructor(owner: WebViewExt) {
            super();

            this.owner = new WeakRef(owner);
            return global.__native(this);
        }

        public emitEventToNativeScript(eventName: string, data: string) {
            const owner = this.owner.get();
            if (!owner) {
                console.warn("WebViewExtClientImpl.onReceivedErrorBeforeAPI23(...) - no owner");
                return;
            }

            try {
                owner.onWebViewEvent(eventName, JSON.parse(data));
                return;
            } catch {}
            owner.onWebViewEvent(eventName, data);
        }
    }

    WebViewBridgeInterface = WebViewBridgeInterfaceImpl;
}
//#endregion android_native_classes

let instanceNo = 0;
export class WebViewExt extends WebViewExtBase {
    public nativeViewProtected: AndroidWebView | void;

    protected readonly localResourceMap = new Map<string, string>();

    public get isUIWebView() {
        return false;
    }

    public get isWKWebView() {
        return false;
    }

    public readonly instance = ++instanceNo;

    public android: android.webkit.WebView;

    public createNativeView() {
        const nativeView = new android.webkit.WebView(this._context) as AndroidWebView;
        const settings = nativeView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setBuiltInZoomControls(true);

        // Needed for XHRRequests
        settings.setAllowUniversalAccessFromFileURLs(true);
        return nativeView;
    }

    public initNativeView() {
        super.initNativeView();
        initializeWebViewClient();
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }

        const client = new WebViewExtClient(this);
        nativeView.setWebViewClient(client);
        nativeView.setWebChromeClient(new WebChromeViewExtClient(this));
        nativeView.client = client;

        const bridgeInterface = new WebViewBridgeInterface(this);
        nativeView.addJavascriptInterface(bridgeInterface, "androidWebViewBridge");
        nativeView.bridgeInterface = bridgeInterface;
    }

    public disposeNativeView() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            nativeView.destroy();
        }

        super.disposeNativeView();
    }

    public _loadUrl(src: string) {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }

        this.writeTrace(`WebViewExt<android>._loadUrl("${src}")`);
        nativeView.loadUrl(src);
    }

    public _loadData(src: string) {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }

        const baseUrl = `file:///${fs.knownFolders.currentApp().path}/`;
        this.writeTrace(`WebViewExt<android>._loadData("${src}") -> baseUrl: "${baseUrl}"`);
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
            this.writeTrace(`WebViewExt<android>.registerLocalResource("${resourceName}", "${path}") -> file doesn't exist`, traceMessageType.error);
            return;
        }

        this.writeTrace(`WebViewExt<android>.registerLocalResource("${resourceName}", "${path}") -> file: "${filepath}"`);

        this.localResourceMap.set(resourceName, filepath);
    }

    public unregisterLocalResource(resourceName: string) {
        this.writeTrace(`WebViewExt<android>.unregisterLocalResource("${resourceName}")`);
        resourceName = this.fixLocalResourceName(resourceName);

        this.localResourceMap.delete(resourceName);
    }

    public getRegisteredLocalResource(resourceName: string) {
        resourceName = this.fixLocalResourceName(resourceName);

        const result = this.localResourceMap.get(resourceName);

        this.writeTrace(`WebViewExt<android>.getRegisteredLocalResource("${resourceName}") => "${result}"`);

        return result;
    }

    /**
     * Always load the Fetch-polyfill on Android.
     *
     * Native 'Fetch API' on Android rejects all request for resources no HTTP or HTTPS.
     * This breaks x-local:// requests (and file://).
     */
    public async ensureFetchSupport() {
        this.writeTrace("WebViewExt<android>.ensureFetchSupport() - Override 'Fetch API' to support x-local.");

        // The polyfill is not loaded if fetch already exists, start by null'ing it.
        await this.executeJavaScript(
            `
            try {
                window.fetch = null;
            } catch (err) {
                console.error("null'ing Native Fetch API failed:", err);
            }
        `,
        );

        await this.loadFetchPolyfill();
    }

    public async executeJavaScript<T>(scriptCode: string): Promise<T> {
        if (androidSDK < 19) {
            this.writeTrace(`WebViewExt<android>.executeJavaScript() -> SDK:${androidSDK} not supported`, traceMessageType.error);
            return Promise.reject(new UnsupportedSDKError(19));
        }

        const result = await new Promise<T>((resolve, reject) => {
            if (!this.nativeViewProtected) {
                this.writeTrace(`WebViewExt<android>.executeJavaScript() -> no nativeView?`, traceMessageType.error);
                reject(new Error("Native Android not initialized, cannot call executeJavaScript"));
                return;
            }

            this.nativeViewProtected.evaluateJavascript(
                scriptCode,
                new android.webkit.ValueCallback({
                    onReceiveValue(result: any) {
                        resolve(result);
                    },
                }),
            );
        });

        return await this.parseWebViewJavascriptResult(result);
    }

    public async getTitle() {
        return this.nativeViewProtected && this.nativeViewProtected.getTitle();
    }

    public zoomIn() {
        if (!this.nativeViewProtected) {
            return false;
        }
        return this.nativeViewProtected.zoomIn();
    }

    public zoomOut() {
        if (!this.nativeViewProtected) {
            return false;
        }
        return this.nativeViewProtected.zoomOut();
    }

    public zoomBy(zoomFactor: number) {
        if (androidSDK < 21) {
            this.writeTrace(`WebViewExt<android>.zoomBy - not supported on this SDK`);
            return;
        }

        if (!this.nativeViewProtected) {
            return;
        }

        if (zoomFactor >= 0.01 && zoomFactor <= 100) {
            return (this.nativeViewProtected as any).zoomBy(zoomFactor);
        }

        throw new Error(`ZoomBy only accepts values between 0.01 and 100 both inclusive`);
    }

    [debugModeProperty.getDefault]() {
        return false;
    }

    [debugModeProperty.setNative](enabled: boolean) {
        (android.webkit.WebView as any).setWebContentsDebuggingEnabled(!!enabled);
    }

    [builtInZoomControlsProperty.getDefault]() {
        if (!this.nativeViewProtected) {
            return false;
        }

        const settings = this.nativeViewProtected.getSettings();
        return settings.getBuiltInZoomControls();
    }

    [builtInZoomControlsProperty.setNative](enabled: boolean) {
        if (!this.nativeViewProtected) {
            return;
        }
        const settings = this.nativeViewProtected.getSettings();
        settings.setBuiltInZoomControls(!!enabled);
    }

    [displayZoomControlsProperty.getDefault]() {
        if (!this.nativeViewProtected) {
            return false;
        }
        const settings = this.nativeViewProtected.getSettings();
        return settings.getDisplayZoomControls();
    }

    [displayZoomControlsProperty.setNative](enabled: boolean) {
        if (!this.nativeViewProtected) {
            return;
        }
        const settings = this.nativeViewProtected.getSettings();
        settings.setDisplayZoomControls(!!enabled);
    }

    [cacheModeProperty.getDefault](): CacheMode {
        if (!this.nativeViewProtected) {
            return null;
        }

        const settings = this.nativeViewProtected.getSettings();
        const cacheModeInt = settings.getCacheMode();
        for (const [key, value] of cacheModeMap) {
            if (value === cacheModeInt) {
                return key;
            }
        }

        return null;
    }

    [cacheModeProperty.setNative](cacheMode: CacheMode) {
        if (!this.nativeViewProtected) {
            return;
        }

        const settings = this.nativeViewProtected.getSettings();
        for (const [key, nativeValue] of cacheModeMap) {
            if (key === cacheMode) {
                settings.setCacheMode(nativeValue);
                return;
            }
        }
    }

    [databaseStorageProperty.getDefault]() {
        if (!this.nativeViewProtected) {
            return false;
        }

        const settings = this.nativeViewProtected.getSettings();
        return settings.getDatabaseEnabled();
    }

    [databaseStorageProperty.setNative](enabled: boolean) {
        if (!this.nativeViewProtected) {
            return;
        }

        const settings = this.nativeViewProtected.getSettings();
        settings.setDatabaseEnabled(!!enabled);
    }

    [domStorageProperty.getDefault]() {
        if (!this.nativeViewProtected) {
            return false;
        }

        const settings = this.nativeViewProtected.getSettings();
        return settings.getDomStorageEnabled();
    }

    [domStorageProperty.setNative](enabled: boolean) {
        if (!this.nativeViewProtected) {
            return;
        }

        const settings = this.nativeViewProtected.getSettings();
        settings.setDomStorageEnabled(!!enabled);
    }

    [supportZoomProperty.getDefault]() {
        if (!this.nativeViewProtected) {
            return false;
        }

        const settings = this.nativeViewProtected.getSettings();
        return settings.supportZoom();
    }

    [supportZoomProperty.setNative](enabled: boolean) {
        if (!this.nativeViewProtected) {
            return;
        }

        const settings = this.nativeViewProtected.getSettings();
        settings.setSupportZoom(!!enabled);
    }
}
