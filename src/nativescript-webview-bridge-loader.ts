let webViewBridgeJsCodePromise: Promise<string>;

if (global.TNS_WEBPACK) {
  webViewBridgeJsCodePromise = Promise.resolve(require('raw-loader!./www/ns-webview-bridge.js'));
} else {
  const { knownFolders } = require( "tns-core-modules/file-system");

  webViewBridgeJsCodePromise = knownFolders.currentApp()
    .getFile('tns_modules/@nota/nativescript-webview-ext/www/ns-webview-bridge.js')
    .readText();
}

export { webViewBridgeJsCodePromise };
  