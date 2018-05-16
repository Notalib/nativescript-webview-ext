import * as fs from "tns-core-modules/file-system";
import { EventData, Property, traceEnabled, traceMessageType, traceWrite, View, ViewBase } from "tns-core-modules/ui/core/view";
import { WebViewExt as WebViewExtDefinition } from "./";

import { webViewBridgeJsCodePromise } from "./nativescript-webview-bridge-loader";

export { File, knownFolders, path } from "tns-core-modules/file-system";
export * from "tns-core-modules/ui//core/view";

export const srcProperty = new Property<WebViewExtBase, string>({ name: "src" });
export const autoInjectJSBridgeProperty = new Property<WebViewExtBase, boolean>({ name: "autoInjectJSBridge", defaultValue: true });

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
    /**
     * Gets the url of the web-view.
     */
    url: string;

    /**
     * Gets the navigation type of the web-view.
     */
    navigationType: NavigationType;

    /**
     * Gets the error (if any).
     */
    error: string;
}

export interface LoadStartedEventData extends LoadEventData {
    eventName: 'loadStarted';
}

export interface LoadFinishedEventData extends LoadEventData {
    eventName: 'loadFinished';
}

/**
 * Event data containing information for the loading events of a WebView.
 */
export interface WebViewEventData extends EventData {
    data?: any;
}

/**
 * Represents navigation type
 */
export type NavigationType = "linkClicked" | "formSubmitted" | "backForward" | "reload" | "formResubmitted" | "other" | void;

/**
 * Callback function for override URL loading.
 * @param url - url to be loaded in the WebView
 * @return boolean - true to prevent url from being loaded.
 */
export type urlOverrideHandlerFn = (url: String) => boolean;

