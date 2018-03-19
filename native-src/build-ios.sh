#!/bin/bash
set -e
### Build and update iOS native library

# build the iOS library both for emulator and device
xcodebuild -project ./ios/NotaWebViewExt/NotaWebViewExt.xcodeproj -target NotaWebViewExt -sdk iphoneos -configuration Release ARCHS="armv7 arm64"
xcodebuild -project ./ios/NotaWebViewExt/NotaWebViewExt.xcodeproj -target NotaWebViewExt -sdk iphonesimulator -configuration Release ARCHS="i386 x86_64"

XCODE_BUILD_PATH="./ios/NotaWebViewExt/build"
DESTIONATION_PATH="../src/platforms/ios/NotaWebViewExt.framework"
rm -rfv ${DESTIONATION_PATH}
mkdir -p ${DESTIONATION_PATH}

# create fat binary
lipo -create "$XCODE_BUILD_PATH/Release-iphoneos/NotaWebViewExt.framework/NotaWebViewExt" "$XCODE_BUILD_PATH/Release-iphonesimulator/NotaWebViewExt.framework/NotaWebViewExt" -output "$DESTIONATION_PATH/NotaWebViewExt"
# copy all headers
cp -r "$XCODE_BUILD_PATH/Release-iphoneos/NotaWebViewExt.framework/"{Headers,Modules,Info.plist} "$DESTIONATION_PATH/"

#pushd /android/
#./gradlew assembleDebug
#popd
#
#### NPM pack
#npm pack
