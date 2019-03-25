import * as fs from "tns-core-modules/file-system";
import * as platform from "tns-core-modules/platform";
import { booleanConverter, ContainerView, CSSType, EventData, Property, traceEnabled, traceMessageType, traceWrite } from "tns-core-modules/ui/core/view";
import { fetchPolyfill, promisePolyfill, webViewBridge } from "./nativescript-webview-bridge-loader";

export * from "tns-core-modules/ui//core/view";

declare const CustomUrlSchemeHandler: any;

const { isAndroid, isIOS } = platform;

export type CacheMode = "default" | "cache_first" | "no_cache" | "cache_only" | "normal";

export const androidSDK = isAndroid && Number(platform.device.sdkVersion);
export const useWKWebView = isIOS && typeof CustomUrlSchemeHandler !== "undefined";

export const autoInjectJSBridgeProperty = new Property<WebViewExtBase, boolean>({
    name: "autoInjectJSBridge",
    defaultValue: true,
    valueConverter: booleanConverter,
});
export const builtInZoomControlsProperty = new Property<WebViewExtBase, boolean>({
    name: "builtInZoomControls",
    defaultValue: true,
    valueConverter: booleanConverter,
});
export const cacheModeProperty = new Property<WebViewExtBase, CacheMode>({
    name: "cacheMode",
    defaultValue: "default",
});
export const databaseStorageProperty = new Property<WebViewExtBase, boolean>({
    name: "databaseStorage",
    defaultValue: false,
    valueConverter: booleanConverter,
});
export const domStorageProperty = new Property<WebViewExtBase, boolean>({
    name: "domStorage",
    defaultValue: false,
    valueConverter: booleanConverter,
});
export const debugModeProperty = new Property<WebViewExtBase, boolean>({
    name: "debugMode",
    defaultValue: false,
    valueConverter: booleanConverter,
});
export const displayZoomControlsProperty = new Property<WebViewExtBase, boolean>({
    name: "displayZoomControls",
    defaultValue: true,
    valueConverter: booleanConverter,
});
export const supportZoomProperty = new Property<WebViewExtBase, boolean>({
    name: "supportZoom",
    defaultValue: false,
    valueConverter: booleanConverter,
});
export const srcProperty = new Property<WebViewExtBase, string>({
    name: "src",
});
export const scrollBounceProperty = new Property<WebViewExtBase, boolean>({
    name: "scrollBounce",
    defaultValue: true,
    valueConverter: booleanConverter,
});

export enum EventNames {
    LoadFinished = "loadFinished",
    LoadStarted = "loadStarted",
    ShouldOverrideUrlLoading = "shouldOverrideUrlLoading",
    LoadProgress = "loadProgress",
    TitleChanged = "titleChange",
    WebAlert = "webAlert",
    WebConfirm = "webConfirm",
    WebPrompt = "webPrompt",
    WebConsole = "webConsole",
}

export interface LoadJavaScriptResource {
    resourceName: string;
    filepath: string;
}

export interface LoadStyleSheetResource {
    resourceName: string;
    filepath: string;
    insertBefore?: boolean;
}

export interface InjectExecuteJavaScript {
    scriptCode: string;
    name: string;
}

/**
 * Event data containing information for the loading events of a WebView.
 */
export interface LoadEventData extends EventData {
    object: WebViewExtBase;

    /**
     * Gets the url of the web-view.
     */
    url: string;

    /**
     * Gets the navigation type of the web-view.
     */
    navigationType?: NavigationType;

    /**
     * Gets the error (if any).
     */
    error?: string;
}

export interface LoadStartedEventData extends LoadEventData {
    eventName: EventNames.LoadStarted;
}

export interface LoadFinishedEventData extends LoadEventData {
    eventName: EventNames.LoadFinished;
}

export interface ShouldOverrideUrlLoadEventData extends LoadEventData {
    eventName: EventNames.ShouldOverrideUrlLoading;

    httpMethod: string;

    /** Flip this to true in your callback, if you want to cancel the url-loading */
    cancel?: boolean;
}

/** BackForward compat for spelling error... */
export interface ShouldOverideUrlLoadEventData extends ShouldOverrideUrlLoadEventData {}

export interface LoadProgressEventData extends EventData {
    object: WebViewExtBase;
    eventName: EventNames.LoadProgress;
    url: string;
    progress: number;
}

export interface TitleChangedEventData extends EventData {
    object: WebViewExtBase;
    eventName: EventNames.LoadProgress;
    url: string;
    title: string;
}

export interface WebAlertEventData extends EventData {
    object: WebViewExtBase;
    eventName: EventNames.WebAlert;
    url: string;
    message: string;
    callback: () => void;
}

export interface WebPromptEventData extends EventData {
    object: WebViewExtBase;
    eventName: EventNames.WebPrompt;
    url: string;
    message: string;
    defaultText?: string;
    callback: (response?: string) => void;
}

