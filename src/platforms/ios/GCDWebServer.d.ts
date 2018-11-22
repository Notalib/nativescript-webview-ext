
declare class GCDWebDAVServer extends GCDWebServer {

	static alloc(): GCDWebDAVServer; // inherited from NSObject

	static new(): GCDWebDAVServer; // inherited from NSObject

	allowHiddenItems: boolean;

	allowedFileExtensions: NSArray<any>;

	delegate: GCDWebDAVServerDelegate;

	readonly uploadDirectory: string;

	constructor(o: { uploadDirectory: string; });

	initWithUploadDirectory(path: string): this;

	shouldCopyItemFromPathToPath(fromPath: string, toPath: string): boolean;

	shouldCreateDirectoryAtPath(path: string): boolean;

	shouldDeleteItemAtPath(path: string): boolean;

	shouldMoveItemFromPathToPath(fromPath: string, toPath: string): boolean;

	shouldUploadFileAtPathWithTemporaryFile(path: string, tempPath: string): boolean;
}

interface GCDWebDAVServerDelegate extends GCDWebServerDelegate {

	davServerDidCopyItemFromPathToPath?(server: GCDWebDAVServer, fromPath: string, toPath: string): void;

	davServerDidCreateDirectoryAtPath?(server: GCDWebDAVServer, path: string): void;

	davServerDidDeleteItemAtPath?(server: GCDWebDAVServer, path: string): void;

	davServerDidDownloadFileAtPath?(server: GCDWebDAVServer, path: string): void;

	davServerDidMoveItemFromPathToPath?(server: GCDWebDAVServer, fromPath: string, toPath: string): void;

	davServerDidUploadFileAtPath?(server: GCDWebDAVServer, path: string): void;
}
declare var GCDWebDAVServerDelegate: {

	prototype: GCDWebDAVServerDelegate;
};

declare class GCDWebServer extends NSObject {

	static alloc(): GCDWebServer; // inherited from NSObject

	static new(): GCDWebServer; // inherited from NSObject

	static setLogLevel(level: number): void;

	readonly bonjourName: string;

	readonly bonjourServerURL: NSURL;

	readonly bonjourType: string;

	delegate: GCDWebServerDelegate;

	readonly port: number;

	readonly publicServerURL: NSURL;

	readonly running: boolean;

	readonly serverURL: NSURL;

	addDefaultHandlerForMethodRequestClassAsyncProcessBlock(method: string, aClass: typeof NSObject, block: (p1: GCDWebServerRequest, p2: (p1: GCDWebServerResponse) => void) => void): void;

	addDefaultHandlerForMethodRequestClassProcessBlock(method: string, aClass: typeof NSObject, block: (p1: GCDWebServerRequest) => GCDWebServerResponse): void;

	addGETHandlerForBasePathDirectoryPathIndexFilenameCacheAgeAllowRangeRequests(basePath: string, directoryPath: string, indexFilename: string, cacheAge: number, allowRangeRequests: boolean): void;

	addGETHandlerForPathFilePathIsAttachmentCacheAgeAllowRangeRequests(path: string, filePath: string, isAttachment: boolean, cacheAge: number, allowRangeRequests: boolean): void;

	addGETHandlerForPathStaticDataContentTypeCacheAge(path: string, staticData: NSData, contentType: string, cacheAge: number): void;

	addHandlerForMethodPathRegexRequestClassAsyncProcessBlock(method: string, regex: string, aClass: typeof NSObject, block: (p1: GCDWebServerRequest, p2: (p1: GCDWebServerResponse) => void) => void): void;

	addHandlerForMethodPathRegexRequestClassProcessBlock(method: string, regex: string, aClass: typeof NSObject, block: (p1: GCDWebServerRequest) => GCDWebServerResponse): void;

	addHandlerForMethodPathRequestClassAsyncProcessBlock(method: string, path: string, aClass: typeof NSObject, block: (p1: GCDWebServerRequest, p2: (p1: GCDWebServerResponse) => void) => void): void;

	addHandlerForMethodPathRequestClassProcessBlock(method: string, path: string, aClass: typeof NSObject, block: (p1: GCDWebServerRequest) => GCDWebServerResponse): void;

	addHandlerWithMatchBlockAsyncProcessBlock(matchBlock: (p1: string, p2: NSURL, p3: NSDictionary<any, any>, p4: string, p5: NSDictionary<any, any>) => GCDWebServerRequest, processBlock: (p1: GCDWebServerRequest, p2: (p1: GCDWebServerResponse) => void) => void): void;

