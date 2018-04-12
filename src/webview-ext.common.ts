import { WebViewInterface } from 'nativescript-webview-interface';
import * as fs from "tns-core-modules/file-system";
import { EventData, Property, traceEnabled, traceMessageType, traceWrite, View, ViewBase } from "tns-core-modules/ui/core/view";
import { LoadEventData, NavigationType, urlOverrideHandlerFn, WebViewExt as WebViewExtDefinition } from ".";

import { webViewInterfaceJsCodePromise } from "./nativescript-webview-interface-loader";

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
    public android: any;
    public ios: any;
    public get interceptScheme() {
        return 'x-local';
    }

    public static loadStartedEvent = "loadStarted";
    public static loadFinishedEvent = "loadFinished";

    public isUIWebView: boolean;
    public isWKWebView: boolean;

    public src: string;
    public webViewInterface: WebViewInterface;

    protected autoLoadScriptFiles = [] as AutoLoadJavaScriptFile[];
    protected autoLoadStyleSheetFiles = [] as AutoLoadStyleSheetFile[];

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
    public urlInterceptHandler: (url: string) => string | void;

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
        if (src.indexOf("~/") === 0) {
            src = `file:///${fs.knownFolders.currentApp().path}/` + src.substr(2);
        } else if (src.indexOf("/") === 0) {
            src = "file://" + src;
        }

        // loading local files from paths with spaces may fail
        if (src.toLowerCase().indexOf("file:///") === 0) {
            src = encodeURI(src);
        }

        if (src.toLowerCase().indexOf("http://") === 0 ||
            src.toLowerCase().indexOf("https://") === 0 ||
            src.toLowerCase().indexOf("file:///") === 0 ||
            src.toLowerCase().startsWith(this.interceptScheme)
        ) {
            this.setupWebViewInterface();
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

    public on(eventName, callback, typeArgs) {
        super.on(eventName, callback, typeArgs);

        switch (eventName) {
            case ViewBase.loadedEvent:
            case ViewBase.unloadedEvent:
            case WebViewExtBase.loadFinishedEvent:
            case WebViewExtBase.loadStartedEvent:
            {
                // NativeScript event don't bind inside to the WebView
                return;
            }
            default: {
                this.setupWebViewInterface();
                this.webViewInterface.on(eventName, callback);
            }
        }
    }

    public off(eventName, callback?, typeArgs?) {
        if (this.webViewInterface) {
            this.webViewInterface.off(eventName, callback);
        }

        super.off(eventName, callback, typeArgs);
    }

    /**
     * Setups of the WebViewInterface and makes sure the nativescript-webview-interface is loaded on the webpage.
     */
    protected setupWebViewInterface() {
        if (!this.webViewInterface) {
            this.webViewInterface = new WebViewInterface(this);

            this.on(WebViewExtBase.loadFinishedEvent, () => {
                webViewInterfaceJsCodePromise.then((webViewInterfaceJsCode) => this.executeJavaScript(webViewInterfaceJsCode));

                for (const {scriptName, filepath} of this.autoLoadScriptFiles) {
                    this.loadJavaScriptFile(scriptName, filepath);
                }

                for (const {stylesheetName, filepath, insertBefore} of this.autoLoadStyleSheetFiles) {
                    this.loadStyleSheetFile(stylesheetName, filepath, !!insertBefore);
                }
            });
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
            console.error(`WebViewExt.resolveLocalResourceFilePath("${name}", "${filepath}") - no such file`);
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
        const scriptCode = this.getInjectScriptCode(scriptName);
        this.executeJavaScript(scriptCode);
    }

    public loadStyleSheetFile(stylesheetName: string, filepath: string, insertBefore = true) {
        this.registerLocalResource(stylesheetName, filepath);
        const sheetUrl = `${this.interceptScheme}://${stylesheetName}`;
        const scriptCode = this.getInjectCSSCode(sheetUrl, insertBefore);
        this.executeJavaScript(scriptCode);
    }

    public autoLoadJavaScriptFile(scriptName: string, filepath: string) {
        if (this.webViewInterface) {
            this.loadJavaScriptFile(scriptName, filepath);
        }
        this.autoLoadScriptFiles.push({scriptName, filepath});
    }

    public autoLoadStyleSheetFile(stylesheetName: string, filepath: string, insertBefore?: boolean) {
        if (this.webViewInterface) {
            this.loadStyleSheetFile(stylesheetName, filepath, insertBefore);
        }
        this.autoLoadStyleSheetFiles.push({stylesheetName, filepath, insertBefore});
    }

    public abstract executeJavaScript(scriptCode: string): Promise<any>;

    protected getInjectScriptCode(scriptHref: string) {
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

    protected getInjectCSSCode(stylesheetHref: string, insertBefore = false) {
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

    protected disposeWebViewInterface() {
        if (!this.webViewInterface) {
            return;
        }

        this.webViewInterface.destroy();
        this.webViewInterface = null;
    }

    public writeTrace(message: string, type = traceMessageType.info) {
        if (traceEnabled()) {
            traceWrite(message, 'NOTA', type);
        }
    }
}
export interface WebViewExtBase {
    on(eventNames: string, callback: (data: EventData) => void, thisArg?: any);
    on(event: "loadFinished", callback: (args: LoadEventData) => void, thisArg?: any);
    on(event: "loadStarted", callback: (args: LoadEventData) => void, thisArg?: any);
}

srcProperty.register(WebViewExtBase);
