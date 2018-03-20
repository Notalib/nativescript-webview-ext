import { WebViewExt as WebViewExtDefinition, LoadEventData, NavigationType, urlOverrideHandlerFn } from ".";
import { View, Property, EventData } from "tns-core-modules/ui/core/view";
import { File, knownFolders, path } from "tns-core-modules/file-system";

export { File, knownFolders, path, NavigationType };
export * from "tns-core-modules/ui//core/view";

export const srcProperty = new Property<WebViewExtBase, string>({ name: "src" });

export const extToMimeType = new Map<string, string>([
    ['css', 'text/css'],
    ['js', 'text/javascript'],
    ['jpg', 'image/jpeg'],
    ['jpeg', 'image/jpeg'],
    ['png', 'image/png'],
    ['gif', 'image/gif'],
    ['svg', 'image/svg+xml'],
]);


export abstract class WebViewExtBase extends View implements WebViewExtDefinition {
    public static loadStartedEvent = "loadStarted";
    public static loadFinishedEvent = "loadFinished";

    protected readonly localResourceMap = new Map<string, string>();

    public src: string;

    public _onLoadFinished(url: string, error?: string) {
        let args = <LoadEventData>{
            eventName: WebViewExtBase.loadFinishedEvent,
            object: this,
            url: url,
            navigationType: undefined,
            error: error
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

    registerLocalResource(name: string, filepath: string) {
        if (!filepath) {
            return;
        }

        if (filepath.startsWith('~')) {
            filepath = path.normalize(knownFolders.currentApp().path + filepath.substr(1));
        }

        this.localResourceMap.set(name, filepath);
    }

    unregisterLocalResource(name: string) {
        this.localResourceMap.delete(name);
    }

    getRegistretLocalResource(name: string) {
        return this.localResourceMap.get(name);
    }
}
export interface WebViewExtBase {
    on(eventNames: string, callback: (data: EventData) => void, thisArg?: any);
    on(event: "loadFinished", callback: (args: LoadEventData) => void, thisArg?: any);
    on(event: "loadStarted", callback: (args: LoadEventData) => void, thisArg?: any);
}

srcProperty.register(WebViewExtBase);
