# @nota/nativescript-webview-ext

Extended WebView for NativeScript which adds "x-local"-custom-scheme for loading local-files, handle events between WebView and NativeScript, JavaScript execution, injecting CSS and JS-files.
Supports Android 19+ and iOS9+.

## Features
* Adds a custom-scheme handler for `x-local://` to the webview for loading of resources inside the webview.
    * Note: This is **not** supported on iOS <11
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
* Allows `alert`, `confirm` and `prompt` with `WkWebView`.
* Supports:
    * Android 19+
    * iOS 11+: Full support
    * iOS <11: Partial support

## Installation

Describe your plugin installation steps. Ideally it would be something like:

```bash
tns plugin add @nota/nativescript-webview-ext
```

### Update minSdkVersion to 19 or higher

Android SDK 19 is required, update `App_Resources/Android/app.gradle`:  
```
android {
  defaultConfig {
    minSdkVersion 19 // change this line
    generatedDensities = []
  }
  aaptOptions {
    additionalParameters "--no-version-vectors"
  }
}
```

### Core support
Load in template like this:

```xml
<Page class="page" xmlns="http://schemas.nativescript.org/tns.xsd" xmlns:nota="@nota/nativescript-webview-ext">
    <ActionBar class="action-bar">
        <Label class="action-bar-title" text="Home"></Label>
    </ActionBar>

    <nota:WebViewExt src="https://nota.dk"></<nota:WebViewExt>
</Page>
```

### Angular support

Import `WebViewExtModule` from `@nota/nativescript-webview-ext/angular` and add it to your `NgModule`.

This registers the element `WebViewExt`. Replace the `<WebView>` tag with `<WebViewExt>`

### Vue support

Import `@nota/nativescript-webview-ext/vue` in your app entry file (likely app.js or main.js).

This registers the element `WebViewExt`. Replace the `<WebView>` tag with `<WebViewExt>`

## Usage

## Limitations

The custom-scheme handler for `x-local://` is only supported by `Android` and `iOS 11+`

Custom-scheme support for `iOS <11` was removed because of [ITMS-90809](https://forums.developer.apple.com/thread/122114).

## API

### NativeScript View

| Property | Value | Description |
| --- | --- | --- |
| readonly supportXLocalScheme | true / false | Is `x-local://` supported? True on `iOS >= 11` or `Android`, False on `iOS < 11`. |
| src | | Load src |
| autoInjectJSBridge | true / false | Should the window.nsWebViewBridge be injected on `loadFinishedEvent`? Defaults to true |
| builtInZoomControls | true / false | Android: Is the built-in zoom mechanisms being used |
| cacheMode | default / no_cache / cache_first / cache_only | Android: Set caching mode. |
| databaseStorage | true / false | Android: Enable/Disabled database storage API. Note: It affects all webviews in the process. |
| debugMode | true / false | Android: Enable chrome debugger for webview on Android. Note: Applies to all webviews in App |
| displayZoomControls | true / false | Android: displays on-screen zoom controls when using the built-in zoom mechanisms |
| domStorage | true / false | Android: Enable/Disabled DOM Storage API. E.g localStorage |
| scrollBounce | true / false | iOS: Should the scrollView bounce? Defaults to true. |
| supportZoom | true / false | Android: should the webview support zoom |
| viewPortSize | false / view-port string / ViewPortProperties | Set the viewport metadata on load finished. **Note:** WkWebView sets initial-scale=1.0 by default. |

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
| loadFinished | Raised when a loadFinished event occurs. args is a `LoadFinishedEventData` |
| loadProgress | Android only: Raised during page load to indicate the progress. args is a `LoadProgressEventData` |
| loadStarted | Raised when a loadStarted event occurs. args is a `LoadStartedEventData` |
| shouldOverrideUrlLoading | Raised before the webview requests an URL. Can cancelled by setting args.cancel = true in the `ShouldOverrideUrlLoadEventData` |
| titleChanged | Document title changed |
| webAlert | Raised when `window.alert` is triggered inside the webview, needed to use custom dialogs for web alerts. args in a `WebAlertEventData`. `args.callback()` must be called to indicate alert is closed. |
| webConfirm | Raised when `window.confirm` is triggered inside the webview, needed to use custom dialogs for web confirm boxes. args in a `webConfirmEvent`. `args.callback(boolean)` must be called to indicate confirm box is closed. |
| webConsole | Android only: Raised when a line is added to the web console. args is a `WebConsoleEventData`. |
| webPrompt | Raised when `window.prompt` is triggered inside the webview, needed to use custom dialogs for web prompt boxes. args in a `webConfirmEvent`. `args.callback(string | null)` must be called to indicate prompt box is closed. |
| Events emitted from the webview | Raised when nsWebViewBridge.emit(...) is called inside the webview. args in an `WebViewEventData` |

### WebView

Inside the WebView we have the `nsWebViewBridge` for sending events between the `NativeScript`-layer and the `WebView`.
**Note:** The bridge will only be available `DOMContentLoaded` or `onload` inside the WebView.

| Function | Description |
| --- | --- |
| window.nsWebViewBridge.on(eventName: string, cb: (data: any) => void) | Registers handlers for events from the native layer. |
| window.nsWebViewBridge.off(eventName: string, cb?: (data: any) => void) | Unregister handlers for events from the native layer. |
| window.nsWebViewBridge.emit(eventName: string, data: any) | Emits event to NativeScript layer. Will be emitted on the WebViewExt as any other event, data will be a part of the WebViewEventData-object |

#### Waiting for nsWebViewBridge to be available

```javascript
    window.addEventListener("ns-bridge-ready", function(e) {
        var nsWebViewBridge = e.detail || window.nsWebViewBridge;
        
        // do stuff here
    });
```

## Possible features to come:

* Cookie helpers?
* Share cache with native-layer?

### Android
* Settings
    * AppCache?
    * User agent?

#### iOS
* Settings?

## Demo and unit tests

### Running the demo

To run the demo-project, the plugin must be build locally and a http-server must be running.

The easiest way to run the demo is to follow these steps:
- Clone the git repository from https://github.com/Notalib/nativescript-webview-ext.git
- Go into the `src`-folder
- Use the npm-scripts:
  - npm run demo.ios
  - npm run demo.android

### Running the unit-tests

- Clone the git repository from https://github.com/Notalib/nativescript-webview-ext.git
- Go into the `src`-folder
- Use the npm-scripts:
  - npm run test.ios
  - npm run test.android

## License

Apache License Version 2.0, January 2004

## About Nota

Nota is the Danish Library and Expertise Center for people with print disabilities.
To become a member of Nota you must be able to document that you cannot read ordinary printed text. Members of Nota are visually impaired, dyslexic or otherwise impaired.
Our purpose is to ensure equal access to knowledge, community participation and experiences for people who're unable to read ordinary printed text.
