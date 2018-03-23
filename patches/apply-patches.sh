#!/bin/bash
realpath() {
  [[ $1 = /* ]] && echo "$1" || (cd "$PWD/${1#./}" && echo $PWD);
}

apply_patch() {
  PATCH=$1
  patch -p0 -N --dry-run --silent -i $PATCH 2>&1 > /dev/null
  if [[ $? -eq 0 ]]; then
    patch -p0 -N --silent -i $PATCH
    if [[ $? -eq 0 ]]; then
      echo "APPLIED PATCH: ${PATCH}";
    else
      echo "COULN't APPLY THE PATCH: ${PATCH}";
      exit 127
    fi
  else
    patch -p0 -N -R --dry-run --silent -i $PATCH 2>&1 > /dev/null
    if [[ $? -eq 0 ]]; then
      echo "ALREADY APPLIED: ${PATCH}";
    else
      echo "CANNOT APPLY THE PATCH: ${PATCH}";
      exit 127
    fi
  fi
}

PATCH_DIR=$(realpath $(dirname $0));
ROOT=$(git rev-parse --show-toplevel);

echo -e "Applying local patches from ${PATCH_DIR}\n";

cd $ROOT
for patch in $PATCH_DIR/*.patch; do
  apply_patch $patch
done

echo -e "\nDONE - Applying local patches from ${PATCH_DIR}";
