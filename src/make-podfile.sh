#!/bin/bash

cat > $PWD/platforms/ios/Podfile << EOF
platform :ios, '9.0'

pod "NotaWebViewExt", :path => "$PWD/platforms/ios/NotaWebViewExt/"
EOF

cat > $PWD/platforms/ios/NotaWebViewExt/NotaWebViewExt.podspec << EOF
Pod::Spec.new do |s|
  s.name = 'NotaWebViewExt'
  s.version = '$(npx json version < package.json)'

  s.license = 'MIT'
  s.authors = { 'Notalib' => 'app@nota.dk' }
  s.homepage = 'https://github.com/Notalib/nativescript-webview-ext'
  s.source = { :git => 'https://github.com/Notalib/nativescript-webview-ext.git', :tag => s.version }
  s.summary = 'Nobody cares'

  s.ios.deployment_target = '9.0'
  s.source_files = 'NotaWebViewExt/*.swift'
end
EOF