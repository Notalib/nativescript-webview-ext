/// <reference path="./types/android/webviewinterface.d.ts" />

import * as fs from "@nativescript/core/file-system";
import {
    builtInZoomControlsProperty,
    CacheMode,
    cacheModeProperty,
    databaseStorageProperty,
    debugModeProperty,
    displayZoomControlsProperty,
    domStorageProperty,
    isEnabledProperty,
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

//#region android_native_classes
let cacheModeMap: Map<CacheMode, number>;

export interface AndroidWebViewClient extends android.webkit.WebViewClient {}

export interface AndroidWebView extends android.webkit.WebView {
    client: AndroidWebViewClient | null;
    chromeClient: android.webkit.WebChromeClient | null;
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

        public shouldInterceptRequest(view: android.webkit.WebView, request: string | android.webkit.WebResourceRequest) {
            const owner = this.owner.get();
            if (!owner) {
                console.warn("WebViewExtClientImpl.shouldInterceptRequest(...) - no owner");

                return super.shouldInterceptRequest(view, request as android.webkit.WebResourceRequest);
            }

            let url: string | void;
            if (typeof request === "string") {
                url = request;
            } else if (typeof request === "object") {
                url = request.getUrl().toString();
            }

            if (typeof url !== "string") {
                owner.writeTrace(`WebViewClientClass.shouldInterceptRequest("${url}") - is not a string`);

                return super.shouldInterceptRequest(view, request as android.webkit.WebResourceRequest);
            }

            if (!url.startsWith(owner.interceptScheme)) {
                return super.shouldInterceptRequest(view, request as android.webkit.WebResourceRequest);
            }

            const filepath = owner.getRegisteredLocalResource(url);
            if (!filepath) {
                owner.writeTrace(`WebViewClientClass.shouldInterceptRequest("${url}") - no matching file`);

                return super.shouldInterceptRequest(view, request as android.webkit.WebResourceRequest);
            }

            if (!fs.File.exists(filepath)) {
                owner.writeTrace(`WebViewClientClass.shouldInterceptRequest("${url}") - file: "${filepath}" doesn't exists`);

                return super.shouldInterceptRequest(view, request as android.webkit.WebResourceRequest);
            }

            const tnsFile = fs.File.fromPath(filepath);

            const javaFile = new java.io.File(tnsFile.path);
            const stream = new java.io.FileInputStream(javaFile);
            const ext = tnsFile.extension.substr(1).toLowerCase();
            const mimeType = extToMimeType.get(ext) || "application/octet-stream";
            const encoding = extToBinaryEncoding.has(ext) || mimeType === "application/octet-stream" ? "binary" : "UTF-8";

            owner.writeTrace(`WebViewClientClass.shouldInterceptRequest("${url}") - file: "${filepath}" mimeType:${mimeType} encoding:${encoding}`);

            const response = new android.webkit.WebResourceResponse(mimeType, encoding, stream);
            if (android.os.Build.VERSION.SDK_INT < 21 || !response.getResponseHeaders) {
                return response;
            }

            let responseHeaders = response.getResponseHeaders();
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

        public onReceivedError(...args: any[]) {
            if (args.length === 4) {
                const [view, errorCode, description, failingUrl] = args as [android.webkit.WebView, number, string, string];
                this.onReceivedErrorBeforeAPI23(view, errorCode, description, failingUrl);
            } else {
                const [view, request, error] = args as [android.webkit.WebView, any, any];
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
        private showCustomViewCallback?: android.webkit.WebChromeClient.CustomViewCallback;

        constructor(owner: WebViewExt) {
            super();

            this.owner = new WeakRef(owner);

            return global.__native(this);
        }

        public onShowCustomView(view: AndroidWebView) {
            const owner = this.owner.get();
            if (!owner) {
                return;
            }

            let callback: android.webkit.WebChromeClient.CustomViewCallback;

            if (arguments.length === 3) {
                callback = arguments[2];
            } else if (arguments.length === 2) {
                callback = arguments[1];
            } else {
                return;
            }

            if (owner._onEnterFullscreen(() => this.hideCustomView())) {
                this.showCustomViewCallback = callback;
            } else {
                callback.onCustomViewHidden();
            }
        }

        private hideCustomView() {
            if (this.showCustomViewCallback) {
                this.showCustomViewCallback.onCustomViewHidden();
            }

            this.showCustomViewCallback = null;
        }

        public onHideCustomView() {
            this.showCustomViewCallback = null;

            const owner = this.owner.get();
            if (!owner) {
                return;
            }

            owner._onExitFullscreen();
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

        public onJsAlert(view: AndroidWebView, url: string, message: string, result: android.webkit.JsResult): boolean {
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

        public onJsConfirm(view: AndroidWebView, url: string, message: string, result: android.webkit.JsResult): boolean {
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

        public onJsPrompt(view: AndroidWebView, url: string, message: string, defaultValue: string, result: android.webkit.JsPromptResult): boolean {
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

        public onConsoleMessage(): boolean {
            if (arguments.length !== 1) {
                return false;
            }

            const owner = this.owner.get();
            if (!owner) {
                return false;
            }

            const consoleMessage = arguments[0] as android.webkit.ConsoleMessage;

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

                return owner._webConsole(message, lineNo, level);
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
                console.warn(`WebViewExtClientImpl.emitEventToNativeScript("${eventName}") - no owner`);

                return;
            }

            try {
                owner.onWebViewEvent(eventName, JSON.parse(data));

                return;
            } catch (err) {
                owner.writeTrace(`WebViewExtClientImpl.emitEventToNativeScript("${eventName}") - couldn't parse data: ${data} err: ${err}`);
            }

            owner.onWebViewEvent(eventName, data);
        }
    }

    WebViewBridgeInterface = WebViewBridgeInterfaceImpl;
}
//#endregion android_native_classes

let instanceNo = 0;
export class WebViewExt extends WebViewExtBase {
    public static get supportXLocalScheme() {
        return true;
    }

    public nativeViewProtected: AndroidWebView | void;

    protected readonly localResourceMap = new Map<string, string>();

    public get supportXLocalScheme() {
        return true;
    }

    public readonly instance = ++instanceNo;

    public android: AndroidWebView;

    public createNativeView() {
        const nativeView = new android.webkit.WebView(this._context) as AndroidWebView;
        const settings = nativeView.getSettings();

        // Needed for the bridge library
        settings.setJavaScriptEnabled(true);

        settings.setBuiltInZoomControls(!!this.builtInZoomControls);
        settings.setDisplayZoomControls(!!this.displayZoomControls);
        settings.setSupportZoom(!!this.supportZoom);

        if (android.os.Build.VERSION.SDK_INT >= 21) {
            // Needed for x-local in https-sites
            settings.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }

        // Needed for XHRRequests with x-local://
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
        const chromeClient = new WebChromeViewExtClient(this);
        nativeView.setWebViewClient(client);
        nativeView.client = client;

        nativeView.setWebChromeClient(chromeClient);
        nativeView.chromeClient = chromeClient;

        const bridgeInterface = new WebViewBridgeInterface(this);
        nativeView.addJavascriptInterface(bridgeInterface, "androidWebViewBridge");
        nativeView.bridgeInterface = bridgeInterface;
    }

    public disposeNativeView() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            nativeView.client = null;
            nativeView.chromeClient = null;
            nativeView.destroy();
        }

        super.disposeNativeView();
    }

    public async ensurePromiseSupport() {
        if (android.os.Build.VERSION.SDK_INT >= 21) {
            return;
        }

        return await super.ensurePromiseSupport();
    }

    public _loadUrl(src: string) {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }

        this.writeTrace(`WebViewExt<android>._loadUrl("${src}")`);
        nativeView.loadUrl(src);
        this.writeTrace(`WebViewExt<android>._loadUrl("${src}") - end`);
    }

    public _loadData(src: string) {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }

        const baseUrl = `file:///${fs.knownFolders.currentApp().path}/`;
        this.writeTrace(`WebViewExt<android>._loadData("${src}") -> baseUrl: "${baseUrl}"`);
        nativeView.loadDataWithBaseURL(baseUrl, src, "text/html", "utf-8", null!);
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
        if (android.os.Build.VERSION.SDK_INT < 19) {
            this.writeTrace(`WebViewExt<android>.executeJavaScript() -> SDK:${android.os.Build.VERSION.SDK_INT} not supported`, traceMessageType.error);

            return Promise.reject(new UnsupportedSDKError(19));
        }

        const result = await new Promise<T>((resolve, reject) => {
            const androidWebView = this.nativeViewProtected;
            if (!androidWebView) {
                this.writeTrace(`WebViewExt<android>.executeJavaScript() -> no nativeView?`, traceMessageType.error);
                reject(new Error("Native Android not initialized, cannot call executeJavaScript"));

                return;
            }

            androidWebView.evaluateJavascript(
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
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return false;
        }

        return androidWebView.zoomIn();
    }

    public zoomOut() {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return false;
        }

        return androidWebView.zoomOut();
    }

    public zoomBy(zoomFactor: number) {
        if (android.os.Build.VERSION.SDK_INT < 21) {
            this.writeTrace(`WebViewExt<android>.zoomBy - not supported on this SDK`);

            return;
        }

        if (!this.nativeViewProtected) {
            return;
        }

        if (zoomFactor >= 0.01 && zoomFactor <= 100) {
            return this.nativeViewProtected.zoomBy(zoomFactor);
        }

        throw new Error(`ZoomBy only accepts values between 0.01 and 100 both inclusive`);
    }

    [debugModeProperty.getDefault]() {
        return false;
    }

    [debugModeProperty.setNative](enabled: boolean) {
        android.webkit.WebView.setWebContentsDebuggingEnabled(!!enabled);
    }

    [builtInZoomControlsProperty.getDefault]() {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return false;
        }

        const settings = androidWebView.getSettings();

        return settings.getBuiltInZoomControls();
    }

    [builtInZoomControlsProperty.setNative](enabled: boolean) {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return;
        }
        const settings = androidWebView.getSettings();
        settings.setBuiltInZoomControls(!!enabled);
    }

    [displayZoomControlsProperty.getDefault]() {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return false;
        }

        const settings = androidWebView.getSettings();

        return settings.getDisplayZoomControls();
    }

    [displayZoomControlsProperty.setNative](enabled: boolean) {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return;
        }
        const settings = androidWebView.getSettings();
        settings.setDisplayZoomControls(!!enabled);
    }

    [cacheModeProperty.getDefault](): CacheMode | null {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return null;
        }

        const settings = androidWebView.getSettings();
        const cacheModeInt = settings.getCacheMode();
        for (const [key, value] of cacheModeMap) {
            if (value === cacheModeInt) {
                return key;
            }
        }

        return null;
    }

    [cacheModeProperty.setNative](cacheMode: CacheMode) {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return;
        }

        const settings = androidWebView.getSettings();
        for (const [key, nativeValue] of cacheModeMap) {
            if (key === cacheMode) {
                settings.setCacheMode(nativeValue);

                return;
            }
        }
    }

    [databaseStorageProperty.getDefault]() {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return false;
        }

        const settings = androidWebView.getSettings();

        return settings.getDatabaseEnabled();
    }

    [databaseStorageProperty.setNative](enabled: boolean) {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return;
        }

        const settings = androidWebView.getSettings();
        settings.setDatabaseEnabled(!!enabled);
    }

    [domStorageProperty.getDefault]() {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return false;
        }

        const settings = androidWebView.getSettings();

        return settings.getDomStorageEnabled();
    }

    [domStorageProperty.setNative](enabled: boolean) {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return;
        }

        const settings = androidWebView.getSettings();
        settings.setDomStorageEnabled(!!enabled);
    }

    [supportZoomProperty.getDefault]() {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return false;
        }

        const settings = androidWebView.getSettings();

        return settings.supportZoom();
    }

    [supportZoomProperty.setNative](enabled: boolean) {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return;
        }

        const settings = androidWebView.getSettings();
        settings.setSupportZoom(!!enabled);
    }

    [isEnabledProperty.setNative](enabled: boolean) {
        const androidWebView = this.nativeViewProtected;
        if (!androidWebView) {
            return;
        }

        if (enabled) {
            androidWebView.setOnTouchListener(null!);
        } else {
            androidWebView.setOnTouchListener(
                new android.view.View.OnTouchListener({
                    onTouch() {
                        return true;
                    },
                }),
            );
        }
    }
}
