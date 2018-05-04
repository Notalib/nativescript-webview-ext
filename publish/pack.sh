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
    echo 'Clearing /src and /package...'
    cd $WORKDIR
    npx rimraf "$TO_SOURCE_DIR"
    npx rimraf "$PACK_DIR"

    # copy src
    echo 'Copying src...'
    git clean -d -f -x "$SOURCE_DIR" && (cd $SOURCE_DIR && npm i)
    npx ncp "$SOURCE_DIR" "$TO_SOURCE_DIR"

    # copy README & LICENSE to src
    echo 'Copying README and LICENSE to /src...'
    npx ncp "$ROOT_DIR"/LICENSE "$TO_SOURCE_DIR"/LICENSE
    npx ncp "$ROOT_DIR"/README.md "$TO_SOURCE_DIR"/README.md

    # compile package and copy files required by npm
    echo 'Building /src...'
    cd "$TO_SOURCE_DIR"
    npm run build
    cd $WORKDIR

    echo 'Creating package...'
    # create package dir
    mkdir "$PACK_DIR"

    npx json -e "delete this.scripts" -I -f "$TO_SOURCE_DIR"/package.json

    # create the package
    cd "$PACK_DIR"
    npm pack "$TO_SOURCE_DIR"

    # delete source directory used to create the package
    cd $WORKDIR
    npx rimraf "$TO_SOURCE_DIR"
}

install && pack
