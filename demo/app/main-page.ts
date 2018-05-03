import { WebViewExt } from '@nota/nativescript-webview-ext';
import * as observable from 'tns-core-modules/data/observable';
import { isAndroid } from 'tns-core-modules/platform';
import * as trace from 'tns-core-modules/trace';
import * as pages from 'tns-core-modules/ui/page';

import { HelloWorldModel } from './main-view-model';

let webview: WebViewExt;

// trace.setCategories('NOTA');
// trace.enable();

// Event handler for Page 'loaded' event attached in main-page.xml
export function pageLoaded(args: observable.EventData) {
    // Get the event sender
    let page = <pages.Page>args.object;
    page.bindingContext = new HelloWorldModel();
}

export function webviewLoaded(args: observable.EventData) {
    webview = args.object as WebViewExt;

    webview.registerLocalResource('local-stylesheet.css', '~/assets/local-stylesheet.css');
    if (isAndroid) {
        webview.src = 'http://10.0.2.2:8080';
    } else {
        webview.src = 'http://localhost:8080';
    }

    webview.on(WebViewExt.loadFinishedEvent, (args) => {
        console.log('WebViewExt.loadFinishedEvent: ' + (<any>args.object).src);
        webview.loadStyleSheetFile('local-stylesheet.css', '~/assets/local-stylesheet.css', false);
    });

    webview.on('gotMessage', (msg) => {
        console.log(`webview.gotMessage: ${JSON.stringify(msg)} (${typeof msg})`);
    });
}

function executeJavaScriptTest<T>(js: string): Promise<T> {
    return webview.executeJavaScript<T>(js).then((res: T) => {
        console.log(`executeJavaScript '${js}' => ${JSON.stringify(res)} (${typeof res})`);
        return res;
    }).catch((err) => {
        console.log(`executeJavaScript '${js}' => ERROR: ${err}`);
        throw err;
    });
}

export function runTests() {
    console.time('tests');
    Promise.all([
        executeJavaScriptTest('callFromNativeScript()'),
        executeJavaScriptTest<number>('getNumber()'),
        executeJavaScriptTest<number>('getNumberFloat()'),
        executeJavaScriptTest<boolean>('getBoolean()'),
        executeJavaScriptTest<string>('getString()'),
        executeJavaScriptTest<Object>('getArray()'),
        executeJavaScriptTest<Object>('getObject()')
    ]).then(() => {
        console.timeEnd('tests');
    });
}