	addHandlerWithMatchBlockProcessBlock(matchBlock: (p1: string, p2: NSURL, p3: NSDictionary<any, any>, p4: string, p5: NSDictionary<any, any>) => GCDWebServerRequest, processBlock: (p1: GCDWebServerRequest) => GCDWebServerResponse): void;

	removeAllHandlers(): void;

	start(): boolean;

	startWithOptionsError(options: NSDictionary<any, any>): boolean;

	startWithPortBonjourName(port: number, name: string): boolean;

	stop(): void;
}

declare var GCDWebServerAuthenticationMethod_Basic: string;

declare var GCDWebServerAuthenticationMethod_DigestAccess: string;

interface GCDWebServerBodyReader extends NSObjectProtocol {

	asyncReadDataWithCompletion?(block: (p1: NSData, p2: NSError) => void): void;

	close(): void;

	open(): boolean;

	readData(): NSData;
}
declare var GCDWebServerBodyReader: {

	prototype: GCDWebServerBodyReader;
};

interface GCDWebServerBodyWriter extends NSObjectProtocol {

	close(): boolean;

	open(): boolean;

	writeDataError(data: NSData): boolean;
}
declare var GCDWebServerBodyWriter: {

	prototype: GCDWebServerBodyWriter;
};

declare const enum GCDWebServerClientErrorHTTPStatusCode {

	kGCDWebServerHTTPStatusCode_BadRequest = 400,

	kGCDWebServerHTTPStatusCode_Unauthorized = 401,

	kGCDWebServerHTTPStatusCode_PaymentRequired = 402,

	kGCDWebServerHTTPStatusCode_Forbidden = 403,

	kGCDWebServerHTTPStatusCode_NotFound = 404,

	kGCDWebServerHTTPStatusCode_MethodNotAllowed = 405,

	kGCDWebServerHTTPStatusCode_NotAcceptable = 406,

	kGCDWebServerHTTPStatusCode_ProxyAuthenticationRequired = 407,

	kGCDWebServerHTTPStatusCode_RequestTimeout = 408,

	kGCDWebServerHTTPStatusCode_Conflict = 409,

	kGCDWebServerHTTPStatusCode_Gone = 410,

	kGCDWebServerHTTPStatusCode_LengthRequired = 411,

	kGCDWebServerHTTPStatusCode_PreconditionFailed = 412,

	kGCDWebServerHTTPStatusCode_RequestEntityTooLarge = 413,

	kGCDWebServerHTTPStatusCode_RequestURITooLong = 414,

	kGCDWebServerHTTPStatusCode_UnsupportedMediaType = 415,

	kGCDWebServerHTTPStatusCode_RequestedRangeNotSatisfiable = 416,

	kGCDWebServerHTTPStatusCode_ExpectationFailed = 417,

	kGCDWebServerHTTPStatusCode_UnprocessableEntity = 422,

	kGCDWebServerHTTPStatusCode_Locked = 423,

	kGCDWebServerHTTPStatusCode_FailedDependency = 424,

	kGCDWebServerHTTPStatusCode_UpgradeRequired = 426,

	kGCDWebServerHTTPStatusCode_PreconditionRequired = 428,

	kGCDWebServerHTTPStatusCode_TooManyRequests = 429,

	kGCDWebServerHTTPStatusCode_RequestHeaderFieldsTooLarge = 431
}

declare class GCDWebServerConnection extends NSObject {

	static alloc(): GCDWebServerConnection; // inherited from NSObject

	static new(): GCDWebServerConnection; // inherited from NSObject

	readonly localAddressData: NSData;

	readonly localAddressString: string;

	readonly remoteAddressData: NSData;

	readonly remoteAddressString: string;

	readonly server: GCDWebServer;

	readonly totalBytesRead: number;

	readonly totalBytesWritten: number;

	readonly usingIPv6: boolean;

	abortRequestWithStatusCode(request: GCDWebServerRequest, statusCode: number): void;

	close(): void;

	didReadBytesLength(bytes: interop.Pointer | interop.Reference<any>, length: number): void;

	didWriteBytesLength(bytes: interop.Pointer | interop.Reference<any>, length: number): void;

	open(): boolean;

	overrideResponseForRequest(response: GCDWebServerResponse, request: GCDWebServerRequest): GCDWebServerResponse;

	preflightRequest(request: GCDWebServerRequest): GCDWebServerResponse;

	processRequestCompletion(request: GCDWebServerRequest, completion: (p1: GCDWebServerResponse) => void): void;

