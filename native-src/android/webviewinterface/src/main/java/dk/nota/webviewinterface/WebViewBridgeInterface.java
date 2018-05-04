package dk.nota.webviewinterface;

import android.webkit.JavascriptInterface;

public class WebViewBridgeInterface {
    public WebViewBridgeInterface() {
    }

    @JavascriptInterface
    public void emitEvent(String eventName, String data) {
        this.emitEventToNativeScript(eventName, data);
    }

    public void emitEventToNativeScript(String eventName, String data) {
        // Extend this function in nativescript
    }
}
