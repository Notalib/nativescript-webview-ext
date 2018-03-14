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
        NSLog(url);
        return nil;
    }
    
    @objc
    public func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        DispatchQueue.global().async {
            if let url = urlSchemeTask.request.url, url.scheme == Constants.customURLScheme {
                if let filepath = self.resolveFilePath(url.path) {
                    NSLog(filepath);
                    if let data = NSData.init(contentsOfFile: filepath) {
                        let urlResponse = URLResponse(url: url, mimeType: "text/css", expectedContentLength: -1, textEncodingName: nil)
                        urlSchemeTask.didReceive(urlResponse)
                        urlSchemeTask.didReceive(data as Data)
                        urlSchemeTask.didFinish()
                        return;
                    }
                }
            }
            
            urlSchemeTask.didFailWithError(WebErrors.RequestFailedError)
        }
    }

    @objc
    public func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        urlSchemeTask.didFailWithError(WebErrors.RequestFailedError)
    }
}
