let webViewInterfaceJsCodePromise: Promise<string>;

if (global.TNS_WEBPACK) {
  webViewInterfaceJsCodePromise = Promise.resolve(require('raw-loader!./www/webview-interface.js'));
} else {
  const { knownFolders } = require( "tns-core-modules/file-system");

  webViewInterfaceJsCodePromise = knownFolders.currentApp()
    .getFile('tns_modules/@nota/nativescript-webview-ext/www/webview-interface.js')
    .readText();
}

export { webViewInterfaceJsCodePromise };
