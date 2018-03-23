
declare class CustomUrlSchemeHandler extends NSObject implements WKURLSchemeTask {

	static alloc(): CustomUrlSchemeHandler; // inherited from NSObject

	static new(): CustomUrlSchemeHandler; // inherited from NSObject

	readonly debugDescription: string; // inherited from NSObjectProtocol

	readonly description: string; // inherited from NSObjectProtocol

	readonly hash: number; // inherited from NSObjectProtocol

	readonly isProxy: boolean; // inherited from NSObjectProtocol

	readonly request: NSURLRequest; // inherited from WKURLSchemeTask

	readonly superclass: typeof NSObject; // inherited from NSObjectProtocol

	readonly  // inherited from NSObjectProtocol

	class(): typeof NSObject;

	conformsToProtocol(aProtocol: any /* Protocol */): boolean;

	didFailWithError(error: NSError): void;

	didFinish(): void;

	didReceiveData(data: NSData): void;

	didReceiveResponse(response: NSURLResponse): void;

	getRegisteredLocalResourceForKey(forKey: string): string;

	isEqual(object: any): boolean;

	isKindOfClass(aClass: typeof NSObject): boolean;

	isMemberOfClass(aClass: typeof NSObject): boolean;

	performSelector(aSelector: string): any;

	performSelectorWithObject(aSelector: string, object: any): any;

	performSelectorWithObjectWithObject(aSelector: string, object1: any, object2: any): any;

	registerLocalResourceForKeyFilepath(forKey: string, filepath: string): void;

	resolveFilePath(url: NSURL): string;

	resolveMimeTypeFromFilepath(filepath: string): string;

	respondsToSelector(aSelector: string): boolean;

	retainCount(): number;

	self(): this;

	setURLSchem(scheme: string): void;

	unregisterLocalResourceForKey(forKey: string): void;

	webViewStartURLSchemeTask(webView: WKWebView, urlSchemeTask: WKURLSchemeTask): void;

	webViewStopURLSchemeTask(webView: WKWebView, urlSchemeTask: WKURLSchemeTask): void;
}

declare var NotaWebViewExtVersionNumber: number;

declare var NotaWebViewExtVersionString: interop.Reference<number>;
