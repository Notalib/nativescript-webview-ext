#!/bin/bash

set -e

# Based on https://appspector.com/blog/xcframeworks

ROOT_DIR="$(git rev-parse --show-toplevel)"
NOTA_WEBVIEW_DIR="${ROOT_DIR}/native-src/ios/NotaWebViewExt"
TARGET="${ROOT_DIR}/src/platforms/ios/NotaWebViewExt.xcframework"

cd $NOTA_WEBVIEW_DIR

rm -rf $TARGET

# Archive for iOS
xcodebuild archive -scheme NotaWebViewExt -destination="iOS" -archivePath /tmp/xcf/ios.xcarchive -derivedDataPath /tmp/iphoneos -sdk iphoneos SKIP_INSTALL=NO BUILD_LIBRARIES_FOR_DISTRIBUTION=YES

# Archive for simulator
xcodebuild archive -scheme NotaWebViewExt -destination="iOS Simulator" -archivePath /tmp/xcf/iossimulator.xcarchive -derivedDataPath /tmp/iphoneos -sdk iphonesimulator SKIP_INSTALL=NO BUILD_LIBRARIES_FOR_DISTRIBUTION=YES

# Build xcframework with two archives
xcodebuild -create-xcframework -framework /tmp/xcf/ios.xcarchive/Products/Library/Frameworks/NotaWebViewExt.framework -framework /tmp/xcf/iossimulator.xcarchive/Products/Library/Frameworks/NotaWebViewExt.framework -output $TARGET
