#!/bin/bash

set -e

SCHEME_NAME="NotaWebViewExt"

ROOT_DIR=$(git rev-parse --show-toplevel)
NOTA_WEBVIEW_DIR="${ROOT_DIR}/native-src/ios/${SCHEME_NAME}"
TARGET="${ROOT_DIR}/src/platforms/ios/${SCHEME_NAME}.framework"

IOS_XCARCHIVE_PATH="/tmp/xcf/ios.xcarchive"
IOS_SIMULATOR_XCARCHIVE_PATH="/tmp/xcf/iossimulator.xcarchive"
FRAMEWORK_SUBPATH="Products/Library/Frameworks/${SCHEME_NAME}.framework"

IPHONEOS_FRAMEWORK="${IOS_XCARCHIVE_PATH}/${FRAMEWORK_SUBPATH}"
IPHONESIM_FRAMEWORK="${IOS_SIMULATOR_XCARCHIVE_PATH}/${FRAMEWORK_SUBPATH}"

rm -rf "${TARGET}" && mkdir "${TARGET}"

function BUILD_ARCHIVE() {
    DESTINATION="${1}"
    ARCHIVE_PATH="${2}"
    DERIVED_DATA_PATH="${3}"
    SDK="${4}"

    cd $NOTA_WEBVIEW_DIR

    xcodebuild archive -scheme ${SCHEME_NAME} \
        -destination="${DESTINATION}" \
        -archivePath "${ARCHIVE_PATH}" \
        -derivedDataPath "${DERIVED_DATA_PATH}" \
        -sdk "${SDK}" \
        SKIP_INSTALL=NO \
        BUILD_LIBRARIES_FOR_DISTRIBUTION=YES
}

# Archive for iOS
BUILD_ARCHIVE "iOS" "${IOS_XCARCHIVE_PATH}" "/tmp/iphoneos" "iphoneos"

# Archive for simulator
BUILD_ARCHIVE "iOS Simulator" "${IOS_SIMULATOR_XCARCHIVE_PATH}" "/tmp/iphonesimulator" "iphonesimulator"

# Create fat binary
lipo -create \
    "${IPHONEOS_FRAMEWORK}/${SCHEME_NAME}" \
    "${IPHONESIM_FRAMEWORK}/${SCHEME_NAME}" \
    -output "${TARGET}/${SCHEME_NAME}"

# Copy all headers
cp -R "${IPHONEOS_FRAMEWORK}/"{Headers,Modules,Info.plist} "${TARGET}/"