export interface WebConfirmEventData extends EventData {
    object: WebViewExtBase;
    eventName: EventNames.WebConfirm;
    url: string;
    message: string;
    callback: (response: boolean) => void;
}

export interface WebConsoleEventData extends EventData {
    object: WebViewExtBase;
    eventName: EventNames.WebConsole;
    url: string;
    data: {
        lineNo: number;
        message: string;
        level: string;
    };
}

/**
 * Event data containing information for the loading events of a WebView.
 */
export interface WebViewEventData extends EventData {
    object: WebViewExtBase;

    data?: any;
}

/**
 * Represents navigation type
 */
export type NavigationType = "linkClicked" | "formSubmitted" | "backForward" | "reload" | "formResubmitted" | "other" | void;

export class UnsupportedSDKError extends Error {
    constructor(minSdk: number) {
        super(`Android API < ${minSdk} not supported`);

        Object.setPrototypeOf(this, UnsupportedSDKError.prototype);
    }
}

@CSSType("WebView")
export class WebViewExtBase extends ContainerView {
    /**
     * Is Fetch API supported?
     *
     * Note: Android's Native Fetch API needs to be replaced with the polyfill.
     */
    public static isFetchSupported: boolean;

    /**
     * Does this platform's WebView support promises?
     */
    public static isPromiseSupported: boolean;

    /**
     * Gets the native [android widget](http://developer.android.com/reference/android/webkit/WebView.html) that represents the user interface for this component. Valid only when running on Android OS.
     */
    public android: any /* android.webkit.WebView */;

    /**
     * Gets the native [WKWebView](https://developer.apple.com/documentation/webkit/wkwebview/) that represents the user interface for this component. Valid only when running on iOS 11+.
     * Gets the native [UIWebView]https://developer.apple.com/documentation/uikit/uiwebview that represents the user interface for this component. Valid only when running on iOS <11
     */
    public ios: any /* WKWebView | UIWebView */;

    public get interceptScheme() {
        return "x-local";
    }

    /**
     * String value used when hooking to loadStarted event.
     */
    public static get loadStartedEvent() {
        return EventNames.LoadStarted;
    }

    /**
     * String value used when hooking to loadFinished event.
     */
    public static get loadFinishedEvent() {
        return EventNames.LoadFinished;
    }

    /** String value used when hooking to shouldOverrideUrlLoading event */
    public static get shouldOverrideUrlLoadingEvent() {
        return EventNames.ShouldOverrideUrlLoading;
    }

    public static get loadProgressEvent() {
        return EventNames.LoadProgress;
    }

    public static get titleChangedEvent() {
        return EventNames.TitleChanged;
    }
    public static get webAlertEvent() {
        return EventNames.WebAlert;
    }
    public static get webConfirmEvent() {
        return EventNames.WebConfirm;
    }
    public static get webPromptEvent() {
        return EventNames.WebPrompt;
    }
    public static get webConsoleEvent() {
        return EventNames.WebConsole;
    }

    /**
     * iOS <11 uses an UIWebview
     */
    public readonly isUIWebView: boolean;

    /**
     * iOS 11+ uses a WKWebView
     */
    public readonly isWKWebView: boolean;

    /**
     * Gets or sets the url, local file path or HTML string.
     */
    public src: string;

    /**
     * Auto Inject WebView JavaScript Bridge on load finished? Defaults to true.
     */
    public autoInjectJSBridge = true;

    /**
     * Android: Enable/disable debug-mode
     */
    public debugMode: boolean;

    /**
     * Android: Is the built-in zoom mechanisms being used
     */
    public builtInZoomControls: boolean;

    /**
     * Android: displays on-screen zoom controls when using the built-in zoom mechanisms
     */
    public displayZoomControls: boolean;

    /**
     * Android: Enable/Disabled database storage API.
     * Note: It affects all webviews in the process.
     */
    public databaseStorage: boolean;

    /**
     * Android: Enable/Disabled DOM Storage API. E.g localStorage
     */
    public domStorage: boolean;

    /**
     * Android: should the webview support zoom
     */
    public supportZoom: boolean;

    /**
     * iOS: Should the scrollView bounce? Defaults to true.
     */
    public scrollBounce: boolean;

    public cacheMode: "default" | "no_cache" | "cache_first" | "cache_only";

    /**
     * List of js-files to be auto injected on load finished
     */
    protected autoInjectScriptFiles = [] as LoadJavaScriptResource[];

    /**
     * List of css-files to be auto injected on load finished
     */
    protected autoInjectStyleSheetFiles = [] as LoadStyleSheetResource[];

    /**
     * List of code blocks to be executed after JS-files and CSS-files have been loaded.
     */
    protected autoInjectJavaScriptBlocks = [] as InjectExecuteJavaScript[];

