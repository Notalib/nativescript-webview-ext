import * as fs from "tns-core-modules/file-system";
import { EventData, Property, traceEnabled, traceMessageType, traceWrite, View, ViewBase } from "tns-core-modules/ui/core/view";
import { LoadEventData, NavigationType, urlOverrideHandlerFn, WebViewExt as WebViewExtDefinition } from "./";

import { webViewBridgeJsCodePromise } from "./nativescript-webview-bridge-loader";

export { NavigationType };
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

export abstract class WebViewExtBase extends View implements WebViewExtDefinition {
    public android: any /* android.webkit.WebView */;
    public ios: any /* WKWebView | UIWebView */;

    public get interceptScheme() {
        return 'x-local';
    }

    public static loadStartedEvent = "loadStarted";
    public static loadFinishedEvent = "loadFinished";

    /** is this.ios a UIWebView? */
    public isUIWebView: boolean;

    /** is this.ios a WKWebView? */
    public isWKWebView: boolean;

    public src: string;

    protected autoLoadScriptFiles = [] as AutoLoadJavaScriptFile[];
    protected autoLoadStyleSheetFiles = [] as AutoLoadStyleSheetFile[];

    constructor() {
        super();
        this.setupWebViewInterface();
    }

    public _onLoadFinished(url: string, error?: string) {
        let args = <LoadEventData>{
            eventName: WebViewExtBase.loadFinishedEvent,
            object: this,
            url,
            navigationType: undefined,
            error,
        };

        this.notify(args);
    }

    public _onLoadStarted(url: string, navigationType: NavigationType) {
        let args = <LoadEventData>{
            eventName: WebViewExtBase.loadStartedEvent,
            object: this,
            url: url,
            navigationType: navigationType,
            error: undefined
        };

        this.notify(args);
    }

    public abstract _loadUrl(src: string): void;

    public abstract _loadData(src: string): void;

    public abstract stopLoading(): void;

    public get canGoBack(): boolean {
        throw new Error("This member is abstract.");
    }

    public get canGoForward(): boolean {
        throw new Error("This member is abstract.");
    }

    public abstract goBack(): void;

    public abstract goForward(): void;

    public abstract reload(): void;

    public urlOverrideHandler: urlOverrideHandlerFn;

    [srcProperty.getDefault](): string {
        return "";
    }
    [srcProperty.setNative](src: string) {
        if (!src) {
            return;
        }
        this.stopLoading();

        // Add file:/// prefix for local files.
        // They should be loaded with _loadUrl() method as it handles query params.
        if (src.startsWith("~/")) {
            src = `file:///${fs.knownFolders.currentApp().path}/` + src.substr(2);
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
            lcSrc.startsWith("file:///") ||
            lcSrc.startsWith(this.interceptScheme)
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
        this.on(WebViewExtBase.loadFinishedEvent, (evt: LoadEventData) => {
            if (evt && evt.error) {
                this.writeTrace('Error injecting webview-bridge JS code: ' + evt.error);
                return;
            }
            this.writeTrace('Injecting webview-bridge JS code');
            webViewBridgeJsCodePromise
                .then((webViewInterfaceJsCode) => this.executeJavaScript(webViewInterfaceJsCode, false))
                .catch((err) => console.error(err));

            for (const { scriptName, filepath } of this.autoLoadScriptFiles) {
                this.loadJavaScriptFile(scriptName, filepath);
            }

            for (const { stylesheetName, filepath, insertBefore } of this.autoLoadStyleSheetFiles) {
                this.loadStyleSheetFile(stylesheetName, filepath, !!insertBefore);
            }
        });
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

    public abstract registerLocalResource(name: string, filepath: string);

    public abstract unregisterLocalResource(name: string);

    public abstract getRegistretLocalResource(name: string);

    public loadJavaScriptFile(scriptName: string, filepath?: string) {
        if (filepath) {
            this.registerLocalResource(scriptName, filepath);
            scriptName = `${this.interceptScheme}://${scriptName}`;
        }
        const scriptCode = this.generateLoadJavaScriptFileScriptCode(scriptName);
        this.writeTrace('Loading javascript file: ' + scriptName);
        return this.executeJavaScript(scriptCode, false).then(() => void 0);
    }

    public loadStyleSheetFile(stylesheetName: string, filepath: string, insertBefore = true) {
        this.registerLocalResource(stylesheetName, filepath);
        const sheetUrl = `${this.interceptScheme}://${stylesheetName}`;
        const scriptCode = this.generaateLoadCSSFileScriptCode(sheetUrl, insertBefore);
        this.writeTrace('Loading stylesheet file: ' + sheetUrl);

        return this.executeJavaScript(scriptCode, false).then(() => void 0);
    }

    public autoLoadJavaScriptFile(scriptName: string, filepath: string) {
        this.loadJavaScriptFile(scriptName, filepath);
        this.autoLoadScriptFiles.push({ scriptName, filepath });
    }

    public autoLoadStyleSheetFile(stylesheetName: string, filepath: string, insertBefore?: boolean) {
        this.loadStyleSheetFile(stylesheetName, filepath, insertBefore);
        this.autoLoadStyleSheetFiles.push({ stylesheetName, filepath, insertBefore });
    }

    public abstract executeJavaScript(scriptCode: string, stringifyResult?: boolean): Promise<any>;

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
}

export interface WebViewExtBase {
    on(eventNames: string, callback: (data: EventData) => void, thisArg?: any);
    on(event: "loadFinished", callback: (args: LoadEventData) => void, thisArg?: any);
    on(event: "loadStarted", callback: (args: LoadEventData) => void, thisArg?: any);
}

srcProperty.register(WebViewExtBase);
