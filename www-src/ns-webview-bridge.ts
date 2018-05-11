interface EventListener {
  (data: any): void | boolean;
}

interface EventListenerMap {
  [eventName: string]: EventListener[];
}

interface IOSUIWebViewResponseMap {
  [id: string]: any;
}

declare const androidWebViewBridge: {
  emitEvent(eventName: string, data: string): void;
};

/**
 * Creates temporary iFrame element to load custom url, for sending handshake message
 * to iOS which is necessary to initiate data transfer from webView to iOS
 */
function createIFrame(src: string): HTMLIFrameElement {
  const rootElm = document.documentElement;
  const newFrameElm = document.createElement('IFRAME') as HTMLIFrameElement;
  newFrameElm.setAttribute('src', src);
  rootElm.appendChild(newFrameElm);
  return newFrameElm;
}

/**
 * With WKWebView it's assumed the there is a WKScriptMessage named nsBridge
 */
function getWkWebViewMessageHandler() {
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
  private iosUIWebViewResponseMap: IOSUIWebViewResponseMap = {};

  /**
   * Counter of iOS JS Call responseId
   */
  private iosUIWebViewResponseId = 0;

  private get androidWebViewBridge() {
    if (typeof androidWebViewBridge !== 'undefined') {
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
      const retnVal = listener && listener(data);
      // if any handler return false, not executing any further handlers for that event.
      if (retnVal === false) {
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
      messageHandler.postMessage(JSON.stringify({
        eventName,
        data,
      }));
      return;
    }

    // UIWebView fallback
    this.iosUIWebViewResponseMap[++this.iosUIWebViewResponseId] = data;
    const metadata = {
      eventName: eventName,
      resId: this.iosUIWebViewResponseId,
    };
    const url = 'js2ios:' + JSON.stringify(metadata);
    const iFrame = createIFrame(url);
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
   * Returns data to iOS. This function is called from iOS when using UIWebView.
   */
  public getUIWebViewResponse(resId: string) {
    const response = this.iosUIWebViewResponseMap[resId];
    delete this.iosUIWebViewResponseMap[resId];
    return response;
  }

  /**
   * Registers handlers for events from the native layer.
   */
  public on(eventName: string, callback: EventListener) {
    if (!callback) {
      return;
    }

    let events = this.eventListenerMap[eventName] || [];

    this.eventListenerMap[eventName] = [...events, callback];
  }

  /**
   * Deregister handlers for events from the native layer.
   */
  public off(eventName: string, callback?: EventListener) {
    if (!callback) {
      delete this.eventListenerMap[eventName];
      return;
    }

    this.eventListenerMap[eventName] = this.eventListenerMap[eventName]
      .filter((oldCallback) => oldCallback !== callback);

    if (this.eventListenerMap[eventName].length === 0) {
      delete this.eventListenerMap[eventName];
    }
  }

  /**
   * Emits event to android/ios
   */
  public emit(eventName: string, data: any) {
    if (this.androidWebViewBridge) {
      this.emitEventToAndroid(eventName, JSON.stringify(data));
    } else {
      this.emitEventToIOS(eventName, data);
    }
  }
}

(window as any)['nsWebViewBridge'] = new NSWebViewBridge();
