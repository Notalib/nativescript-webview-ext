import * as fs from "tns-core-modules/file-system";
import { EventData, Property, traceEnabled, traceMessageType, traceWrite, View, ViewBase } from "tns-core-modules/ui/core/view";
import { WebViewExt as WebViewExtDefinition } from "./";

import { webViewBridgeJsCodePromise } from "./nativescript-webview-bridge-loader";

export { File, knownFolders, path } from "tns-core-modules/file-system";
export * from "tns-core-modules/ui//core/view";

export const srcProperty = new Property<WebViewExtBase, string>({ name: "src" });

export interface AutoLoadJavaScriptFile {
    scriptName: string;
    filepath: string;
}

export interface AutoLoadStyleSheetFile {
    stylesheetName: string;
    filepath: string;
    insertBefore?: boolean;
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

    protected autoLoadScriptFiles = [] as AutoLoadJavaScriptFile[];
    protected autoLoadStyleSheetFiles = [] as AutoLoadStyleSheetFile[];

    protected readonly onLoadInjectBridge = (evt: LoadEventData) => {
        if (evt && evt.error) {
            this.writeTrace('Error injecting webview-bridge JS code: ' + evt.error);
            return;
        }

        for (const { scriptName, filepath } of this.autoLoadScriptFiles) {
            this.loadJavaScriptFile(scriptName, filepath);
        }

        for (const { stylesheetName, filepath, insertBefore } of this.autoLoadStyleSheetFiles) {
            this.loadStyleSheetFile(stylesheetName, filepath, !!insertBefore);
        }
    }