	rewriteRequestURLWithMethodHeaders(url: NSURL, method: string, headers: NSDictionary<any, any>): NSURL;
}

declare class GCDWebServerDataRequest extends GCDWebServerRequest {

	static alloc(): GCDWebServerDataRequest; // inherited from NSObject

	static new(): GCDWebServerDataRequest; // inherited from NSObject

	readonly data: NSData;

	readonly jsonObject: any;

	readonly text: string;
}

declare class GCDWebServerDataResponse extends GCDWebServerResponse {

	static alloc(): GCDWebServerDataResponse; // inherited from NSObject

	static new(): GCDWebServerDataResponse; // inherited from NSObject

	static response(): GCDWebServerDataResponse; // inherited from GCDWebServerResponse

	static responseWithDataContentType(data: NSData, type: string): GCDWebServerDataResponse;

	static responseWithHTML(html: string): GCDWebServerDataResponse;

	static responseWithHTMLTemplateVariables(path: string, variables: NSDictionary<any, any>): GCDWebServerDataResponse;

	static responseWithJSONObject(object: any): GCDWebServerDataResponse;

	static responseWithJSONObjectContentType(object: any, type: string): GCDWebServerDataResponse;

	static responseWithRedirectPermanent(location: NSURL, permanent: boolean): GCDWebServerDataResponse; // inherited from GCDWebServerResponse

	static responseWithStatusCode(statusCode: number): GCDWebServerDataResponse; // inherited from GCDWebServerResponse

	static responseWithText(text: string): GCDWebServerDataResponse;

	constructor(o: { data: NSData; contentType: string; });

	constructor(o: { HTML: string; });

	constructor(o: { HTMLTemplate: string; variables: NSDictionary<any, any>; });

	constructor(o: { JSONObject: any; });

	constructor(o: { JSONObject: any; contentType: string; });

	constructor(o: { text: string; });

	initWithDataContentType(data: NSData, type: string): this;

	initWithHTML(html: string): this;

	initWithHTMLTemplateVariables(path: string, variables: NSDictionary<any, any>): this;

	initWithJSONObject(object: any): this;

	initWithJSONObjectContentType(object: any, type: string): this;

	initWithText(text: string): this;
}

interface GCDWebServerDelegate extends NSObjectProtocol {

	webServerDidCompleteBonjourRegistration?(server: GCDWebServer): void;

	webServerDidConnect?(server: GCDWebServer): void;

	webServerDidDisconnect?(server: GCDWebServer): void;

	webServerDidStart?(server: GCDWebServer): void;

	webServerDidStop?(server: GCDWebServer): void;

	webServerDidUpdateNATPortMapping?(server: GCDWebServer): void;
}
declare var GCDWebServerDelegate: {

	prototype: GCDWebServerDelegate;
};

declare class GCDWebServerErrorResponse extends GCDWebServerDataResponse {

	static alloc(): GCDWebServerErrorResponse; // inherited from NSObject

	static new(): GCDWebServerErrorResponse; // inherited from NSObject

	static response(): GCDWebServerErrorResponse; // inherited from GCDWebServerResponse

	static responseWithDataContentType(data: NSData, type: string): GCDWebServerErrorResponse; // inherited from GCDWebServerDataResponse

	static responseWithHTML(html: string): GCDWebServerErrorResponse; // inherited from GCDWebServerDataResponse

	static responseWithHTMLTemplateVariables(path: string, variables: NSDictionary<any, any>): GCDWebServerErrorResponse; // inherited from GCDWebServerDataResponse

	static responseWithJSONObject(object: any): GCDWebServerErrorResponse; // inherited from GCDWebServerDataResponse

	static responseWithJSONObjectContentType(object: any, type: string): GCDWebServerErrorResponse; // inherited from GCDWebServerDataResponse

	static responseWithRedirectPermanent(location: NSURL, permanent: boolean): GCDWebServerErrorResponse; // inherited from GCDWebServerResponse

	static responseWithStatusCode(statusCode: number): GCDWebServerErrorResponse; // inherited from GCDWebServerResponse

	static responseWithText(text: string): GCDWebServerErrorResponse; // inherited from GCDWebServerDataResponse
}

declare function GCDWebServerEscapeURLString(string: string): string;

declare class GCDWebServerFileRequest extends GCDWebServerRequest {

	static alloc(): GCDWebServerFileRequest; // inherited from NSObject

	static new(): GCDWebServerFileRequest; // inherited from NSObject

	readonly temporaryPath: string;
}

