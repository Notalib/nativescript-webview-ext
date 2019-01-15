import "tslib";

import * as fs from "fs";
import { promisify } from "util";

const fsWrite = promisify(fs.writeFile);
const podFilePath = `${__dirname}/platforms/ios/Podfile`;
const podSpecFilePath = `${__dirname}/platforms/ios/NotaWebViewExt/NotaWebViewExt.podspec`;

async function writePodFile() {
    const content = `
platform :ios, '9.0'

pod "NotaWebViewExt", :path => "${__dirname}/platforms/ios/NotaWebViewExt/"
`;

    await fsWrite(podFilePath, content);
}

async function writePodSpec() {
    const content = `
Pod::Spec.new do |s|
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

    await fsWrite(podSpecFilePath, content);
}

async function worker() {
    await writePodFile();
    await writePodSpec();
}

worker();
