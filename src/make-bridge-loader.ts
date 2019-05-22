import "tslib";

import * as fs from "fs";
import { promisify } from "util";

const fsWriteFile = promisify(fs.writeFile);
const fsReadFile = promisify(fs.readFile);

async function nativescriptWebviewBridgeLoader() {
    let template = await fsReadFile("./nativescript-webview-bridge-loader.ts.tmpl", "UTF-8");

    const values = {
        fetchPolyfill: await fsReadFile("./polyfills/fetch-polyfill.js", "UTF-8"),
        promisePolyfill: await fsReadFile("./polyfills/promise-polyfill.js", "UTF-8"),
        webViewBridge: await fsReadFile("./www/ns-webview-bridge.js", "UTF-8"),
        metadataViewPort: await fsReadFile("./www/metadata-view-port.js", "UTF-8"),
    };

    for (const [name, value] of Object.entries(values)) {
        template = template.replace(`<?= ${name} ?>`, escape(value));
    }

    await fsWriteFile("./nativescript-webview-bridge-loader.ts", template);
}

async function worker() {
    await nativescriptWebviewBridgeLoader();
}

worker();