declare class GCDWebServerFileResponse extends GCDWebServerResponse {

	static alloc(): GCDWebServerFileResponse; // inherited from NSObject

	static new(): GCDWebServerFileResponse; // inherited from NSObject

	static response(): GCDWebServerFileResponse; // inherited from GCDWebServerResponse

	static responseWithFile(path: string): GCDWebServerFileResponse;

	static responseWithFileByteRange(path: string, range: NSRange): GCDWebServerFileResponse;

	static responseWithFileByteRangeIsAttachment(path: string, range: NSRange, attachment: boolean): GCDWebServerFileResponse;

	static responseWithFileIsAttachment(path: string, attachment: boolean): GCDWebServerFileResponse;

	static responseWithRedirectPermanent(location: NSURL, permanent: boolean): GCDWebServerFileResponse; // inherited from GCDWebServerResponse

	static responseWithStatusCode(statusCode: number): GCDWebServerFileResponse; // inherited from GCDWebServerResponse

	constructor(o: { file: string; });

	constructor(o: { file: string; byteRange: NSRange; });

	constructor(o: { file: string; byteRange: NSRange; isAttachment: boolean; mimeTypeOverrides: NSDictionary<any, any>; });

	constructor(o: { file: string; isAttachment: boolean; });

	initWithFile(path: string): this;

	initWithFileByteRange(path: string, range: NSRange): this;

	initWithFileByteRangeIsAttachmentMimeTypeOverrides(path: string, range: NSRange, attachment: boolean, overrides: NSDictionary<any, any>): this;

	initWithFileIsAttachment(path: string, attachment: boolean): this;
}

declare function GCDWebServerFormatISO8601(date: Date): string;

declare function GCDWebServerFormatRFC822(date: Date): string;

declare function GCDWebServerGetMimeTypeForExtension(extension: string, overrides: NSDictionary<any, any>): string;

declare function GCDWebServerGetPrimaryIPAddress(useIPv6: boolean): string;

declare const enum GCDWebServerInformationalHTTPStatusCode {

	kGCDWebServerHTTPStatusCode_Continue = 100,

	kGCDWebServerHTTPStatusCode_SwitchingProtocols = 101,

	kGCDWebServerHTTPStatusCode_Processing = 102
}

declare class GCDWebServerMultiPart extends NSObject {

	static alloc(): GCDWebServerMultiPart; // inherited from NSObject

	static new(): GCDWebServerMultiPart; // inherited from NSObject

	readonly contentType: string;

	readonly controlName: string;

	readonly mimeType: string;
}

declare class GCDWebServerMultiPartArgument extends GCDWebServerMultiPart {

	static alloc(): GCDWebServerMultiPartArgument; // inherited from NSObject

	static new(): GCDWebServerMultiPartArgument; // inherited from NSObject

	readonly data: NSData;

	readonly string: string;
}

declare class GCDWebServerMultiPartFile extends GCDWebServerMultiPart {

	static alloc(): GCDWebServerMultiPartFile; // inherited from NSObject

	static new(): GCDWebServerMultiPartFile; // inherited from NSObject

	readonly fileName: string;

	readonly temporaryPath: string;
}

declare class GCDWebServerMultiPartFormRequest extends GCDWebServerRequest {

	static alloc(): GCDWebServerMultiPartFormRequest; // inherited from NSObject

	static mimeType(): string;

	static new(): GCDWebServerMultiPartFormRequest; // inherited from NSObject

	readonly arguments: NSArray<any>;

	readonly files: NSArray<any>;

	firstArgumentForControlName(name: string): GCDWebServerMultiPartArgument;

	firstFileForControlName(name: string): GCDWebServerMultiPartFile;
}

declare var GCDWebServerOption_AuthenticationAccounts: string;

declare var GCDWebServerOption_AuthenticationMethod: string;

declare var GCDWebServerOption_AuthenticationRealm: string;

declare var GCDWebServerOption_AutomaticallyMapHEADToGET: string;

declare var GCDWebServerOption_AutomaticallySuspendInBackground: string;

declare var GCDWebServerOption_BindToLocalhost: string;

declare var GCDWebServerOption_BonjourName: string;

declare var GCDWebServerOption_BonjourType: string;

declare var GCDWebServerOption_ConnectedStateCoalescingInterval: string;

declare var GCDWebServerOption_ConnectionClass: string;

declare var GCDWebServerOption_DispatchQueuePriority: string;

declare var GCDWebServerOption_MaxPendingConnections: string;