    /**
     * Prevent this.src loading changes from the webview's onLoadFinished-event
     */
    protected tempSuspendSrcLoading = false;

    /**
     * Callback for the loadFinished-event. Called from the native-webview
     */
    public async _onLoadFinished(url: string, error?: string): Promise<LoadFinishedEventData> {
        if (!error) {
            // When this is called without an error, update with this.src value without loading the url.
            // This is needed to keep src up-to-date when linked are clicked inside the webview.
            try {
                this.tempSuspendSrcLoading = true;
                this.src = url;
                this.tempSuspendSrcLoading = false;
            } finally {
                this.tempSuspendSrcLoading = false;
            }
        }

        let args = {
            error,
            eventName: WebViewExtBase.loadFinishedEvent,
            navigationType: undefined,
            object: this,
            url,
        } as LoadFinishedEventData;

        if (error) {
            this.notify(args);
            return Promise.reject(args);
        }

        this.writeTrace(`WebViewExt._onLoadFinished("${url}", ${error || void 0}) - > Injecting webview-bridge JS code`);

        if (!this.autoInjectJSBridge) {
            return Promise.resolve(args);
        }

        try {
            await this.injectWebViewBridge();

            await this.loadJavaScriptFiles(this.autoInjectScriptFiles);
            await this.loadStyleSheetFiles(this.autoInjectStyleSheetFiles);
            await this.executePromises(this.autoInjectJavaScriptBlocks.map((data) => data.scriptCode), -1);
        } catch (error) {
            args.error = error;
        }

        this.notify(args);

        this.getTitle().then((title) => this._titleChanged(title));
        return args;
    }

    /**
     * Callback for onLoadStarted-event from the native webview
     *
     * @param url URL being loaded
     * @param navigationType Type of navigation (iOS-only)
     */
    public _onLoadStarted(url: string, navigationType?: NavigationType) {
        const args = {
            eventName: WebViewExtBase.loadStartedEvent,
            navigationType,
            object: this,
            url,
        } as LoadStartedEventData;

        this.notify(args);
    }

    /**
     * Callback for should override url loading.
     * Called from the native-webview
     *
     * @param url
     * @param httpMethod GET, POST etc
     * @param navigationType Type of navigation (iOS-only)
     */
    public _onShouldOverrideUrlLoading(url: string, httpMethod: string, navigationType?: NavigationType) {
        const args = {
            eventName: WebViewExtBase.shouldOverrideUrlLoadingEvent,
            httpMethod,
            navigationType,
            object: this,
            url,
        } as ShouldOverrideUrlLoadEventData;

        this.notify(args);

        const eventNameWithSpellingError = "shouldOverideUrlLoading";
        if (this.hasListeners(eventNameWithSpellingError)) {
            console.error(
                `eventName '${eventNameWithSpellingError}' is deprecated due to spelling error:\nPlease use: ${WebViewExtBase.shouldOverrideUrlLoadingEvent}`,
            );
            const argsWithSpellingError = {
                ...args,
                eventName: eventNameWithSpellingError,
            };

            this.notify(argsWithSpellingError);
            if (argsWithSpellingError.cancel) {
                return argsWithSpellingError.cancel;
            }
        }

        return args.cancel;
    }

    public _loadProgress(progress: number) {
        const args = {
            eventName: WebViewExtBase.loadProgressEvent,
            object: this,
            progress,
            url: this.src,
        } as LoadProgressEventData;

        this.notify(args);
    }

    public _titleChanged(title: string) {
        const args = {
            eventName: WebViewExtBase.loadProgressEvent,
            object: this,
            title,
            url: this.src,
        } as TitleChangedEventData;

        this.notify(args);
    }

    public _webAlert(message: string, callback: () => void) {
        if (!this.hasListeners(WebViewExtBase.webAlertEvent)) {
            return false;
        }

        const args = {
            eventName: WebViewExtBase.webAlertEvent,
            object: this,
            message,
            url: this.src,
            callback,
        } as WebAlertEventData;

        this.notify(args);
        return true;
    }

    public _webConfirm(message: string, callback: (response: boolean) => void) {
        if (!this.hasListeners(WebViewExtBase.webConfirmEvent)) {
            return false;
        }

        const args = {
            eventName: WebViewExtBase.webConfirmEvent,
            object: this,
            message,
            url: this.src,
            callback,
        } as WebConfirmEventData;

        this.notify(args);
        return true;
    }

    public _webPrompt(message: string, defaultText: string, callback: (response: string) => void) {
        if (!this.hasListeners(WebViewExtBase.webPromptEvent)) {
            return false;
        }

        const args = {
            eventName: WebViewExtBase.webPromptEvent,
            object: this,
            message,
            defaultText,
            url: this.src,
            callback,
        } as WebPromptEventData;

        this.notify(args);
        return true;
    }

