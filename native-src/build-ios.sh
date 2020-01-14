#!/bin/bash

# Based on https://appspector.com/blog/xcframeworks

# Archive for iOS
xcodebuild archive -scheme ios/NotaWebViewExt -destination="iOS" -archivePath /tmp/xcf/ios.xcarchive -derivedDataPath /tmp/iphoneos -sdk iphoneos SKIP_INSTALL=NO BUILD_LIBRARIES_FOR_DISTRIBUTION=YES

# Archive for simulator
xcodebuild archive -scheme ios/NotaWebViewExt -destination="iOS Simulator" -archivePath /tmp/xcf/iossimulator.xcarchive -derivedDataPath /tmp/iphoneos -sdk iphonesimulator SKIP_INSTALL=NO BUILD_LIBRARIES_FOR_DISTRIBUTION=YES

# Build xcframework with two archives
xcodebuild -create-xcframework -framework /tmp/xcf/ios.xcarchive/Products/Library/Frameworks/NotaWebViewExt.framework -framework /tmp/xcf/iossimulator.xcarchive/Products/Library/Frameworks/NotaWebViewExt.framework -output ../src/platforms/ios/NotaWebViewExt.xcframework
