// >> web-view-loaded
import { WebViewExt, LoadEventData } from "@nota/nativescript-webview-ext";
import { EventData } from "tns-core-modules/data/observable";

export function navigatingTo(args: EventData) {
    console.log("page navigating to");
}

export function webViewTouch(args) {
    console.log("touch event");
}

export function webViewPan(args) {
    console.log("pan gesture");
}

export function webViewLoaded(args: LoadEventData) {
    let webview = <WebViewExt>args.object;
    webview.displayZoomControls = false;
}
// << web-view-loaded
