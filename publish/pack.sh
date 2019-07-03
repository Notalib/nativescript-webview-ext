#!/bin/bash
set -e

wd() {
    cd $(dirname $0)
    echo $PWD
}

install(){
    npm i
}

WORKDIR=$(wd)
SOURCE_DIR="${WORKDIR}/../src";
TO_SOURCE_DIR="${WORKDIR}/src";
PACK_DIR="${WORKDIR}/package";
ROOT_DIR="${WORKDIR}/..";
PUBLISH=--publish

cd $WORKDIR;

pack() {
    echo "Clearing ${TO_SOURCE_DIR} and ${PACK_DIR}..."
    cd "${WORKDIR}"
    npx rimraf "${PACK_DIR}"

    # copy src
    echo 'Copying src...'
    rsync -aP \
        --delete \
        --delete-excluded \
        --exclude hooks \
        --exclude www \
        --exclude node_modules \
        --exclude platforms \
        --exclude "*.metadata.json" \
        --exclude "*.js" \
        --exclude "*.tgz" \
        --exclude "*.d.ts" \
        --exclude "*.map" \
        --exclude "*.css" \
        --include "references.d.ts" \
        --include "nativescript-webview-bridge-loader.d.ts" \
        --include "webview-ext.d.ts" \
         "${SOURCE_DIR}/" \
         "${ROOT_DIR}/LICENSE" \
         "${ROOT_DIR}/README.md" \
         "${TO_SOURCE_DIR}/"
  
    rsync -aP \
         "${SOURCE_DIR}/webview-ext.d.ts" \
         "${TO_SOURCE_DIR}"

    rsync -aP \
        --delete \
         "${SOURCE_DIR}/platforms/" \
         "${TO_SOURCE_DIR}/platforms/"

    rsync -aP \
        --delete \
         "${SOURCE_DIR}/types/" \
         "${TO_SOURCE_DIR}/types/"

    # compile package and copy files required by npm
    echo 'Building /src...'
    cd "${TO_SOURCE_DIR}"
    npm run build
    cd "${WORKDIR}"

    if [[ ! -f "${TO_SOURCE_DIR}/www/ns-webview-bridge.js" ]]; then
        echo "${TO_SOURCE_DIR}/www/ns-webview-bridge.js is missing";
        exit 127
    fi

    echo 'Creating package...'
    # create package dir
    mkdir "${PACK_DIR}"

    POSTINSTALL_SCRIPT=$(npx json -f "${TO_SOURCE_DIR}"/package.json scripts.postinstall)
    npx json -e "this.scripts={}" -I -f "${TO_SOURCE_DIR}"/package.json
    npx json -e "this.scripts.postinstall='${POSTINSTALL_SCRIPT}'" -I -f "${TO_SOURCE_DIR}"/package.json
    npx json -e "delete this.devDependencies" -I -f "${TO_SOURCE_DIR}"/package.json

    # create the package
    cd "${PACK_DIR}"
    npm pack "${TO_SOURCE_DIR}"

    # delete source directory used to create the package
    cd "${WORKDIR}"
    npx rimraf "${TO_SOURCE_DIR}"
}

install && pack