declare var GCDWebServerOption_Port: string;

declare var GCDWebServerOption_RequestNATPortMapping: string;

declare var GCDWebServerOption_ServerName: string;

declare function GCDWebServerParseISO8601(string: string): Date;

declare function GCDWebServerParseRFC822(string: string): Date;

declare function GCDWebServerParseURLEncodedForm(form: string): NSDictionary<any, any>;

declare const enum GCDWebServerRedirectionHTTPStatusCode {

	kGCDWebServerHTTPStatusCode_MultipleChoices = 300,

	kGCDWebServerHTTPStatusCode_MovedPermanently = 301,

	kGCDWebServerHTTPStatusCode_Found = 302,

	kGCDWebServerHTTPStatusCode_SeeOther = 303,

	kGCDWebServerHTTPStatusCode_NotModified = 304,

	kGCDWebServerHTTPStatusCode_UseProxy = 305,

	kGCDWebServerHTTPStatusCode_TemporaryRedirect = 307,

	kGCDWebServerHTTPStatusCode_PermanentRedirect = 308
}

declare class GCDWebServerRequest extends NSObject implements GCDWebServerBodyWriter {

	static alloc(): GCDWebServerRequest; // inherited from NSObject

	static new(): GCDWebServerRequest; // inherited from NSObject

	readonly URL: NSURL;

	readonly acceptsGzipContentEncoding: boolean;

	readonly byteRange: NSRange;

	readonly contentLength: number;

	readonly contentType: string;

	readonly headers: NSDictionary<any, any>;

	readonly ifModifiedSince: Date;

	readonly ifNoneMatch: string;

	readonly localAddressData: NSData;

	readonly localAddressString: string;

	readonly method: string;

	readonly path: string;

	readonly query: NSDictionary<any, any>;

	readonly remoteAddressData: NSData;

	readonly remoteAddressString: string;

	readonly debugDescription: string; // inherited from NSObjectProtocol

	readonly description: string; // inherited from NSObjectProtocol

	readonly hash: number; // inherited from NSObjectProtocol

	readonly isProxy: boolean; // inherited from NSObjectProtocol

	readonly superclass: typeof NSObject; // inherited from NSObjectProtocol

	constructor(o: { method: string; url: NSURL; headers: NSDictionary<any, any>; path: string; query: NSDictionary<any, any>; });

	attributeForKey(key: string): any;

	class(): typeof NSObject;

	close(): boolean;

	conformsToProtocol(aProtocol: any /* Protocol */): boolean;

	hasBody(): boolean;

	hasByteRange(): boolean;

	initWithMethodUrlHeadersPathQuery(method: string, url: NSURL, headers: NSDictionary<any, any>, path: string, query: NSDictionary<any, any>): this;

	isEqual(object: any): boolean;

	isKindOfClass(aClass: typeof NSObject): boolean;

	isMemberOfClass(aClass: typeof NSObject): boolean;

	open(): boolean;

	performSelector(aSelector: string): any;

	performSelectorWithObject(aSelector: string, object: any): any;

	performSelectorWithObjectWithObject(aSelector: string, object1: any, object2: any): any;

	respondsToSelector(aSelector: string): boolean;

	retainCount(): number;

	self(): this;

	writeDataError(data: NSData): boolean;
}

declare var GCDWebServerRequestAttribute_RegexCaptures: string;

declare class GCDWebServerResponse extends NSObject implements GCDWebServerBodyReader {

	static alloc(): GCDWebServerResponse; // inherited from NSObject

	static new(): GCDWebServerResponse; // inherited from NSObject

	static response(): GCDWebServerResponse;

	static responseWithRedirectPermanent(location: NSURL, permanent: boolean): GCDWebServerResponse;

	static responseWithStatusCode(statusCode: number): GCDWebServerResponse;

	cacheControlMaxAge: number;

	contentLength: number;

	contentType: string;

	eTag: string;

	gzipContentEncodingEnabled: boolean;

	lastModifiedDate: Date;

	statusCode: number;

	readonly debugDescription: string; // inherited from NSObjectProtocol

	readonly description: string; // inherited from NSObjectProtocol

	readonly hash: number; // inherited from NSObjectProtocol

	readonly isProxy: boolean; // inherited from NSObjectProtocol

	readonly superclass: typeof NSObject; // inherited from NSObjectProtocol

	constructor(o: { redirect: NSURL; permanent: boolean; });

	constructor(o: { statusCode: number; });

	asyncReadDataWithCompletion(block: (p1: NSData, p2: NSError) => void): void;

