import { urlOverrideHandlerFn, LoadEventData, WebViewEventData, WebViewExtBase } from "./webview-ext-common";

/**
 * Represents a standard WebView widget.
 */
export class WebViewExt extends WebViewExtBase {
    /**
     * A basic method signature to hook an event listener (shortcut alias to the addEventListener method).
     * @param eventNames - String corresponding to events (e.g. "propertyChange"). Optionally could be used more events separated by `,` (e.g. "propertyChange", "change").
     * @param callback - Callback function which will be executed when event is raised.
     * @param thisArg - An optional parameter which will be used as `this` context for callback execution.
     */
    public on(eventNames: string, callback: (data: WebViewEventData) => void, thisArg?: any);

    /**
     * Raised when a loadFinished event occurs.
     */
    public on(event: "loadFinished", callback: (args: LoadEventData) => void, thisArg?: any);

    /**
     * Raised when a loadStarted event occurs.
     */
    public on(event: "loadStarted", callback: (args: LoadEventData) => void, thisArg?: any);
}