    public _webConsole(message: string, lineNo: number, level: string) {
        if (!this.hasListeners(WebViewExtBase.webConsoleEvent)) {
            return false;
        }

        const args = {
            eventName: WebViewExtBase.webConsoleEvent,
            object: this,
            data: {
                message,
                lineNo,
                level,
            },
            url: this.src,
        } as WebConsoleEventData;

        this.notify(args);
        return true;
    }

    /**
     * Platform specific loadURL-implementation.
     */
    public _loadUrl(src: string): void {
        throw new Error("Method not implemented.");
    }

    /**
     * Platform specific loadData-implementation.
     */
    public _loadData(src: string): void {
        throw new Error("Method not implemented.");
    }

    /**
     * Stops loading the current content (if any).
     */
    public stopLoading() {
        throw new Error("Method not implemented.");
    }

    /**
     * Gets a value indicating whether the WebView can navigate back.
     */
    public get canGoBack(): boolean {
        throw new Error("This member is abstract.");
    }

    /**
     * Gets a value indicating whether the WebView can navigate forward.
     */
    public get canGoForward(): boolean {
        throw new Error("This member is abstract.");
    }

    /**
     * Navigates back.
     */
    public goBack() {
        throw new Error("Method not implemented.");
    }

    /**
     * Navigates forward.
     */
    public goForward() {
        throw new Error("Method not implemented.");
    }

    /**
     * Reloads the current url.
     */
    public reload() {
        throw new Error("Method not implemented.");
    }

    [srcProperty.getDefault](): string {
        return "";
    }

    [srcProperty.setNative](src: string) {
        if (!src || this.tempSuspendSrcLoading) {
            return;
        }
        const originSrc = src;

        this.stopLoading();

        // Add file:/// prefix for local files.
        // They should be loaded with _loadUrl() method as it handles query params.
        if (src.startsWith("~/")) {
            src = `file://${fs.knownFolders.currentApp().path}/${src.substr(2)}`;
            this.writeTrace(`WebViewExt.src = "${originSrc}" startsWith ~/ resolved to "${src}"`);
        } else if (src.startsWith("/")) {
            src = `file://${src}`;
            this.writeTrace(`WebViewExt.src = "${originSrc}" startsWith "/" resolved to ${src}`);
        }

        const lcSrc = src.toLowerCase();

        // loading local files from paths with spaces may fail
        if (lcSrc.startsWith("file:///")) {
            src = encodeURI(src);
            if (lcSrc !== src) {
                this.writeTrace(`WebViewExt.src = "${originSrc}" escaped to "${src}"`);
            }
        }

        if (lcSrc.startsWith(this.interceptScheme) || lcSrc.startsWith("http://") || lcSrc.startsWith("https://") || lcSrc.startsWith("file:///")) {
            this._loadUrl(src);

            this.writeTrace(`WebViewExt.src = "${originSrc}" - LoadUrl("${src}")`);
        } else {
            this._loadData(src);
            this.writeTrace(`WebViewExt.src = "${originSrc}" - LoadData("${src}")`);
        }
    }

