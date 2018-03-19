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
    @objc
    public func resolveFilePath(_ url: String) -> String? {
        NSLog("CustomUrlSchemeHandler.resolveFilePath(%@)", url);
        return nil;
    }
    
    @objc
    public func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        NSLog("CustomUrlSchemeHandler");
        DispatchQueue.global().async {
            NSLog("CustomUrlSchemeHandler -> global async");
            if let url = urlSchemeTask.request.url, url.scheme == Constants.customURLScheme {
                NSLog("CustomUrlSchemeHandler - URL(%@)", url.absoluteString)
                if let filepath = self.resolveFilePath(url.absoluteString) {
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
}
