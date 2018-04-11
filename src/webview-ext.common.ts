import { WebViewExt as WebViewExtDefinition, LoadEventData, NavigationType, urlOverrideHandlerFn } from ".";
import { View, Property, EventData, ViewBase } from "tns-core-modules/ui/core/view";
import { File, knownFolders, path } from "tns-core-modules/file-system";
import { WebViewInterface } from 'nativescript-webview-interface';

export { File, knownFolders, path, NavigationType };
export * from "tns-core-modules/ui//core/view";

export const srcProperty = new Property<WebViewExtBase, string>({ name: "src" });

const webviewInterfaceScriptPath = (function loadJSInterface() {
    let jsDataFilePath = "tns_modules/nativescript-webview-interface/www/nativescript-webview-interface.js";
    if (global.TNS_WEBPACK) {
        jsDataFilePath = "assets/js/nativescript-webview-interface.js";
    }

    const realPath = path.join(knownFolders.currentApp().path, jsDataFilePath);
    if (!File.exists(realPath)) {
        throw new Error(`"nativescript-webview-interface.js" cannot be loaded`);
    }

    return realPath;
})();

export abstract class WebViewExtBase extends View implements WebViewExtDefinition {
    public android: any;
    public ios: any;
    public interceptScheme = 'x-local';

    public static loadStartedEvent = "loadStarted";
    public static loadFinishedEvent = "loadFinished";

    public src: string;
    public webViewInterface: WebViewInterface;

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
            src = `file:///${knownFolders.currentApp().path}/` + src.substr(2);
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
                this.loadJavaScriptFile("nativescript-webview-interface.js", webviewInterfaceScriptPath);
            });
        }
    }

    public abstract registerLocalResource(name: string, filepath: string);

    public abstract unregisterLocalResource(name: string);

    public abstract getRegistretLocalResource(name: string);

    public loadJavaScriptFile(scriptName: string, filepath?: string) {
        if (filepath) {
            this.registerLocalResource(scriptName, filepath);
            scriptName = `x-local://${scriptName}`;
        }
        const scriptCode = this.getInjectScriptCode(scriptName);
        this.executeJavaScript(scriptCode);
    }

    public loadStyleSheetFile(stylesheetName: string, insertBefore = true, filepath?: string) {
        if (filepath) {
            this.registerLocalResource(stylesheetName, filepath);
            stylesheetName = `x-local://${stylesheetName}`;
        }
        const scriptCode = this.getInjectCSSCode(stylesheetName, insertBefore);
        this.executeJavaScript(scriptCode);
    }

    public abstract executeJavaScript(scriptCode: string): void;

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
}
export interface WebViewExtBase {
    on(eventNames: string, callback: (data: EventData) => void, thisArg?: any);
    on(event: "loadFinished", callback: (args: LoadEventData) => void, thisArg?: any);
    on(event: "loadStarted", callback: (args: LoadEventData) => void, thisArg?: any);
}

srcProperty.register(WebViewExtBase);
