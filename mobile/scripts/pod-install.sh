#!/usr/bin/env bash
# Run pod install with UTF-8 encoding so CocoaPods does not fail with Encoding::CompatibilityError.
# Usage: ./scripts/pod-install.sh   or   bash scripts/pod-install.sh

set -e
cd "$(dirname "$0")/.."
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
cd ios
pod install "$@"