    public resolveLocalResourceFilePath(filepath: string): string | void {
        if (!filepath) {
            this.writeTrace("WebViewExt.resolveLocalResourceFilePath() no filepath", traceMessageType.error);
            return;
        }

        if (filepath.startsWith("~")) {
            filepath = fs.path.normalize(fs.knownFolders.currentApp().path + filepath.substr(1));
        }

        if (filepath.startsWith("file://")) {
            filepath = filepath.replace(/^file:\/\//, "");
        }

        if (!fs.File.exists(filepath)) {
            this.writeTrace(`WebViewExt.resolveLocalResourceFilePath("${filepath}") - no such file`, traceMessageType.error);
            return;
        }

        return filepath;
    }

    /**
     * Register a local resource.
     * This resource can be loaded via "x-local://{name}" inside the webview
     */
    public registerLocalResource(name: string, filepath: string): void {
        throw new Error("Method not implemented.");
    }

    /**
     * Unregister a local resource.
     */
    public unregisterLocalResource(name: string): void {
        throw new Error("Method not implemented.");
    }

    /**
     * Resolve a "x-local://{name}" to file-path.
     */
    public getRegisteredLocalResource(name: string): string {
        throw new Error("Method not implemented.");
    }

    /**
     * Load URL - Wait for promise
     *
     * @param {string} src
     * @returns {Promise<LoadFinishedEventData>}
     */
    public loadUrl(src: string): Promise<LoadFinishedEventData> {
        if (!src) {
            return this._onLoadFinished(src, "empty src");
        }

        return new Promise<LoadFinishedEventData>((resolve, reject) => {
            const loadFinishedEvent = (args: LoadFinishedEventData) => {
                this.off(WebViewExtBase.loadFinishedEvent, loadFinishedEvent);
                if (args.error) {
                    reject(args);
                } else {
                    resolve(args);
                }
            };

            this.on(WebViewExtBase.loadFinishedEvent, loadFinishedEvent);

            this.src = src;
        });
    }

    /**
     * Load a JavaScript file on the current page in the webview.
     */
    public loadJavaScriptFile(scriptName: string, filepath?: string) {
        return this.loadJavaScriptFiles([
            {
                resourceName: scriptName,
                filepath,
            },
        ]);
    }

    /**
     * Load multiple JavaScript-files on the current page in the webview.
     */
    public async loadJavaScriptFiles(files: LoadStyleSheetResource[]) {
        if (!files || !files.length) {
            return;
        }

        const promiseScriptCodes = [];

        for (const { resourceName, filepath } of files) {
            const fixedResourceName = this.fixLocalResourceName(resourceName);
            if (filepath) {
                this.registerLocalResource(fixedResourceName, filepath);
            }
            const href = `${this.interceptScheme}://${fixedResourceName}`;
            const scriptCode = this.generateLoadJavaScriptFileScriptCode(href);
            promiseScriptCodes.push(scriptCode);
            this.writeTrace(`WebViewExt.loadJavaScriptFiles() - > Loading javascript file: "${href}"`);
        }

        if (promiseScriptCodes.length !== files.length) {
            this.writeTrace(
                `WebViewExt.loadJavaScriptFiles() - > Num of generated scriptCodes ${promiseScriptCodes.length} differ from num files ${files.length}`,
                traceMessageType.error,
            );
        }

        if (!promiseScriptCodes.length) {
            this.writeTrace("WebViewExt.loadJavaScriptFiles() - > No files");
            return;
        }

        if (!promiseScriptCodes.length) {
            return;
        }

        await this.executePromises(promiseScriptCodes);
    }

    /**
     * Load a stylesheet file on the current page in the webview.
     */
    public loadStyleSheetFile(stylesheetName: string, filepath: string, insertBefore = true) {
        return this.loadStyleSheetFiles([
            {
                resourceName: stylesheetName,
                filepath,
                insertBefore,
            },
        ]);
    }

    /**
     * Load multiple stylesheet-files on the current page in the webview
     */
    public async loadStyleSheetFiles(files: LoadStyleSheetResource[]) {
        if (!files || !files.length) {
            return;
        }

        const promiseScriptCodes = [] as string[];

        for (const { resourceName, filepath, insertBefore } of files) {
            const fixedResourceName = this.fixLocalResourceName(resourceName);
            if (filepath) {
                this.registerLocalResource(fixedResourceName, filepath);
            }
            const href = `${this.interceptScheme}://${fixedResourceName}`;
            const scriptCode = this.generateLoadCSSFileScriptCode(href, insertBefore);

            promiseScriptCodes.push(scriptCode);

            this.writeTrace(`WebViewExt.loadStyleSheetFiles() - > Loading stylesheet file: ${href}`);
        }

        if (promiseScriptCodes.length !== files.length) {
            this.writeTrace(
                `WebViewExt.loadStyleSheetFiles() - > Num of generated scriptCodes ${promiseScriptCodes.length} differ from num files ${files.length}`,
                traceMessageType.error,
            );
        }

        if (!promiseScriptCodes.length) {
            this.writeTrace("WebViewExt.loadStyleSheetFiles() - > No files");
            return;
        }

        await this.executePromises(promiseScriptCodes);
    }

    /**
     * Auto-load a JavaScript-file after the page have been loaded.
     */
    public autoLoadJavaScriptFile(resourceName: string, filepath: string) {
        if (this.src) {
            this.loadJavaScriptFile(resourceName, filepath).catch(() => void 0);
        }

        this.autoInjectScriptFiles.push({ resourceName, filepath });
    }

    public removeAutoLoadJavaScriptFile(resourceName: string) {
        this.autoInjectScriptFiles = this.autoInjectScriptFiles.filter((data) => data.resourceName !== resourceName);
    }

    /**
     * Auto-load a stylesheet-file after the page have been loaded.
     */
    public autoLoadStyleSheetFile(resourceName: string, filepath: string, insertBefore?: boolean) {
        if (this.src) {
            this.loadStyleSheetFile(resourceName, filepath, insertBefore).catch(() => void 0);
        }

        this.autoInjectStyleSheetFiles.push({
            resourceName,
            filepath,
            insertBefore,
        });
    }

    public removeAutoLoadStyleSheetFile(resourceName: string) {
        this.autoInjectStyleSheetFiles = this.autoInjectStyleSheetFiles.filter((data) => data.resourceName !== resourceName);
    }

    public autoExecuteJavaScript(scriptCode: string, name: string) {
        if (this.src) {
            this.executePromise(scriptCode).catch(() => void 0);
        }

        this.removeAutoExecuteJavaScript(name);

        const fixedCodeBlock = scriptCode.trim();
        this.autoInjectJavaScriptBlocks.push({
            scriptCode: fixedCodeBlock,
            name,
        });
    }

    public removeAutoExecuteJavaScript(name: string) {
        this.autoInjectJavaScriptBlocks = this.autoInjectJavaScriptBlocks.filter((data) => data.name !== name);
    }

    /**
     * Ensure fetch-api is available.
     */
    protected async ensureFetchSupport(): Promise<void> {
        if (WebViewExtBase.isFetchSupported) {
            return Promise.resolve();
        }

        if (typeof WebViewExtBase.isFetchSupported === "undefined") {
            this.writeTrace("WebViewExtBase.ensureFetchSupport() - need to check for fetch support.");

            WebViewExtBase.isFetchSupported = await this.executeJavaScript<boolean>("typeof fetch !== 'undefined'");
        }

        if (WebViewExtBase.isFetchSupported) {
            this.writeTrace("WebViewExtBase.ensureFetchSupport() - fetch is supported - polyfill not needed.");
            return;
        }

        this.writeTrace("WebViewExtBase.ensureFetchSupport() - fetch is not supported - polyfill needed.");
        return await this.loadFetchPolyfill();
    }

    protected async loadFetchPolyfill() {
        const scriptCode = await fetchPolyfill;

        await this.executeJavaScript<void>(scriptCode, false);
    }

    /**
     * Older Android WebView don't support promises.
     * Inject the promise-polyfill if needed.
     */
    protected async ensurePromiseSupport() {
        if (androidSDK >= 21 || WebViewExtBase.isPromiseSupported) {
            return;
        }

        if (typeof WebViewExtBase.isPromiseSupported === "undefined") {
            this.writeTrace("WebViewExtBase.ensurePromiseSupport() - need to check for promise support.");

            WebViewExtBase.isPromiseSupported = await this.executeJavaScript<boolean>("typeof Promise !== 'undefined'");
        }

        if (WebViewExtBase.isPromiseSupported) {
            this.writeTrace("WebViewExtBase.ensurePromiseSupport() - promise is supported - polyfill not needed.");
            return;
        }

        this.writeTrace("WebViewExtBase.ensurePromiseSupport() - promise is not supported - polyfill needed.");
        await this.loadPromisePolyfill();
    }

    protected async loadPromisePolyfill() {
        const scriptCode = await promisePolyfill;
        await this.executeJavaScript<void>(scriptCode, false);
    }

    protected async ensurePolyfills() {
        await this.ensurePromiseSupport();
        await this.ensureFetchSupport();
    }

    /**
     * Execute JavaScript inside the webview.
     * The code should be wrapped inside an anonymous-function.
     * Larger scripts should be injected with loadJavaScriptFile.
     * NOTE: It's not possible to capture syntax errors on UIWebView.
     * NOTE: stringifyResult only applies on iOS.
     */
    public executeJavaScript<T>(scriptCode: string, stringifyResult?: boolean): Promise<T> {
        throw new Error("Method not implemented.");
    }

    /**
     * Execute a promise inside the webview and wait for it to resolve.
     * Note: The scriptCode must return a promise.
     */
    public async executePromise<T>(scriptCode: string, timeout = 2000): Promise<T> {
        const results = await this.executePromises<T>([scriptCode], timeout);

        return results && results[0];
    }

    public async executePromises<T>(scriptCodes: string[], timeout = 2000): Promise<T | void> {
        if (scriptCodes.length === 0) {
            return;
        }

        const reqId = `${Math.round(Math.random() * 1000)}`;
        const eventName = `tmp-promise-event-${reqId}`;

        const scriptHeader = `
            var promises = [];
            var p = Promise.resolve();
        `.trim();

        const scriptBody = [] as string[];

        // Execute the promises in order, one at a time.
        for (const scriptCode of scriptCodes) {
            // Wrapped in a Promise.then to delay executing scriptCode till the previous promise have finished
            scriptBody.push(
                `
                p = p.then(function() {
                    return ${scriptCode.trim()};
                });

                promises.push(p);
            `.trim(),
            );
        }

        const scriptFooter = `
            return Promise.all(promises);
        `.trim();

        const scriptCode = `(function() {
            ${scriptHeader}
            ${scriptBody.join(";")}
            ${scriptFooter}
        })()`.trim();

        const promiseScriptCode = `
            (function() {
                var eventName = ${JSON.stringify(eventName)};
                try {
                    var promise = (function() {return ${scriptCode}})();
                    window.nsWebViewBridge.executePromise(promise, eventName);
                } catch (err) {
                    window.nsWebViewBridge.emitError(err, eventName);
                }
            })();
        `.trim();

        return new Promise<T>((resolve, reject) => {
            let timer: any;
            const tmpPromiseEvent = (args: any) => {
                clearTimeout(timer);

                const { data, err } = args.data || ({} as any);

                // Was it a success? No 'err' received.
                if (typeof err === "undefined") {
                    resolve(data);
                    return;
                }

                // Rejected promise.
                if (err && typeof err === "object") {
                    // err is an object. Might be a serialized Error-object.
                    const error = new Error(err.message || err);
                    if (err.stack) {
                        // Add the web stack to the Error object.
                        (error as any).webStack = err.stack;
                    }

                    reject(error);
                    return;
                }

                reject(new Error(err));
            };

            this.once(eventName, tmpPromiseEvent);

            this.executeJavaScript(promiseScriptCode, false);

            if (timeout > 0) {
                timer = setTimeout(() => {
                    reject(new Error(`Timed out after: ${timeout}`));

                    this.off(eventName);
                }, timeout);
            }
        });
    }

    /**
     * Generate script code for loading javascript-file.
     */
    public generateLoadJavaScriptFileScriptCode(scriptHref: string) {
        return `window.nsWebViewBridge.injectJavaScriptFile(${JSON.stringify(scriptHref)});`;
    }

    /**
     * Generate script code for loading CSS-file.generateLoadCSSFileScriptCode
     */
    public generateLoadCSSFileScriptCode(stylesheetHref: string, insertBefore = false) {
        return `window.nsWebViewBridge.injectStyleSheetFile(${JSON.stringify(stylesheetHref)}, ${!!insertBefore});`;
    }

    /**
     * Inject WebView JavaScript Bridge.
     */
    protected async injectWebViewBridge(): Promise<void> {
        const scriptCode = await webViewBridge;
        await this.executeJavaScript(scriptCode, false);
        await this.ensurePolyfills();
    }

    /**
     * Convert response from WebView into usable JS-type.
     */
    protected parseWebViewJavascriptResult(result: any) {
        if (result === undefined) {
            return;
        }

        if (typeof result !== "string") {
            return result;
        }

        try {
            return JSON.parse(result);
        } catch (err) {
            return result;
        }
    }

    public writeTrace(message: string, type = traceMessageType.info) {
        if (traceEnabled()) {
            traceWrite(message, "NOTA", type);
        }
    }

    /**
     * Emit event into the webview.
     */
    public emitToWebView(eventName: string, data: any) {
        const scriptCode = `
            window.nsWebViewBridge && nsWebViewBridge.onNativeEvent(${JSON.stringify(eventName)}, ${JSON.stringify(data)});
        `;

        this.executeJavaScript(scriptCode, false);
    }

    /**
     * Called from delegate on webview event.
     * Triggered by: window.nsWebViewBridge.emit(eventName: string, data: any); inside the webview
     */
    public onWebViewEvent(eventName: string, data: any) {
        this.notify({
            eventName,
            object: this,
            data,
        });
    }

    /**
     * Get document.title
     * NOTE: On Android, if empty returns filename
     */
    public getTitle(): Promise<string> {
        throw new Error("Method not implemented.");
    }

    /**
     * Handles UIWebView events. Called from the delegate
     */
    public onUIWebViewEvent(url: string) {
        throw new Error("WebViewExt.onUIWebViewEvent() only available on iOS");
    }

    public zoomIn(): boolean {
        throw new Error("Method not implemented.");
    }

    public zoomOut(): boolean {
        throw new Error("Method not implemented.");
    }

    public zoomBy(zoomFactor: number) {
        throw new Error("Method not implemented.");
    }

    /**
     * Helper function, strips 'x-local://' from a resource name
     */
    public fixLocalResourceName(resourceName: string) {
        if (resourceName.startsWith(this.interceptScheme)) {
            return resourceName.substr(this.interceptScheme.length + 3);
        }

        return resourceName;
    }
}

export interface WebViewExtBase {
    /**
     * A basic method signature to hook an event listener (shortcut alias to the addEventListener method).
     * @param eventNames - String corresponding to events (e.g. "propertyChange"). Optionally could be used more events separated by `,` (e.g. "propertyChange", "change").
     * @param callback - Callback function which will be executed when event is raised.
     * @param thisArg - An optional parameter which will be used as `this` context for callback execution.
     */
    on(eventNames: string, callback: (data: WebViewEventData) => void, thisArg?: any);
    once(eventNames: string, callback: (data: WebViewEventData) => void, thisArg?: any);

