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
            
            let urlResponse = URLResponse(url: url, mimeType: mimeType, expectedContentLength: -1, textEncodingName: nil)
            urlSchemeTask.didReceive(urlResponse)
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
    
    @objc
    public func checkTcpPortForListen(port: in_port_t) -> Bool {
        let socketFileDescriptor = socket(AF_INET, SOCK_STREAM, 0)
        if socketFileDescriptor == -1 {
            return false
        }
        
        var addr = sockaddr_in()
        let sizeOfSockkAddr = MemoryLayout<sockaddr_in>.size
        addr.sin_len = __uint8_t(sizeOfSockkAddr)
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = Int(OSHostByteOrder()) == OSLittleEndian ? _OSSwapInt16(port) : port
        addr.sin_addr = in_addr(s_addr: inet_addr("0.0.0.0"))
        addr.sin_zero = (0, 0, 0, 0, 0, 0, 0, 0)
        var bind_addr = sockaddr()
        memcpy(&bind_addr, &addr, Int(sizeOfSockkAddr))
        
        if Darwin.bind(socketFileDescriptor, &bind_addr, socklen_t(sizeOfSockkAddr)) == -1 {
            release(socket: socketFileDescriptor)
            return false
        }
        if listen(socketFileDescriptor, SOMAXCONN ) == -1 {
            release(socket: socketFileDescriptor)
            return false;
        }
        release(socket: socketFileDescriptor)
        return true
    }
    
    private func release(socket: Int32) {
        Darwin.shutdown(socket, SHUT_RDWR)
        close(socket)
    }
}
