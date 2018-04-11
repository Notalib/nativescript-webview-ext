let webViewInterfaceJsCodePromise: Promise<string>;

if (global.TNS_WEBPACK) {
  webViewInterfaceJsCodePromise = Promise.resolve(require('raw-loader!nativescript-webview-interface/www/nativescript-webview-interface.js'));
} else {
  const { knownFolders } = require( "tns-core-modules/file-system");

  webViewInterfaceJsCodePromise = knownFolders.currentApp()
    .getFile('tns_modules/nativescript-webview-interface/www/nativescript-webview-interface.js')
    .readText();
}

export { webViewInterfaceJsCodePromise };
