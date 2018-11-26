#!/bin/bash
set -e
### Build and update iOS native library

(cd ./ios/NotaWebViewExt && pod install);

XCODE_BUILD_PATH="./ios/NotaWebViewExt/build"
DESTIONATION_PATH="../src/platforms/ios/NotaWebViewExt.framework"

# build the iOS library both for emulator and device
xcodebuild -workspace ./ios/NotaWebViewExt/NotaWebViewExt.xcworkspace -scheme NotaWebViewExt -sdk iphoneos -configuration Release ARCHS="armv7 arm64" -derivedDataPath $XCODE_BUILD_PATH
xcodebuild -workspace ./ios/NotaWebViewExt/NotaWebViewExt.xcworkspace -scheme NotaWebViewExt -sdk iphonesimulator -configuration Release ARCHS="i386 x86_64" -derivedDataPath $XCODE_BUILD_PATH

rm -rf ${DESTIONATION_PATH}
mkdir -p ${DESTIONATION_PATH}

IPHONEOS_FRAMEWORK="$XCODE_BUILD_PATH/Build/Products/Release-iphoneos/NotaWebViewExt.framework"
IPHONESIM_FRAMEWORK="$XCODE_BUILD_PATH/Build/Products/Release-iphonesimulator/NotaWebViewExt.framework"

# create fat binary
lipo -create "$IPHONEOS_FRAMEWORK/NotaWebViewExt" "$IPHONESIM_FRAMEWORK/NotaWebViewExt" -output "$DESTIONATION_PATH/NotaWebViewExt"

# copy all headers
cp -r "$IPHONEOS_FRAMEWORK/"{Headers,Modules,Info.plist} "$DESTIONATION_PATH/"
