interface EventListener {
    (data: any): void | boolean;
}

interface EventListenerMap {
    [eventName: string]: EventListener[];
}

interface UIWebViewResponseMap {
    [id: string]: any;
}

declare const androidWebViewBridge: {
    emitEvent(eventName: string, data: string): void;
};

/**
 * Creates temporary iFrame element to load custom url, for sending handshake message
 * to iOS which is necessary to initiate data transfer from webView to iOS
 */
function createIFrameForUIWebView(src: string): HTMLIFrameElement {
    const rootElm = document.documentElement || document.body;
    const newFrameElm = document.createElement("iframe");
    newFrameElm.setAttribute("src", src);
    rootElm.appendChild(newFrameElm);
    return newFrameElm;
}

interface WKWebViewMessageHandler {
    postMessage(message: string): void;
}

/**
 * With WKWebView it's assumed the there is a WKScriptMessage named nsBridge
 */
function getWkWebViewMessageHandler(): WKWebViewMessageHandler | void {
    const w = window as any;
    if (!w || !w.webkit || !w.webkit.messageHandlers) {
        return;
    }

    return w.webkit.messageHandlers.nsBridge;
}

// Forked from nativescript-webview-interface@1.4.2
class NSWebViewBridge {
    /**
     * Mapping of native eventName and its handler in webView
     */
    private eventListenerMap: EventListenerMap = {};

    /**
     * Mapping of JS Call responseId and result for iOS
     */
    private iosUIWebViewResponseMap: UIWebViewResponseMap = {};

    /**
     * Counter of iOS JS Call responseId
     */
    private iosUIWebViewResponseId = 0;

    private get androidWebViewBridge() {
        if (typeof androidWebViewBridge !== "undefined") {
            return androidWebViewBridge;
        }
    }

    /**
     * Handles events/commands emitted by android/ios. This function is called from nativescript.
     */
    public onNativeEvent(eventName: string, data: any) {
        const events = this.eventListenerMap[eventName];
        if (!events || events.length === 0) {
            return;
        }

        for (const listener of events) {
            const res = listener && listener(data);
            // if any handler return false, not executing any further handlers for that event.
            if (res === false) {
                break;
            }
        }
    }

    /**
     * Emit event to native layer on iOS.
     *
     * With WKWebView it's assumed the there is a WKScriptMessage named nsBridge
     *
     * With UIWebView:
     * Sends handshaking signal to iOS using custom url, for sending event payload or JS Call response.
     * As iOS do not allow to send any data from webView. Here we are sending data in two steps.
     * 1. Send handshake signal, by loading custom url in iFrame with metadata (eventName, unique responseId)
     * 2. On intercept of this request, iOS calls getUIWebViewResponse with the responseId to fetch the data.
     */
    private emitEventToIOS(eventName: string, data: any) {
        const messageHandler = getWkWebViewMessageHandler();
        if (messageHandler) {
            messageHandler.postMessage(
                JSON.stringify({
                    eventName,
                    data,
                }),
            );
            return;
        }

        // UIWebView fallback
        this.iosUIWebViewResponseMap[++this.iosUIWebViewResponseId] = data;
        const metadata = {
            eventName: eventName,
            resId: this.iosUIWebViewResponseId,
        };
        const url = `js2ios:${JSON.stringify(metadata)}`;
        const iFrame = createIFrameForUIWebView(url);
        if (iFrame && iFrame.parentNode) {
            iFrame.parentNode.removeChild(iFrame);
        } else {
            delete this.iosUIWebViewResponseMap[this.iosUIWebViewResponseId];
        }
    }

    /**
     * Calls native android function to emit event and payload to android
     */
    private emitEventToAndroid(eventName: any, data: any) {
        const androidWebViewBridge = this.androidWebViewBridge;
        if (!androidWebViewBridge) {
            console.error(`Tried to emit to android without the androidWebViewBridge`);
            return;
        }

        androidWebViewBridge.emitEvent(eventName, data);
    }

    /**
     * Returns data to iOS.
     * This function is called from iOS when using UIWebView.
     */
    public getUIWebViewResponse(resId: string) {
        const response = this.iosUIWebViewResponseMap[resId];
        delete this.iosUIWebViewResponseMap[resId];
        return response;
    }

    /**
     * Add an event listener for event from native-layer
     */
    public on(eventName: string, callback: EventListener) {
        if (!callback) {
            return;
        }

        let events = this.eventListenerMap[eventName] || [];

        this.eventListenerMap[eventName] = [...events, callback];
    }

    /**
     * Add an event listener for event from native-layer
     */
    public addEventListener(eventName: string, callback: EventListener) {
        this.on(eventName, callback);
    }