	class(): typeof NSObject;

	close(): void;

	conformsToProtocol(aProtocol: any /* Protocol */): boolean;

	hasBody(): boolean;

	initWithRedirectPermanent(location: NSURL, permanent: boolean): this;

	initWithStatusCode(statusCode: number): this;

	isEqual(object: any): boolean;

	isKindOfClass(aClass: typeof NSObject): boolean;

	isMemberOfClass(aClass: typeof NSObject): boolean;

	open(): boolean;

	performSelector(aSelector: string): any;

	performSelectorWithObject(aSelector: string, object: any): any;

	performSelectorWithObjectWithObject(aSelector: string, object1: any, object2: any): any;

	readData(): NSData;

	respondsToSelector(aSelector: string): boolean;

	retainCount(): number;

	self(): this;

	setValueForAdditionalHeader(value: string, header: string): void;
}

declare const enum GCDWebServerServerErrorHTTPStatusCode {

	kGCDWebServerHTTPStatusCode_InternalServerError = 500,

	kGCDWebServerHTTPStatusCode_NotImplemented = 501,

	kGCDWebServerHTTPStatusCode_BadGateway = 502,

	kGCDWebServerHTTPStatusCode_ServiceUnavailable = 503,

	kGCDWebServerHTTPStatusCode_GatewayTimeout = 504,

	kGCDWebServerHTTPStatusCode_HTTPVersionNotSupported = 505,

	kGCDWebServerHTTPStatusCode_InsufficientStorage = 507,

	kGCDWebServerHTTPStatusCode_LoopDetected = 508,

	kGCDWebServerHTTPStatusCode_NotExtended = 510,

	kGCDWebServerHTTPStatusCode_NetworkAuthenticationRequired = 511
}

declare class GCDWebServerStreamedResponse extends GCDWebServerResponse {

	static alloc(): GCDWebServerStreamedResponse; // inherited from NSObject

	static new(): GCDWebServerStreamedResponse; // inherited from NSObject

	static response(): GCDWebServerStreamedResponse; // inherited from GCDWebServerResponse

	static responseWithContentTypeAsyncStreamBlock(type: string, block: (p1: (p1: NSData, p2: NSError) => void) => void): GCDWebServerStreamedResponse;

	static responseWithContentTypeStreamBlock(type: string, block: (p1: interop.Pointer | interop.Reference<NSError>) => NSData): GCDWebServerStreamedResponse;

	static responseWithRedirectPermanent(location: NSURL, permanent: boolean): GCDWebServerStreamedResponse; // inherited from GCDWebServerResponse

	static responseWithStatusCode(statusCode: number): GCDWebServerStreamedResponse; // inherited from GCDWebServerResponse

	constructor(o: { contentType: string; asyncStreamBlock: (p1: (p1: NSData, p2: NSError) => void) => void; });

	constructor(o: { contentType: string; streamBlock: (p1: interop.Pointer | interop.Reference<NSError>) => NSData; });

	initWithContentTypeAsyncStreamBlock(type: string, block: (p1: (p1: NSData, p2: NSError) => void) => void): this;

	initWithContentTypeStreamBlock(type: string, block: (p1: interop.Pointer | interop.Reference<NSError>) => NSData): this;
}

declare const enum GCDWebServerSuccessfulHTTPStatusCode {

	kGCDWebServerHTTPStatusCode_OK = 200,

	kGCDWebServerHTTPStatusCode_Created = 201,

	kGCDWebServerHTTPStatusCode_Accepted = 202,

	kGCDWebServerHTTPStatusCode_NonAuthoritativeInformation = 203,

	kGCDWebServerHTTPStatusCode_NoContent = 204,

	kGCDWebServerHTTPStatusCode_ResetContent = 205,

	kGCDWebServerHTTPStatusCode_PartialContent = 206,

	kGCDWebServerHTTPStatusCode_MultiStatus = 207,

	kGCDWebServerHTTPStatusCode_AlreadyReported = 208
}

declare class GCDWebServerURLEncodedFormRequest extends GCDWebServerDataRequest {

	static alloc(): GCDWebServerURLEncodedFormRequest; // inherited from NSObject

	static mimeType(): string;

	static new(): GCDWebServerURLEncodedFormRequest; // inherited from NSObject

	readonly arguments: NSDictionary<any, any>;
}

declare function GCDWebServerUnescapeURLString(string: string): string;

declare var GCDWebServerVersionNumber: number;

declare var GCDWebServerVersionString: interop.Reference<number>;
