import "tslib";

import * as fs from "fs";
import { promisify } from "util";

const fsWriteFile = promisify(fs.writeFile);
const fsReadFile = promisify(fs.readFile);
const podFilePath = `${__dirname}/platforms/ios/Podfile`;
const podSpecFilePath = `${__dirname}/platforms/ios/NotaWebViewExt/NotaWebViewExt.podspec`;

async function writePodFile() {
    const content = `platform :ios, '9.0'

pod "NotaWebViewExt", :path => "${__dirname}/platforms/ios/NotaWebViewExt/"
`;

    await fsWriteFile(podFilePath, content);
}

async function writePodSpec() {
    const content = `Pod::Spec.new do |s|
  s.name = 'NotaWebViewExt'
  s.version = '${process.env.npm_package_version}'

  s.license = 'MIT'
  s.authors = { 'Notalib' => 'app@nota.dk' }
  s.homepage = 'https://github.com/Notalib/nativescript-webview-ext'
  s.source = { :git => 'https://github.com/Notalib/nativescript-webview-ext.git', :tag => s.version }
  s.summary = 'Nobody cares'

  s.ios.deployment_target = '9.0'
  s.source_files = 'NotaWebViewExt/*.swift'
  s.swift_version = '4.0'
end
`;

    await fsWriteFile(podSpecFilePath, content);
}

async function nativescriptWebviewBridgeLoader() {
    let template = await fsReadFile("./nativescript-webview-bridge-loader.ts.tmpl", "UTF-8");

    const values = {
        fetchPolyfill: await fsReadFile("./polyfills/fetch-polyfill.js", "UTF-8"),
        promisePolyfill: await fsReadFile("./polyfills/promise-polyfill.js", "UTF-8"),
        webViewBridge: await fsReadFile("./www/ns-webview-bridge.js", "UTF-8"),
        metadataViewPort: await fsReadFile("./www/metadata-view-port.js", "UTF-8"),
    };

    for (const [name, value] of Object.entries(values)) {
        template = template.replace(`<?= ${name} ?>`, escape(value));
    }

    await fsWriteFile("./nativescript-webview-bridge-loader.ts", template);
}

async function worker() {
    await writePodFile();
    await writePodSpec();
    await nativescriptWebviewBridgeLoader();
}

worker();
