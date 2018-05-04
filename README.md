# @nota/nativescript-webview-ext

Extended version of the NativeScript's built'in WebView.

## Features
* Adds a custom-scheme handler for x-local:// to the webview for loading of resources inside the webview.
    * Note: For iOS 11+ WKWebView is used, but for iOS <11 UIWebView is used
* Adds support for capturing URLs This allows the app to open external links in an external browser and handle tel-links
* Adds `executeJavaScript(code: string)`-function.
* Adds functions to load `css`- and `javascript`-files in the running webpage.
    * Supports loading into the current page and setting up auto-loading for every loaded page.

### Possible features to come:

* Cookie helpers
* Setting view-port metadata

### Android
* Setup remote debugging, e.g calling `android.webkit.WebView.setWebContentsDebuggingEnabled(true);`

#### iOS
* Option for disabling bounce/scroll
* Setting `base` for local files

## (Optional) Prerequisites / Requirements

TODO

## Installation

Describe your plugin installation steps. Ideally it would be something like:

```bash
tns plugin add @nota/nativescript-webview-ext
```

## Usage

| Property | Default | Description |
| --- | --- | --- |
| isUIWebView | true if `iOS <11` | Is the native webview an UIWebView? |
| isWkWebView | true if `iOS >=11` | Is the native webview an WKWebView? |

| Function | Description |
| --- | --- |
| registerLocalResource(name: string, path: string): void; | map the x-local://{name} => {path} |
| unregisterLocalResource(name: string): void; | Removes the mapping from x-local://{name} => {path} |
| unregisterLocalResource(name: string): void; | Removes the mapping from x-local://{name} => {path} |
| loadJavaScriptFile(scriptName: string, filepath: string) | Inject a javascript-file into the webview. Should be called after the `loadFinishedEvent` |
| loadStyleSheetFile(stylesheetName: string, insertBefore: boolean, filepath: string) | Loads a CSS-file into document.head. If before is true, it will be added to the top of document.head otherwise as the last element |
| executeJavaScript(scriptCode: string) | Execute JavaScript in the webpage. Note: For `android <19` returns an empty promise |

## Limitations

Uses UIWebView on iOS older than iOS 11 and WKWebView from iOS 11.
iOS 11 adds support for setting a `WKURLSchemeHandler` on the `WKWebView`.
Prior to iOS 11 there isn't support for intercepting the URL in `WKWebView`,
so we use a custom `NSURLProtocol` + `UIWebView` on older `iOS` versions.

**Important**: This custom `NSURLProtocol` is shared on all instances of the webview in the App, so mapping `x-local://local-filename.js` => `file://app/full/path/local-filename.js` is shared between them.

## API

TODO

## License

Apache License Version 2.0, January 2004

## About Nota

Nota is the Danish Library and Expertise Center for people with print disabilities.
To become a member of Nota you must be able to document that you cannot read ordinary printed text. Members of Nota are visually impaired, dyslexic or otherwise impaired.
Our purpose is to ensure equal access to knowledge, community participation and experiences for people who're unable to read ordinary printed text.
