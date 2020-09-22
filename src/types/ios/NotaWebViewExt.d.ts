/// <reference path="../../node_modules/@nativescript/types-ios/index.d.ts" />

declare class CustomUrlSchemeHandler extends NSObject {

	static alloc(): CustomUrlSchemeHandler; // inherited from NSObject

	static new(): CustomUrlSchemeHandler; // inherited from NSObject

	checkTcpPortForListenWithPort(port: number): boolean;

	clearRegisteredLocalResource(): void;

	getRegisteredLocalResourceForKey(forKey: string): string;

	registerLocalResourceForKeyFilepath(forKey: string, filepath: string): void;

	resolveFilePath(url: NSURL): string;

	resolveMimeTypeFromFilepath(filepath: string): string;

	unregisterLocalResourceForKey(forKey: string): void;

	webViewStartURLSchemeTask(webView: WKWebView, urlSchemeTask: WKURLSchemeTask): void;

	webViewStopURLSchemeTask(webView: WKWebView, urlSchemeTask: WKURLSchemeTask): void;
}

declare var NotaWebViewExtVersionNumber: number;

declare var NotaWebViewExtVersionString: interop.Reference<number>;
