interface EventListenerMap {
  [eventName: string]: Array<(data: any) => void | boolean>;
}

interface IOSResponseMap {
  [id: string]: any;
}

declare const androidWebViewInterface: {
  emitEvent(eventName: string, data: string): void;
};

class NSWebViewinterface {
  /**
   * Mapping of native eventName and its handler in webView
   */
  private eventListenerMap: EventListenerMap = {};

  /**
   * Mapping of JS Call responseId and result for iOS
   */
  private iosResponseMap: IOSResponseMap = {};

  /**
   * Counter of iOS JS Call responseId
   */
  private iosCntResponseId = 0;

  /**
   * Handles events/commands emitted by android/ios. This function is called from nativescript.
   */
  public onNativeEvent(eventName: string, data: any) {
    if (!this.eventListenerMap[eventName]) {
      return;
    }

    for (const listener of this.eventListenerMap[eventName]) {
      const retnVal = listener && listener(data);
      // if any handler return false, not executing any further handlers for that event.
      if (retnVal === false) {
        break;
      }
    }
  }

  /**
   * Creates temporary iFrame element to load custom url, for sending handshake message
   * to iOS which is necessary to initiate data transfer from webView to iOS
   */
  private createIFrame(src: string): HTMLIFrameElement {
    const rootElm = document.documentElement;
    const newFrameElm = document.createElement('IFRAME') as HTMLIFrameElement;
    newFrameElm.setAttribute('src', src);
    rootElm.appendChild(newFrameElm);
    return newFrameElm;
  }

  /**
   * Sends handshaking signal to iOS using custom url, for sending event payload or JS Call response.
   * As iOS do not allow to send any data from webView. Here we are sending data in two steps.
   * 1. Send handshake signal, by loading custom url in iFrame with metadata (eventName, unique responseId)
   * 2. On intercept of this request, iOS calls getIOSResponse with the responseId to fetch the data.
   */
  private emitEventToIOS(eventName: string, data: any) {
    const messageHandler = this.getWkWebViewMessageHandler();
    if (messageHandler) {
      messageHandler.postMessage(JSON.stringify({eventName, data}));
      return;
    }
    this.iosResponseMap[++this.iosCntResponseId] = data;
    const metadata = {
      eventName: eventName,
      resId: this.iosCntResponseId,
    };
    const url = 'js2ios:' + JSON.stringify(metadata);
    const iFrame = this.createIFrame(url);
    if (iFrame && iFrame.parentNode) {
      iFrame.parentNode.removeChild(iFrame);
    } else {
      delete this.iosResponseMap[this.iosCntResponseId];
    }
  }

  private getWkWebViewMessageHandler() {
    const w = window as any;
    if (!w || !w.webkit || !w.webkit.messageHandlers) {
      return;
    }

    return w.webkit.messageHandlers.nsBridge;
  }

  /**
   * Returns data to iOS. This function is called from iOS.
   */
  public getIOSResponse(resId: string) {
    const response = this.iosResponseMap[resId];
    delete this.iosResponseMap[resId];
    return response;
  }

  /**
   * Calls native android function to emit event and payload to android
   */
  private emitEventToAndroid(eventName: any, data: any) {
    androidWebViewInterface.emitEvent(eventName, data);
  }

  /**
   * Registers handlers for android/ios event/command
   */
  public on(eventName: string, callback: (data: any) => void) {
    const lstListeners = this.eventListenerMap[eventName] || (this.eventListenerMap[eventName] = []);
    lstListeners.push(callback);
  }

  /**
   * Emits event to android/ios
   */
  public emit(eventName: string, data: any) {
    const strData = typeof data === 'object' ? JSON.stringify(data) : data;
    if (typeof androidWebViewInterface === 'undefined') {
      this.emitEventToIOS(eventName, strData);
    } else {
      this.emitEventToAndroid(eventName, strData);
    }
  }
}

const nsWebViewInterface = new NSWebViewinterface();
(window as any)['nsWebViewInterface'] = nsWebViewInterface;