    /**
     * Raised before the webview requests an URL.
     * Can be cancelled by settings args.cancel = true in your event handler.
     */
    on(event: EventNames.ShouldOverrideUrlLoading, callback: (args: ShouldOverrideUrlLoadEventData) => void, thisArg?: any);
    once(event: EventNames.ShouldOverrideUrlLoading, callback: (args: ShouldOverrideUrlLoadEventData) => void, thisArg?: any);

    /**
     * Raised when a loadStarted event occurs.
     */
    on(event: EventNames.LoadStarted, callback: (args: LoadStartedEventData) => void, thisArg?: any);
    once(event: EventNames.LoadStarted, callback: (args: LoadStartedEventData) => void, thisArg?: any);

    /**
     * Raised when a loadFinished event occurs.
     */
    on(event: EventNames.LoadFinished, callback: (args: LoadFinishedEventData) => void, thisArg?: any);
    once(event: EventNames.LoadFinished, callback: (args: LoadFinishedEventData) => void, thisArg?: any);

    /**
     * Raised when a loadProgress event occurs.
     */
    on(event: EventNames.LoadProgress, callback: (args: LoadProgressEventData) => void, thisArg?: any);
    once(event: EventNames.LoadProgress, callback: (args: LoadProgressEventData) => void, thisArg?: any);

