import { WebViewExt as WebViewExtDefinition, LoadEventData, NavigationType, urlOverrideHandlerFn } from ".";
import { View, Property, EventData } from "tns-core-modules/ui/core/view";
import { File, knownFolders, path } from "tns-core-modules/file-system";
import { WebViewInterface } from 'nativescript-webview-interface';

export { File, knownFolders, path, NavigationType };
export * from "tns-core-modules/ui//core/view";

export const srcProperty = new Property<WebViewExtBase, string>({ name: "src" });

let webviewInterfaceScriptPath: string;
function loadJSInterface() {
    let jsDataFilePath = "tns_modules/nativescript-webview-interface/www/nativescript-webview-interface.js";
    if (global.TNS_WEBPACK) {
        jsDataFilePath = "assets/js/nativescript-webview-interface.js";
    }

    const realPath = path.join(knownFolders.currentApp().path, jsDataFilePath);
    if (!File.exists(realPath)) {
        throw new Error(`"nativescript-webview-interface.js" cannot be loaded`);
    }

    webviewInterfaceScriptPath = realPath;
}
loadJSInterface();

export abstract class WebViewExtBase extends View implements WebViewExtDefinition {
    public android: any;
    public ios: any;
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

    abstract _loadUrl(src: string): void;

    abstract _loadData(src: string): void;

    abstract stopLoading(): void;

    get canGoBack(): boolean {
        throw new Error("This member is abstract.");
    }

    get canGoForward(): boolean {
        throw new Error("This member is abstract.");
    }

    abstract goBack(): void;

    abstract goForward(): void;

    abstract reload(): void;

    public urlOverrideHandler: urlOverrideHandlerFn;
    public urlInterceptHandler: (url: string) => string | void;

    [srcProperty.getDefault](): string {
        return "";
    }
    [srcProperty.setNative](src: string) {
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
            src.toLowerCase().indexOf("file:///") === 0) {
            this.setupWebViewInterface();
            this._loadUrl(src);
        } else {
            this._loadData(src);
        }
    }

    get url(): string {
        throw new Error("Property url of WebView is deprecated. Use src instead");
    }
    set url(value: string) {
        throw new Error("Property url of WebView is deprecated. Use src instead");
    }

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
        return `(function() {
            var script = document.createElement("SCRIPT");
            script.src = "${scriptHref}";

            document.head.appendChild(script);
        })();`;
    }

    protected getInjectCSSCode(stylesheetHref: string, insertBefore = false) {
        return `(function() {
            var linkElement = document.createElement("LINK");
            var insertBefore = !!JSON.parse(${JSON.stringify(insertBefore)});
            linkElement.setAttribute("id", "${stylesheetHref}");
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
}
export interface WebViewExtBase {
    on(eventNames: string, callback: (data: EventData) => void, thisArg?: any);
    on(event: "loadFinished", callback: (args: LoadEventData) => void, thisArg?: any);
    on(event: "loadStarted", callback: (args: LoadEventData) => void, thisArg?: any);
}

srcProperty.register(WebViewExtBase);
