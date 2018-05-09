/**
 * Contains the WebView class, which represents a standard browser widget.
 * @module "ui/web-view"
 */ /** */

import { View, Property, EventData } from "tns-core-modules/ui/core/view";

/**
 * Represents the observable property backing the Url property of each WebView instance.
 */
export const urlProperty: Property<WebViewExt, string>;

/**
 * Represents navigation type
 */
export type NavigationType = "linkClicked" | "formSubmitted" | "backForward" | "reload" | "formResubmitted" | "other" | undefined;

/**
 * Callback function for override URL loading.
 * @param url - url to be loaded in the WebView
 * @return boolean - true to prevent url from being loaded.
 */
export interface urlOverrideHandlerFn {
    (url: String): boolean;
}

/**
 * Represents a standard WebView widget.
 */
export class WebViewExt extends View {
    /**
     * String value used when hooking to loadStarted event.
     */
    public static loadStartedEvent: string;

    /**
     * String value used when hooking to loadFinished event.
     */
    public static loadFinishedEvent: string;

    /**
     * Gets the native [android widget](http://developer.android.com/reference/android/webkit/WebView.html) that represents the user interface for this component. Valid only when running on Android OS.
     */
    android: any /* android.webkit.WebView */;

    /**
     * Gets the native [WKWebView](https://developer.apple.com/documentation/webkit/wkwebview/) that represents the user interface for this component. Valid only when running on iOS.
     */
    ios: any /* WKWebView | UIWebView */;

    /**
     * iOS 11+ uses an WKWebView
     */
    isUIWebView: boolean;

    /**
     * iOS <11 uses a UIWebview
     */
    isWKWebView: boolean;

    /**
     * Gets or sets the url, local file path or HTML string.
     */
    src: string;

    /**
     * Gets a value indicating whether the WebView can navigate back.
     */
    canGoBack: boolean;

    /**
     * Gets a value indicating whether the WebView can navigate forward.
     */
    canGoForward: boolean;

    /**
     * Set callback function to overriding URL loading in the WebView. If the function returns true, the URL will not be loaded by the WebView.
     */
    urlOverrideHandler: urlOverrideHandlerFn;

    /**
     * Stops loading the current content (if any).
     */
    stopLoading(): void;

    /**
     * Navigates back.
     */
    goBack();

    /**
     * Navigates forward.
     */
    goForward();

    /**
     * Reloads the current url.
     */
    reload();

    /**
     * A basic method signature to hook an event listener (shortcut alias to the addEventListener method).
     * @param eventNames - String corresponding to events (e.g. "propertyChange"). Optionally could be used more events separated by `,` (e.g. "propertyChange", "change").
     * @param callback - Callback function which will be executed when event is raised.
     * @param thisArg - An optional parameter which will be used as `this` context for callback execution.
     */
    on(eventNames: string, callback: (data: EventData) => void, thisArg?: any);

    /**
     * Raised when a loadFinished event occurs.
     */
    on(event: "loadFinished", callback: (args: LoadEventData) => void, thisArg?: any);

    /**
     * Raised when a loadStarted event occurs.
     */
    on(event: "loadStarted", callback: (args: LoadEventData) => void, thisArg?: any);

    /**
     * Register a local resource.
     * This resource can be loaded via "x-local://{name}" inside the webview
     */
    registerLocalResource(name: string, path: string): void;

    /**
     * Unregister a local resource.
     */
    unregisterLocalResource(name: string): void;

    getRegistretLocalResource(name: string): string | null;

    /**
     * Load a JavaScript file on the current page in the webview.
     */
    loadJavaScriptFile(scriptName: string, filepath: string): Promise<void>;

    /**
     * Load a stylesheet file on the current page in the webview.
     */
    loadStyleSheetFile(scriptName: string, filepath: string, insertBefore?: boolean): Promise<void>;

    /**
     * Auto-load a JavaScript-file after the page have been loaded.
     */
    autoLoadJavaScriptFile(scriptName: string, filepath: string): void;

    /**
     * Auto-load a stylesheet-file after the page have been loaded.
     */
    autoLoadStyleSheetFile(scriptName: string, filepath: string, insertBefore?: boolean): void;

    /**
     * Execute JavaScript inside the webview.
     * The code should be wrapped inside an anonymous-function.
     * Larger scripts should be injected with loadJavaScriptFile.
     * NOTE: It's not possible to capture syntax errors on UIWebView.
     * NOTE: stringifyResult only applies on iOS.
     */
    executeJavaScript<T>(scriptCode: string, stringifyResult?: boolean): Promise<T>;

    /**
     * Execute a promise inside the webview and wait for it to resolve.
     * Note: The scriptCode must return a promise.
     */
    executePromise<T>(scriptCode: string, timeout?: number): Promise<T>

    /**
     * Emit event into the webview.
     */
    emitToWebView(eventName: string, data: any): void;

    getTitle(): Promise<string>;
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