    /**
     * Raised when a titleChanged event occurs.
     */
    on(event: EventNames.TitleChanged, callback: (args: TitleChangedEventData) => void, thisArg?: any);
    once(event: EventNames.TitleChanged, callback: (args: TitleChangedEventData) => void, thisArg?: any);

    /**
     * Override web alerts to replace them.
     * Call args.cancel() on close.
     * NOTE: Not supported on UIWebView
     */
    on(event: EventNames.WebAlert, callback: (args: WebAlertEventData) => void, thisArg?: any);
    once(event: EventNames.WebAlert, callback: (args: WebAlertEventData) => void, thisArg?: any);

    /**
     * Override web confirm dialogs to replace them.
     * Call args.cancel(res) on close.
     * NOTE: Not supported on UIWebView
     */
    on(event: EventNames.WebConfirm, callback: (args: WebConfirmEventData) => void, thisArg?: any);
    once(event: EventNames.WebConfirm, callback: (args: WebConfirmEventData) => void, thisArg?: any);

    /**
     * Override web confirm prompts to replace them.
     * Call args.cancel(res) on close.
     * NOTE: Not supported on UIWebView
     */
    on(event: EventNames.WebPrompt, callback: (args: WebPromptEventData) => void, thisArg?: any);
    once(event: EventNames.WebPrompt, callback: (args: WebPromptEventData) => void, thisArg?: any);

