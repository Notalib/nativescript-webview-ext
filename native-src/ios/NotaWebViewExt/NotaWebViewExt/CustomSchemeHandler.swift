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
@objc class CustomUrlSchemeHandler: NSObject,WKURLSchemeHandler {
    @objc
    func resolveFilePath(_ url: String) -> String? {
        return nil;
    }
    
    @objc
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        DispatchQueue.global().async {
            if let url = urlSchemeTask.request.url, url.scheme == Constants.customURLScheme {
                if let filepath = self.resolveFilePath(url.path) {
                    if let data = NSData.init(contentsOfFile: filepath) {
                        let urlResponse = URLResponse(url: url, mimeType: "image/jpeg", expectedContentLength: -1, textEncodingName: nil)
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
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        urlSchemeTask.didFailWithError(WebErrors.RequestFailedError)
    }
}