    /**
     * Remove an event listener for event from native-layer.
     * If callback is undefined all events for the eventName will be removed.
     */
    public off(eventName?: string, callback?: EventListener) {
        if (!eventName) {
            this.eventListenerMap = {};
            return;
        }

        if (!callback) {
            delete this.eventListenerMap[eventName];
            return;
        }

        this.eventListenerMap[eventName] = this.eventListenerMap[eventName].filter((oldCallback) => oldCallback !== callback);

        if (this.eventListenerMap[eventName].length === 0) {
            delete this.eventListenerMap[eventName];
        }
    }

    /**
     * Remove an event listener for event from native-layer.
     * If callback is undefined all events for the eventName will be removed.
     */
    public removeEventListener(eventName?: string, callback?: EventListener) {
        return this.off(eventName, callback);
    }

    /**
     * Emit an event to the native-layer
     */
    public emit(eventName: string, data: any) {
        if (this.androidWebViewBridge) {
            this.emitEventToAndroid(eventName, JSON.stringify(data));
        } else {
            this.emitEventToIOS(eventName, data);
        }
    }

    /**
     * Injects a javascript file.
     * This is usually called from WebViewExt.loadJavaScriptFiles(...)
     */
    public injectJavaScriptFile(href: string): Promise<void> {
        const elId = this.elementIdFromHref(href);

        if (document.getElementById(elId)) {
            console.log(`${elId} already exists`);
            return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
            const scriptElement = document.createElement("script");
            scriptElement.async = true;
            scriptElement.setAttribute("id", elId);
            scriptElement.addEventListener("error", function(error) {
                console.error(`Failed to load ${href} - error: ${error}`);
                reject(error);

                if (scriptElement.parentElement) {
                    scriptElement.parentElement.removeChild(scriptElement);
                }
            });
            scriptElement.addEventListener("load", function() {
                console.info(`Loaded ${href}`);
                window.requestAnimationFrame(() => {
                    resolve();
                });

                if (scriptElement.parentElement) {
                    scriptElement.parentElement.removeChild(scriptElement);
                }
            });
            scriptElement.src = href;

            document.body.appendChild(scriptElement);
        });
    }

    /**
     * Injects a StyleSheet file.
     * This is usually called from WebViewExt.loadStyleSheetFiles(...)
     */
    public injectStyleSheetFile(href: string, insertBefore?: boolean): Promise<void> {
        const elId = this.elementIdFromHref(href);

        if (document.getElementById(elId)) {
            console.log(`${elId} already exists`);
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const linkElement = document.createElement("link");
            linkElement.addEventListener("error", (error) => {
                console.error(`Failed to load ${href} - error: ${error}`);
                reject(error);

                if (linkElement.parentElement) {
                    linkElement.parentElement.removeChild(linkElement);
                }
            });
            linkElement.addEventListener("load", () => {
                console.info(`Loaded ${href}`);
                window.requestAnimationFrame(() => {
                    resolve();
                });
            });
            linkElement.setAttribute("id", elId);
            linkElement.setAttribute("rel", "stylesheet");
            linkElement.setAttribute("type", "text/css");
            linkElement.setAttribute("href", href);
            if (document.head) {
                if (insertBefore && document.head.childElementCount > 0) {
                    document.head.insertBefore(linkElement, document.head.firstElementChild);
                } else {
                    document.head.appendChild(linkElement);
                }
            }
        });
    }

    /**
     * Helper function for WebViewExt.executePromise(scriptCode).
     */
    public async executePromise(promise: Promise<any>, eventName: string) {
        try {
            const data = await promise;
            this.emit(eventName, {
                data,
            });
        } catch (err) {
            this.emitError(err, eventName);
        }
    }

    /**
     * Emit an error to the native-layer.
     * This is used to workaround the problem of serializing an Error-object.
     * If err is an Error the message and stack will be extracted and emitted to the native-layer.
     */
    public emitError(err: any, eventName = "web-error") {
        if (err && typeof err === "object" && err.message) {
            this.emit(eventName, {
                err: {
                    message: err.message,
                    stack: err.stack,
                },
            });
        } else {
            this.emit(eventName, {
                err,
            });
        }
    }

    private elementIdFromHref(href: string) {
        return href.replace(/^[:]*:\/\//, "").replace(/[^a-z0-9]/g, "");
    }
}

interface WindowWithNSWebViewBridge {
    nsWebViewBridge: NSWebViewBridge;
}

const w = window as Window & WindowWithNSWebViewBridge;
if (!w.nsWebViewBridge) {
    // Only create the NSWebViewBridge, if is doesn't already exist.
    w.nsWebViewBridge = new NSWebViewBridge();
}
