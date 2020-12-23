#!/bin/bash

set -e

# Based on https://appspector.com/blog/xcframeworks

ROOT_DIR="$(git rev-parse --show-toplevel)"

PROJECT_NAME="NotaWebViewExt"

# set framework folder name
FRAMEWORK_FOLDER_NAME="${PROJECT_NAME}"

IOS_PROJECT_DIR="${ROOT_DIR}/native-src/ios/${FRAMEWORK_FOLDER_NAME}"

cd ${IOS_PROJECT_DIR}

# set framework name or read it from project by this variable
FRAMEWORK_NAME="${PROJECT_NAME}"

# xcframework path
FRAMEWORK_PATH="${ROOT_DIR}/src/platforms/ios/${FRAMEWORK_NAME}.xcframework"

TMP_DIR="/tmp/xcf"

# set path for iOS simulator archive
SIMULATOR_ARCHIVE_PATH="${TMP_DIR}/${FRAMEWORK_FOLDER_NAME}/simulator.xcarchive"

# set path for iOS device archive
IOS_DEVICE_ARCHIVE_PATH="${TMP_DIR}/${FRAMEWORK_FOLDER_NAME}/iOS.xcarchive"

ARCHIVE_SUBPATH="Products/Library/Frameworks/${FRAMEWORK_NAME}.framework"

rm -rf "${TMP_DIR}" "${FRAMEWORK_PATH}"

echo "Deleted ${TMP_DIR}"

echo "Archiving ${FRAMEWORK_NAME}"

xcodebuild archive \
  -scheme "${FRAMEWORK_NAME}" \
  -destination="generic/platform=iOS Simulator" \
  -archivePath "${SIMULATOR_ARCHIVE_PATH}" \
  -sdk iphonesimulator \
  SKIP_INSTALL=NO \
  BUILD_LIBRARIES_FOR_DISTRIBUTION=YES

xcodebuild archive \
  -scheme "${FRAMEWORK_FOLDER_NAME}" \
  -destination="generic/platform=iOS" \
  -archivePath "${IOS_DEVICE_ARCHIVE_PATH}" \
  -sdk iphoneos \
  SKIP_INSTALL=NO \
  BUILD_LIBRARIES_FOR_DISTRIBUTION=YES

# Creating XCFramework
xcodebuild -create-xcframework \
  -framework "${SIMULATOR_ARCHIVE_PATH}/${ARCHIVE_SUBPATH}" \
  -framework "${IOS_DEVICE_ARCHIVE_PATH}/${ARCHIVE_SUBPATH}" \
  -output "${FRAMEWORK_PATH}"

rm -rf "${SIMULATOR_ARCHIVE_PATH}" "${IOS_DEVICE_ARCHIVE_PATH}"

## Workaround for https://github.com/Notalib/nativescript-webview-ext/issues/71
rm -rf ${FRAMEWORK_PATH}/ios-*/NotaWebViewExt.framework/Frameworks
