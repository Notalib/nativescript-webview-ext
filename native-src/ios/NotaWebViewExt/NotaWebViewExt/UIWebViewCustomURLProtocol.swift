//
//  UIWebViewCustomURLProtocol.swift
//  NotaWebViewExt
//
//  Created by Morten Anton Bach Sjøgren on 11/04/2018.
//  Copyright © 2018 Nota. All rights reserved.
//

import Foundation

@objc
public class CustomNSURLProtocol: URLProtocol,NSURLConnectionDelegate,URLSessionDelegate,URLSessionTaskDelegate {
    
    @objc
    override public class func canInit(with request: URLRequest) -> Bool {
        if let url = request.url, url.scheme == Constants.customURLScheme {
            return true
        }
        return false
    }
    
    @objc
    override public class func canInit(with task: URLSessionTask) -> Bool {
        let _ = task.currentRequest?.url
        return false
    }
    
    @objc
    override public class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request;
    }
    
    @objc
    public static var resourceDict: [String: String] = [:];

    @objc
    public static func resolveFilePath(_ url: URL) -> String? {
        NSLog("CustomUrlSchemeHandler.resolveFilePath(%@)", url.absoluteString);
        if url.absoluteString.starts(with: Constants.customURLScheme) {
            let urlStr = url.host! + url.path
            NSLog("CustomUrlSchemeHandler.resolveFilePath(%@) - path(%@)", url.absoluteString, urlStr);
            if let filepath = CustomNSURLProtocol.getRegisteredLocalResource(forKey: urlStr) {
                NSLog("CustomUrlSchemeHandler.resolveFilePath(%@) - path(%@) - filepath(%@)", url.absoluteString, urlStr, filepath);
                return filepath
            }
        }
        return nil;
    }
    
    @objc
    public static func registerLocalResource(forKey: String, filepath: String) {
        self.resourceDict[forKey] = filepath;
    }
    
    @objc
    public static func unregisterLocalResource(forKey: String) {
        self.resourceDict.removeValue(forKey: forKey)
    }
    
    @objc
    public static func getRegisteredLocalResource(forKey: String) -> String? {
        return self.resourceDict[forKey]
    }

    var mimeType: [String: String] = [
        "css": "text/css",
        "js": "text/javascript",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "svg": "image/svg+xml",
    ];
    
    @objc
    public func resolveMimeTypeFrom(filepath: String) -> String {
        let ext = URL(fileURLWithPath: filepath).pathExtension;
        NSLog("CustomUrlSchemeHandler.resolveMimeTypeFrom(%@) - ext(%@)", filepath, ext)
        if let mimetype = self.mimeType[ext] {
            NSLog("CustomUrlSchemeHandler.resolveMimeTypeFrom(%@) - ext(%@) -> mimetype(%@)", filepath, ext, mimetype)
            return mimetype
        }
        
        return "application/octet-stream"
    }

    @objc
    override public func startLoading() {
        DispatchQueue.global().async {
            if let url = self.request.url, url.scheme == Constants.customURLScheme {
                if let filepath = CustomNSURLProtocol.resolveFilePath(url) {
                    let mimeType = self.resolveMimeTypeFrom(filepath: filepath);
                    if let data = NSData.init(contentsOfFile: filepath) {
                        let urlResponse = URLResponse(url: url, mimeType: mimeType, expectedContentLength: -1, textEncodingName: nil)
                        
                        self.client?.urlProtocol(self, didReceive: urlResponse, cacheStoragePolicy: .notAllowed)
                        self.client?.urlProtocol(self, didLoad: data as Data)
                        self.client?.urlProtocolDidFinishLoading(self)
                    }
                }
            }
        }
    }
    
    @objc
    override public func stopLoading() {
        
    }
}
