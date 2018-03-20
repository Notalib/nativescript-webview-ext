//
//  CustomSchemeHandler.swift
//
//  Created by Morten Anton Bach Sjøgren on 13/03/2018.
//  Copyright © 2018 Nota. All rights reserved.
//

import Foundation
import WebKit;

enum WebErrors: Error {
    case RequestFailedError
}

@available(iOS 11.0, *)
@objc
public class CustomUrlSchemeHandler: NSObject,WKURLSchemeHandler {
    var resourceDict: [String: String] = [:];

    @objc
    public func resolveFilePath(_ url: URL) -> String? {
        NSLog("CustomUrlSchemeHandler.resolveFilePath(%@)", url.absoluteString);
        if url.absoluteString.starts(with: Constants.customURLScheme) {
            let urlStr = url.host! + url.path
            NSLog("CustomUrlSchemeHandler.resolveFilePath(%@) - path(%@)", url.absoluteString, urlStr);
            if let filepath = self.getRegisteredLocalResource(forKey: urlStr) {
                NSLog("CustomUrlSchemeHandler.resolveFilePath(%@) - path(%@) - filepath(%@)", url.absoluteString, urlStr, filepath);
                return filepath
            }
        }
        return nil;
    }
    
    @objc
    public func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        NSLog("CustomUrlSchemeHandler");
        DispatchQueue.global().async {
            NSLog("CustomUrlSchemeHandler -> global async");
            if let url = urlSchemeTask.request.url, url.scheme == Constants.customURLScheme {
                NSLog("CustomUrlSchemeHandler - URL(%@)", url.absoluteString)
                if let filepath = self.resolveFilePath(url) {
                    NSLog("CustomUrlSchemeHandler - URL(%@) path(%@)", url.absoluteString, filepath)
                    if let data = NSData.init(contentsOfFile: filepath) {
                        let urlResponse = URLResponse(url: url, mimeType: "text/css", expectedContentLength: -1, textEncodingName: nil)
                        urlSchemeTask.didReceive(urlResponse)
                        urlSchemeTask.didReceive(data as Data)
                        urlSchemeTask.didFinish()
                        return;
                    }
                } else {
                    NSLog("CustomUrlSchemeHandler - URL(%@) no path", url.absoluteString)
                }
            } else {
                NSLog("CustomUrlSchemeHandler - NO URL")
            }
            
            urlSchemeTask.didFailWithError(WebErrors.RequestFailedError)
        }
    }

    @objc
    public func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        urlSchemeTask.didFailWithError(WebErrors.RequestFailedError)
    }
    
    @objc
    public func registerLocalResource(forKey: String, filepath: String) {
        self.resourceDict[forKey] = filepath;
    }
    
    @objc
    public func unregisterLocalResource(forKey: String) {
        self.resourceDict.removeValue(forKey: forKey)
    }
    
    @objc
    public func getRegisteredLocalResource(forKey: String) -> String? {
        return self.resourceDict[forKey]
    }
}