    public _onLoadFinished(url: string, error?: string) {
        let args = <LoadFinishedEventData>{
            eventName: WebViewExtBase.loadFinishedEvent,
            object: this,
            url,
            navigationType: undefined,
            error,
        };

        if (!url) {
            this.notify(args);
        } else {
            this.writeTrace('Injecting webview-bridge JS code');

            webViewBridgeJsCodePromise
                .then((webViewInterfaceJsCode) => this.executeJavaScript(webViewInterfaceJsCode, false))
                .then(() => {
                    this.notify(args);
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
        if (!src) {
            return;
        }
        this.stopLoading();

        if (src.startsWith(this.interceptScheme)) {
            const fileparh = this.getRegistretLocalResource(src);
            if (fileparh) {
                src = `file://${fileparh}`;
            } else {
                this._onLoadFinished(src, 'unknown x-local-resource');
                return;
            }
        }

        // Add file:/// prefix for local files.
        // They should be loaded with _loadUrl() method as it handles query params.
        if (src.startsWith("~/")) {
            src = `file://${fs.knownFolders.currentApp().path}/${src.substr(2)}`;
        } else if (src.startsWith("/")) {
            src = "file://" + src;
        }

        const lcSrc = src.toLowerCase();

        // loading local files from paths with spaces may fail
        if (lcSrc.startsWith("file:///")) {
            src = encodeURI(src);
        }

        if (lcSrc.startsWith("http://") ||
            lcSrc.startsWith("https://") ||
            lcSrc.startsWith("file:///")
        ) {
            this._loadUrl(src);
        } else {
            this._loadData(src);
        }
    }

    public get url(): string {
        throw new Error("Property url of WebView is deprecated. Use src instead");
    }
    public set url(value: string) {
        throw new Error("Property url of WebView is deprecated. Use src instead");
    }

    /**
     * Setups of the WebViewInterface and makes sure the bridge is loaded on the webpage.
     */
    protected setupWebViewInterface() {
        this.on(WebViewExtBase.loadFinishedEvent, this.onLoadInjectBridge);
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
     * Load a JavaScript file on the current page in the webview.
     */
    public loadJavaScriptFile(scriptName: string, filepath?: string) {
        if (filepath) {
            this.registerLocalResource(scriptName, filepath);
            scriptName = `${this.interceptScheme}://${scriptName}`;
        }
        const scriptCode = this.generateLoadJavaScriptFileScriptCode(scriptName);
        this.writeTrace('Loading javascript file: ' + scriptName);
        return this.executeJavaScript(scriptCode, false).then(() => void 0);
    }

    /**
     * Load a stylesheet file on the current page in the webview.
     */
    public loadStyleSheetFile(stylesheetName: string, filepath: string, insertBefore = true) {
        this.registerLocalResource(stylesheetName, filepath);
        const sheetUrl = `${this.interceptScheme}://${stylesheetName}`;
        const scriptCode = this.generaateLoadCSSFileScriptCode(sheetUrl, insertBefore);
        this.writeTrace('Loading stylesheet file: ' + sheetUrl);

        return this.executeJavaScript(scriptCode, false).then(() => void 0);
    }

    /**
     * Auto-load a JavaScript-file after the page have been loaded.
     */
    public autoLoadJavaScriptFile(scriptName: string, filepath: string) {
        this.loadJavaScriptFile(scriptName, filepath);
        this.autoLoadScriptFiles.push({ scriptName, filepath });
    }

    /**
     * Auto-load a stylesheet-file after the page have been loaded.
     */
    public autoLoadStyleSheetFile(stylesheetName: string, filepath: string, insertBefore?: boolean) {
        this.loadStyleSheetFile(stylesheetName, filepath, insertBefore);
        this.autoLoadStyleSheetFiles.push({ stylesheetName, filepath, insertBefore });
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
        const reqId = `${Math.round(Math.random() * 1000)}`;
        const eventName = `tmp-promise-event-${reqId}`;

        const promiseScriptCode =  `
            try {
                Promise.resolve(${scriptCode})
                .then(function(data) {
                    window.nsWebViewBridge.emit(${JSON.stringify(eventName)}, {
                        data: data
                    });
                })
                .catch(function(err) {
                    if (err && err.message) {
                        window.nsWebViewBridge.emit(${JSON.stringify(eventName)}, {
                            err: {
                                message: err.message,
                                stack: err.stack,
                            }
                        });
                    } else {
                        window.nsWebViewBridge.emit(${JSON.stringify(eventName)}, {
                            err: err
                        });
                    }
                })
            } catch (err) {
                window.nsWebViewBridge.emit(${JSON.stringify(eventName)}, {
                    err: {
                        message: err.message,
                        stack: err.stack,
                    }
                });
            }
        `;

        return new Promise<T>((resolve, reject) => {
            let timer: any;
            const tmpPromiseEvent = (args: any) => {
                this.off(eventName);
                const {data, err} = args.data || {} as any;
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
        const elId = scriptHref.replace(/[^a-z0-9]/g, '');
        return `(function() {
            if (document.getElementById("${elId}")) {
                console.log("${elId} already exists");
                return;
            }

            var script = document.createElement("script");
            script.setAttribute("id", "${elId}");
            script.src = "${scriptHref}";
            script.onError = function(error) {
                console.log("Failed to load ${scriptHref} - error: " + error);
            };

            document.body.appendChild(script);
        })();`;
    }

    /**
     * Generate scriptcode for loading CSS-file.
     */
    protected generaateLoadCSSFileScriptCode(stylesheetHref: string, insertBefore = false) {
        const elId = stylesheetHref.replace(/[^a-z0-9]/g, '');
        return `(function() {
            if (document.getElementById("${elId}")) {
                console.log("${elId} already exists");
                return;
            }
            var linkElement = document.createElement("link");
            var insertBefore = !!JSON.parse("${!!insertBefore}");
            linkElement.setAttribute("id", "${elId}");
            linkElement.setAttribute("rel", "stylesheet");
            linkElement.setAttribute("type", "text/css");
            linkElement.setAttribute("href", "${stylesheetHref}");
            if (insertBefore && document.head.childElementCount > 0) {
                document.head.insertBefore(linkElement, document.head.firstElementChild);
            } else {
                document.head.appendChild(linkElement);
            }
        })();`;
    }

    /**
     * Convert response from WebView into usable JS-type.
     */
    protected parseWebviewJavascriptResult(result: any) {
        if (result === undefined) {
            return;
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
     * NOTE: if empty on android returns filename
     */
    public getTitle(): Promise<string>  {
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
