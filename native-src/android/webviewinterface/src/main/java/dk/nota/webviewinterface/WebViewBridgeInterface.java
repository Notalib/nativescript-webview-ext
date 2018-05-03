package dk.nota.webviewinterface;

import android.webkit.JavascriptInterface;

public class WebViewBridgeInterface  {
    private String id = null;
    public WebViewBridgeInterface(String id) {
        this.id = id;
    }

    @JavascriptInterface
    public void emitEvent(String eventName, String data) {
        this.emitEventToNativeScript(this.id, eventName, data);
    }

    public void emitEventToNativeScript(String id, String eventName, String data) {
        // Extend this function in nativescript
    }
}