export class WebViewExtBase extends View {
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
        return 'x-local';
    }

    /**
     * String value used when hooking to loadStarted event.
     */
    public static readonly loadStartedEvent: 'loadStarted' = "loadStarted";

    /**
     * String value used when hooking to loadFinished event.
     */
    public static readonly loadFinishedEvent: 'loadFinished' = "loadFinished";

    /**
     * iOS <11 uses a UIWebview
     */
    public isUIWebView: boolean;

    /**
     * iOS 11+ uses an WKWebView
     */
    public isWKWebView: boolean;

    /**
     * Gets or sets the url, local file path or HTML string.
     */
    public src: string;

    /**
     * Auto Inject WebView JavaScript Bridge on load finished? Defaults to true.
     */
    public autoInjectJSBridge = true;

    /**
     * List of js-files to be auto injected on load finished
     */
    protected autoInjectScriptFiles = [] as LoadJavaScriptResource[];

    /**
     * List of css-files to be auto injected on load finished
     */
    protected autoInjectStyleSheetFiles = [] as LoadStyleSheetResource[];

    protected autoInjectJavaScriptBlocks = [] as InjectExecuteJavaScript[];

    protected _tmpStopLoading = false;

    public _onLoadFinished(url: string, error?: string): Promise<LoadFinishedEventData> {
        try {
            this._tmpStopLoading = true;
            this.src = url;
            this._tmpStopLoading = false;
        } finally {
            this._tmpStopLoading = false;
        }

        const args = <LoadFinishedEventData>{
            eventName: WebViewExtBase.loadFinishedEvent,
            object: this,
            url,
            navigationType: undefined,
            error,
        };

        if (error) {
            this.notify(args);
            return Promise.reject(args);
        } else {
            this.writeTrace(`WebViewExt._onLoadFinished("${url}", ${error || void 0}) - > Injecting webview-bridge JS code`);

            if (!this.autoInjectJSBridge) {
                return Promise.resolve(args);
            }

            return this.injectWebViewBridge()
                .catch((error) => {
                    return {...args, error};
                })
                .then(() => {
                    this.notify(args);
                    return args;
                });
        }
    }

    public _onLoadStarted(url: string, navigationType: NavigationType) {
        let args = <LoadStartedEventData>{
            eventName: WebViewExtBase.loadStartedEvent,
            object: this,
            url: url,
            navigationType: navigationType,
            error: undefined
        };

        this.notify(args);
    }

    public _loadUrl(src: string): void {
        throw new Error("Method not implemented.");
    }

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

    /**
     * Set callback function to overriding URL loading in the WebView. If the function returns true, the URL will not be loaded by the WebView.
     */
    public urlOverrideHandler: urlOverrideHandlerFn;

    [srcProperty.getDefault](): string {
        return "";
    }

    [srcProperty.setNative](src: string) {
        if (!src || this._tmpStopLoading) {
            return;
        }
        const originSrc = src;

        this.stopLoading();

        if (src.startsWith(this.interceptScheme)) {
            this.writeTrace(`WebViewExt.src = ${originSrc} resolve x-local file`);
            const fileparh = this.getRegistretLocalResource(src);
            if (fileparh) {
                src = `file://${fileparh}`;
                this.writeTrace(`WebViewExt.src = ${originSrc} x-local resolved to ${src}`);
            } else {
                this.writeTrace(`WebViewExt.src = ${originSrc} x-local couldn't resolve to file`, traceMessageType.error);
                this._onLoadFinished(src, 'unknown x-local-resource');
                return;
            }
        }

        // Add file:/// prefix for local files.
        // They should be loaded with _loadUrl() method as it handles query params.
        if (src.startsWith("~/")) {
            src = `file://${fs.knownFolders.currentApp().path}/${src.substr(2)}`;
            this.writeTrace(`WebViewExt.src = ${originSrc} startsWith ~/ resolved to ${src}`);
        } else if (src.startsWith("/")) {
            src = "file://" + src;
            this.writeTrace(`WebViewExt.src = ${originSrc} startsWith "/" resolved to ${src}`);
        }

        const lcSrc = src.toLowerCase();

        // loading local files from paths with spaces may fail
        if (lcSrc.startsWith("file:///")) {
            src = encodeURI(src);
            if (lcSrc !== src) {
                this.writeTrace(`WebViewExt.src = ${originSrc} escaped to ${src}`);
            }
        }

        if (lcSrc.startsWith("http://") ||
            lcSrc.startsWith("https://") ||
            lcSrc.startsWith("file:///")
        ) {
            this._loadUrl(src);

            this.writeTrace(`WebViewExt.src = ${originSrc} - LoadUrl(${src})}`);
        } else {
            this._loadData(src);
            this.writeTrace(`WebViewExt.src = ${originSrc} - LoadData(${src})}`);
        }
    }

    protected resolveLocalResourceFilePath(filepath: string): string | void {
        if (!filepath) {
            console.error('WebViewExt.resolveLocalResourceFilePath() no filepath');
            return;
        }

        if (filepath.startsWith('~')) {
            filepath = fs.path.normalize(fs.knownFolders.currentApp().path + filepath.substr(1));
        }

        if (!fs.File.exists(filepath)) {
            console.error(`WebViewExt.resolveLocalResourceFilePath("${filepath}") - no such file`);
            return;
        }

        return filepath;
    }

    /**
     * Register a local resource.
     * This resource can be loaded via "x-local://{name}" inside the webview
     */
    public registerLocalResource(name: string, filepath: string) {
        throw new Error("Method not implemented.");
    }

    /**
     * Unregister a local resource.
     */
    public unregisterLocalResource(name: string) {
        throw new Error("Method not implemented.");
    }

    public getRegistretLocalResource(name: string) {
        throw new Error("Method not implemented.");
    }

    /**
     * Load URL - Wait for promise
     *
     * @param {stirng} src
     * @returns {Promise<LoadFinishedEventData>}
     */
    public loadUrl(src: string): Promise<LoadFinishedEventData> {
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
        return this.loadJavaScriptFiles([{
            resourceName: scriptName,
            filepath,
        }]);
    }

    /**
     * Load multiple JavaScript-files on the current page in the webview.
     */
    public loadJavaScriptFiles(files: LoadStyleSheetResource[]) {
        if (!files || !files.length) {
            return Promise.resolve();
        }

        const promiseScriptCodes = [];

        for (let { resourceName, filepath } of files) {
            resourceName = this.fixLocalResourceName(resourceName);
            if (filepath) {
                this.registerLocalResource(resourceName, filepath);
            }
            const href = `${this.interceptScheme}://${resourceName}`;
            const scriptCode = this.generateLoadJavaScriptFileScriptCode(href);
            promiseScriptCodes.push(scriptCode);
            this.writeTrace(`WebViewExt.loadJavaScriptFiles() - > Loading javascript file: "${resourceName}"`);
        }

        if (promiseScriptCodes.length !== files.length) {
            this.writeTrace(`WebViewExt.loadJavaScriptFiles() - > Num of generated scriptCodes ${promiseScriptCodes.length} differ from num files ${files.length}`, traceMessageType.error);
        }

        if (!promiseScriptCodes.length) {
            this.writeTrace('WebViewExt.loadJavaScriptFiles() - > No files');
            return Promise.resolve();
        }

        if (!promiseScriptCodes.length) {
            return Promise.resolve();
        }

        return this.executePromises(promiseScriptCodes).then(() => void 0);
    }

    /**
     * Load a stylesheet file on the current page in the webview.
     */
    public loadStyleSheetFile(stylesheetName: string, filepath: string, insertBefore = true) {
        return this.loadStyleSheetFiles([{
            resourceName: stylesheetName,
            filepath,
            insertBefore,
        }]);
    }

    /**
     * Load multiple stylesheet-files on the current page in the webview
     */
    public loadStyleSheetFiles(files: LoadStyleSheetResource[]) {
        if (!files || !files.length) {
            return Promise.resolve();
        }

        const promiseScriptCodes = [] as string[];

        for (let { resourceName, filepath, insertBefore } of files) {
            resourceName = this.fixLocalResourceName(resourceName);
            if (filepath) {
                this.registerLocalResource(resourceName, filepath);
            }
            const href = `${this.interceptScheme}://${resourceName}`;
            const scriptCode = this.generaateLoadCSSFileScriptCode(href, insertBefore);

            promiseScriptCodes.push(scriptCode);

            this.writeTrace('WebViewExt.loadStyleSheetFiles() - > Loading stylesheet file: ' + href);
        }

        if (promiseScriptCodes.length !== files.length) {
            this.writeTrace(`WebViewExt.loadStyleSheetFiles() - > Num of generated scriptCodes ${promiseScriptCodes.length} differ from num files ${files.length}`, traceMessageType.error);
        }

        if (!promiseScriptCodes.length) {
            this.writeTrace('WebViewExt.loadStyleSheetFiles() - > No files');
            return Promise.resolve();
        }

        return this.executePromises(promiseScriptCodes).then(() => void 0);
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

        this.autoInjectStyleSheetFiles.push({ resourceName, filepath, insertBefore });
    }

    public removeAutoLoadStyleSheetFile(resourceName: string) {
        this.autoInjectStyleSheetFiles = this.autoInjectStyleSheetFiles.filter((data) => data.resourceName !== resourceName);
    }

    public autoExecuteJavaScript(scriptCode: string, name: string) {
        if (this.src) {
            this.executePromise(scriptCode).catch(() => void 0);
        }

        const fixedCodeBlock = `(function() { return ${scriptCode.trim()} })()`;
        this.autoInjectJavaScriptBlocks.push({ scriptCode, name });
    }

    public removeAutoExecuteJavaScript(name: string) {
        this.autoInjectJavaScriptBlocks = this.autoInjectJavaScriptBlocks.filter((data) => data.name !== name);
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
    public executePromise<T>(scriptCode: string, timeout: number = 500): Promise<T> {
        return this.executePromises<T>([scriptCode], timeout).then((results) => results && results[0]);
    }

    public executePromises<T>(scriptCodes: string[], timeout: number = 500): Promise<T | void> {
        if (scriptCodes.length === 0) {
            return Promise.resolve();
        }
        const reqId = `${Math.round(Math.random() * 1000)}`;
        const eventName = `tmp-promise-event-${reqId}`;

        const scriptHeader = `(function() {
            var promises = [];
            var p;
        `;
        const scriptBody = scriptCodes.map((scriptCode) => `p = ${scriptCode}; promises.push(p);`);
        const scriptFooter = `
            return Promise.all(promises);
        })()`;

        const scriptCode = `${scriptHeader}
        ${scriptBody.join(';')}
        ${scriptFooter}`;
        const trimmedScriptCode = scriptCode.trim();

        const promiseScriptCode = `
            var eventName = ${JSON.stringify(eventName)};
            try {
                var promise = (function() {return ${trimmedScriptCode}})();
                window.nsWebViewBridge.executePromise(promise, eventName);
            } catch (err) {
                window.nsWebViewBridge.emitError(err, eventName);
            }
        `;

        return new Promise<T>((resolve, reject) => {
            let timer: any;
            const tmpPromiseEvent = (args: any) => {
                this.off(eventName);
                const { data, err } = args.data || {} as any;
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);

                clearTimeout(timer);
            };
            this.on(eventName, tmpPromiseEvent);

            this.executeJavaScript(promiseScriptCode, false);

            timer = setTimeout(() => {
                reject(new Error(`Timed out after: ${timeout}`));
                this.off(eventName);
            }, timeout);
        });
    }

    /**
     * Generate scriptcode for loading javascript-file.
     */
    protected generateLoadJavaScriptFileScriptCode(scriptHref: string) {
        return `window.nsWebViewBridge.injectJavaScriptFile(${JSON.stringify(scriptHref)});`;
    }

    /**
     * Generate scriptcode for loading CSS-file.
     */
    protected generaateLoadCSSFileScriptCode(stylesheetHref: string, insertBefore = false) {
        return `window.nsWebViewBridge.injectStyleSheetFile(${JSON.stringify(stylesheetHref)}, ${!!insertBefore});`;
    }

    /**
     * Inject WebView JavaScript Bridge.
     */
    public injectWebViewBridge() {
        return webViewBridgeJsCodePromise
            .then((webViewInterfaceJsCode) => this.executeJavaScript(webViewInterfaceJsCode, false))
            .then(() => this.loadJavaScriptFiles(this.autoInjectScriptFiles))
            .then(() => this.loadStyleSheetFiles(this.autoInjectStyleSheetFiles))
            .then(() => this.executePromises(this.autoInjectJavaScriptBlocks.map((data) => data.scriptCode)));
    }

    /**
     * Convert response from WebView into usable JS-type.
     */
    protected parseWebviewJavascriptResult(result: any) {
        if (result === undefined) {
            return;
        }

        if (typeof result !== 'string') {
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
            traceWrite(message, 'NOTA', type);
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
        throw new Error('WebViewExt.onUIWebViewEvent() only available on iOS');
    }

    /**
     * Helper function, strips 'x-local://' from a resource name
     */
    protected fixLocalResourceName(resourceName: string) {
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

    /**
     * Raised when a loadFinished event occurs.
     */
    on(event: "loadFinished", callback: (args: LoadFinishedEventData) => void, thisArg?: any);

    /**
     * Raised when a loadStarted event occurs.
     */
    on(event: "loadStarted", callback: (args: LoadStartedEventData) => void, thisArg?: any);
}

srcProperty.register(WebViewExtBase);
autoInjectJSBridgeProperty.register(WebViewExtBase);
