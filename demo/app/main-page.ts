import * as observable from 'tns-core-modules/data/observable';
import * as pages from 'tns-core-modules/ui/page';
import { WebViewExt } from '@nota/nativescript-webview-ext';

import {HelloWorldModel} from './main-view-model';

// Event handler for Page 'loaded' event attached in main-page.xml
export function pageLoaded(args: observable.EventData) {
    // Get the event sender
    let page = <pages.Page>args.object;
    page.bindingContext = new HelloWorldModel();
}

export function webviewLoaded(args: observable.EventData) {
    const webview = args.object as WebViewExt;

    webview.registerLocalResource('local-stylesheet.css', '~/assets/local-stylesheet.css');
    webview.src = 'http://localhost:8080';
}
