# @nota/nativescript-webview-ext

Extended WebView for NativeScript which adds "x-local"-custom-scheme for loading local-files, handle events between WebView and NativeScript, JavaScript execution, injecting CSS and JS-files.
Supports Android 19+ and iOS9+.

## Features
* Adds a custom-scheme handler for x-local:// to the webview for loading of resources inside the webview.
    * Note: For iOS 11+ WKWebView is used, but for iOS <11 UIWebView is used
* Adds support for capturing URLs.
    *  This allows the app to open external links in an external browser and handle tel-links
* Added functions like:
    - `executeJavaScript(code: string)` for executing JavaScript-code and getting result.
    - `executePromise(code: string)` for calling promises and getting the result.
    - `getTitle()` returns document.title.
* Two-Way event listeners between `NativeScript` and `WebView`
    * From `NativeScript` to `WebView`
    * From `WebView` to `NativeScript`
* Adds functions to inject `css`- and `javascript`-files.
    * Into the current page.
    * Auto-injected on page load.
* Polyfills:
    * Promise
    * Fetch API (overrides Native API on Android to support x-local:// and file://)
* Supports:
    * Android 19+
    * iOS 9+

## Installation

Describe your plugin installation steps. Ideally it would be something like:

```bash
tns plugin add @nota/nativescript-webview-ext
```

### Angular support

Import `WebViewExtModule` from `@nota/nativescript-webview-ext/angular` and add it to your `NgModule`.

### Vue support

Import `@nota/nativescript-webview-ext/vue` in your app entry file (llikely app.js or main.js).

This registers the element `WebViewExt` for `Vue`.

## Usage

## Limitations

In order to intercept requests for the custom scheme, we use `UIWebView` for iOS 9 and 10 and `WKWebView` for iOS 11+.

iOS 11 added support for setting a `WKURLSchemeHandler` on the `WKWebView`.
Prior to iOS 11 there isn't support for intercepting the URL with `WKWebView`, so we use a custom `NSURLProtocol` + `UIWebView`.

### Important:
The custom `NSURLProtocol` used with UIWebView is shared with all instances of the WebViewExt, so mapping `x-local://local-filename.js` => `file://app/full/path/local-filename.js` is shared between them.

## API

### NativeScript View

| Property | Value | Description |
| --- | --- | --- |
| readonly isUIWebView | true / false | Is the native webview an UIWebView? True if `iOS <11` |
| readonly isWkWebView | true / false | Is the native webview an WKWebView? True if `iOS >=11` |
| src | | Load src |
| autoInjectJSBridge | true / false | Should the window.nsWebViewBridge be injected on `loadFinishedEvent`? Defaults to true |
| debugMode | true / false | Android: Enable chrome debugger for webview on Android. Note: Applies to all webviews in App |
| scrollBounce | true / false | iOS: Should the scrollView bounce? Defaults to true. |
| builtInZoomControls | true / false | Android: Is the built-in zoom mechanisms being used |
| displayZoomControls | true / false | Android: displays on-screen zoom controls when using the built-in zoom mechanisms |
| databaseStorage | true / false | Android: Enaable/Disabled database storage API. Note: It affects all webviews in the process. |
| domStorage | true / false | Android: Enaable/Disabled DOM Storage API. E.g localStorage |
| supportZoom: | true / false | Android: should the webview support zoom |
| cacheMode | default / no_cache / cache_first / cache_only | Android: Set caching mode. |

| Function | Description |
| --- | --- |
| loadUrl(src: string): Promise<LoadFinishedEventData> | Open a URL and resolves a promise once it has finished loading. |
| registerLocalResource(resourceName: string, path: string): void; | Map the "x-local://{resourceName}" => "{path}". |
| unregisterLocalResource(resourceName: string): void; | Removes the mapping from "x-local://{resourceName}" => "{path}" |
| getRegisteredLocalResource(resourceName: string): void; | Get the mapping from "x-local://{resourceName}" => "{path}" |
| loadJavaScriptFile(scriptName: string, filepath: string) | Inject a javascript-file into the webview. Should be called after the `loadFinishedEvent` |
| loadStyleSheetFile(stylesheetName: string, filepath: string, insertBefore: boolean) | Loads a CSS-file into document.head. If before is true, it will be added to the top of document.head otherwise as the last element |
| loadJavaScriptFiles(files: {resourceName: string, filepath: string}[]) | Inject multiple javascript-files into the webview. Should be called after the `loadFinishedEvent` |
| loadStyleSheetFiles(files: {resourceName: string, filepath: string, insertBefore: boolean}[]) | Loads multiple CSS-files into the document.head. If before is true, it will be added to the top of document.head otherwise as the last element |
| autoLoadJavaScriptFile(resourceName: string, filepath: string) | Register a JavaScript-file to be injected on `loadFinishedEvent`. If a page is already loaded, the script will be injected into the current page. |
| autoLoadStyleSheetFile(resourceName: string, filepath: string, insertBefore?: boolean) | Register a CSS-file to be injected on `loadFinishedEvent`. If a page is already loaded, the CSS-file will be injected into the current page. |
| autoExecuteJavaScript(scriptCode: string, name: string) | Execute a script on `loadFinishedEvent`. The script can be a promise |
| executeJavaScript(scriptCode: string) | Execute JavaScript in the webpage. *Note:* scriptCode should be ES5 compatible, or it might not work on 'iOS < 11' |
| executePromise(scriptCode: string, timeout: number = 500) | Run a promise inside the webview. *Note:* Executing scriptCode must return a promise. |
| emitToWebView(eventName: string, data: any) | Emit an event to the webview. Note: data must be stringify'able with JSON.stringify or this throws an exception. |
| getTitle() | Returns a promise with the current document title. |

## Events
| Event | Description |
| --- | --- |
| 'shouldOverideUrlLoading' | Raised before the webview requests an URL. Can cancelled by setting args.cancel = true in the `ShouldOverideUrlLoadEventData` |
| 'loadStarted' | Raised when a loadStarted event occurs. args is an `LoadStartedEventData` |
| 'loadFinished' | Raised when a loadFinished event occurs. args is an `LoadFinishedEventData` |
| Events emitted from the webview | Raised when nsWebViewBridge.emit(...) is called inside the webview. args in an `WebViewEventData` |

### WebView

Inside the WebView we have the `nsWebViewBridge` for sending events between the `NativeScript`-layer and the `WebView`.
**Note:** The bridge will only be available `DOMContentLoaded` or `onload` inside the WebView.

| Function | Description |
| --- | --- |
| window.nsWebViewBridge.on(eventName: string, cb: (data: any) => void) | Registers handlers for events from the native layer. |
| window.nsWebViewBridge.off(eventName: string, cb?: (data: any) => void) | Deregister handlers for events from the native layer. |
| window.nsWebViewBridge.emit(eventName: string, data: any) | Emits event to NativeScript layer. Will be emitted on the WebViewExt as any other event, data will be a part of the WebViewEventData-object |

## Possible features to come:

* Cookie helpers?
* Setting view-port metadata?
* Share cache with native-layer?

### Android
* Settings
    * Cache mode?
    * AppCache and AppCAchePath?
    * User agent?

#### iOS
* Optionas for native scrolllView.
* Disable/Enable scroll bounce.
* UIWebView? scalesPageToFit.

## License

Apache License Version 2.0, January 2004

## About Nota

Nota is the Danish Library and Expertise Center for people with print disabilities.
To become a member of Nota you must be able to document that you cannot read ordinary printed text. Members of Nota are visually impaired, dyslexic or otherwise impaired.
Our purpose is to ensure equal access to knowledge, community participation and experiences for people who're unable to read ordinary printed text.