    /**
     * Get Android WebView console entries.
     */
    on(event: EventNames.WebConsole, callback: (args: WebConsoleEventData) => void, thisArg?: any);
    once(event: EventNames.WebConsole, callback: (args: WebConsoleEventData) => void, thisArg?: any);
}

autoInjectJSBridgeProperty.register(WebViewExtBase);
builtInZoomControlsProperty.register(WebViewExtBase);
cacheModeProperty.register(WebViewExtBase);
databaseStorageProperty.register(WebViewExtBase);
debugModeProperty.register(WebViewExtBase);
displayZoomControlsProperty.register(WebViewExtBase);
domStorageProperty.register(WebViewExtBase);
srcProperty.register(WebViewExtBase);
supportZoomProperty.register(WebViewExtBase);
scrollBounceProperty.register(WebViewExtBase);

/**
 * IOS uses a bridge class to map calls to UIWebView or WKWebView
 */
export interface IOSWebViewWrapper {
    owner: WeakRef<WebViewExtBase>;

    /**
     * Create Native View object
     */
    createNativeView(): any;

    /**
     * Init the native view.
     */
    initNativeView(): void;

    /**
     * Dispose the native view
     */
    disposeNativeView(): void;

    /**
     * Add Delegate on loaded event
     */
    onLoaded(): void;

    /**
     * Null the delegate on unloaded event.
     */
    onUnloaded(): void;

    // Resource APIs
    executeJavaScript(scriptCode: string): Promise<any>;
    registerLocalResourceForNative(resourceName: string, filepath: string): void;
    unregisterLocalResourceForNative(resourceName: string): void;
    getRegisteredLocalResourceFromNative(resourceName: string): string;
    autoLoadStyleSheetFile(resourceName: string, filepath: string, insertBefore?: boolean): void;
    removeAutoLoadStyleSheetFile(resourceName: string): void;
    autoLoadJavaScriptFile(resourceName: string, filepath: string): Promise<void>;
    removeAutoLoadJavaScriptFile(resourceName: string): void;

    // WebView calls and properties
    stopLoading(): void;
    loadUrl(url: string): void;
    loadData(content: string): void;
    readonly canGoBack: boolean;
    readonly canGoForward: boolean;
    goBack(): void;
    goForward(): void;
    reload(): void;

    readonly shouldInjectWebViewBridge: boolean;
    enableAutoInject(enable: boolean): void;
    scrollBounce: boolean;
}
