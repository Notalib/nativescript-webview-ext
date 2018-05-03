#!/bin/bash
set -e

function wd() {
  cd $(dirname $0)
  echo $PWD
}
(cd android && ./gradlew build)

NATIVE_SRC_DIR=$(wd);

AAR_PATH="${NATIVE_SRC_DIR}/android/webviewinterface/build/outputs/aar/webviewinterface-release.aar"
TARGET_PATH="${NATIVE_SRC_DIR}/../src/platforms/android/"
TARGET_FILE="webviewinterface.aar"

mkdir -p "${TARGET_PATH}"
cp -v "${AAR_PATH}" "${TARGET_PATH}/${TARGET_FILE}"
