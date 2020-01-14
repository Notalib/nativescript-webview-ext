//
//  WKWebviewCustomSchemeHandler.swift
//  NotaWebViewExt
//
//  Created by Morten Anton Bach Sjøgren on 14/01/2020.
//  Copyright © 2020 Morten Anton Bach Sjøgren. All rights reserved.
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
        guard url.absoluteString.starts(with: Constants.customURLScheme) else {
            NSLog("CustomUrlSchemeHandler.resolveFilePath(%@) - invalid scheme", url.absoluteString);
            return nil
        }
        let urlStr = url.host! + url.path
        NSLog("CustomUrlSchemeHandler.resolveFilePath(%@) - path(%@)", url.absoluteString, urlStr);
        guard let filepath = self.getRegisteredLocalResource(forKey: urlStr) else {
            NSLog("CustomUrlSchemeHandler.resolveFilePath(%@) - no path", url.absoluteString);
            return nil;
        }

        NSLog("CustomUrlSchemeHandler.resolveFilePath(%@) - path(%@) - filepath(%@)", url.absoluteString, urlStr, filepath);
        return filepath
    }

    @objc
    public func resolveMimeTypeFrom(filepath: String) -> String {
        let ext = URL(fileURLWithPath: filepath).pathExtension;
        NSLog("CustomUrlSchemeHandler.resolveMimeTypeFrom(%@) - ext(%@)", filepath, ext)
        if let mimetype = Constants.mimeType[ext] {
            NSLog("CustomUrlSchemeHandler.resolveMimeTypeFrom(%@) - ext(%@) -> mimetype(%@)", filepath, ext, mimetype)
            return mimetype
        }

        return "application/octet-stream"
    }

    @objc
    public func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        NSLog("CustomUrlSchemeHandler");
        DispatchQueue.global().async {
            NSLog("CustomUrlSchemeHandler -> global async");
            guard let url = urlSchemeTask.request.url, url.scheme == Constants.customURLScheme else {
                NSLog("CustomUrlSchemeHandler - NO URL")
                urlSchemeTask.didFailWithError(WebErrors.RequestFailedError)
                return;
            }
            NSLog("CustomUrlSchemeHandler - URL(%@)", url.absoluteString)
            guard let filepath = self.resolveFilePath(url) else {
                NSLog("CustomUrlSchemeHandler - URL(%@) no path", url.absoluteString)
                urlSchemeTask.didFailWithError(WebErrors.RequestFailedError)
                return;
            }
            let mimeType = self.resolveMimeTypeFrom(filepath: filepath);
            NSLog("CustomUrlSchemeHandler - URL(%@) path(%@)", url.absoluteString, filepath)
            guard let data = NSData.init(contentsOfFile: filepath) else {
                NSLog("CustomUrlSchemeHandler - URL(%@) path(%@) no data", url.absoluteString, filepath)
                urlSchemeTask.didFailWithError(WebErrors.RequestFailedError)
                return;
            }

            let urlResponse = HTTPURLResponse.init(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": mimeType])

            urlSchemeTask.didReceive(urlResponse!)
            urlSchemeTask.didReceive(data as Data)
            urlSchemeTask.didFinish()
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

    @objc
    public func clearRegisteredLocalResource() {
        self.resourceDict = [:]
    }
}
