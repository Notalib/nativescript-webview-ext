import * as fs from "tns-core-modules/file-system";
import { EventData, View } from "tns-core-modules/ui/page/page";

const currentAppPath = `${fs.knownFolders.currentApp().path}`;

export function resolveFilePath(filepath: string) {
    if (filepath.startsWith("~")) {
        filepath = filepath.substr(1);
    }

    if (filepath.startsWith("file://")) {
        filepath = filepath.replace(/^file:\/\//, "");
    }

    return fs.path.join(currentAppPath, filepath);
}

export async function loadFile(path: string) {
    const realPath = resolveFilePath(path);

    return await fs.File.fromPath(realPath).readText();
}

export function timeoutPromise(delay = 100) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

// HTML test files
export const testFile = `~/assets/html/test.html`;
export const testWithSpacesFile = `~/assets/html/test with spaces.html`;
export const emptyHTMLFile = `~/assets/html/empty.html`;
export const javascriptCallsFile = `~/assets/html/javascript-calls.html`;
export const javascriptCallsXLocalFile = `~/assets/html/javascript-calls-x-local.html`;
export const cssNotPredefinedFile = `~/assets/html/css-not-predefined.html`;
export const cssPreDefinedlinkFile = `~/assets/html/css-predefined-link-tags.html`;

export const emptyHTMLXLocalSource = "x-local://empty.html";

// Resource loads
export const localStyleSheetCssNAME = `local-stylesheet.css`;
export const localStyleSheetCssFile = `~/assets/css/local-stylesheet.css`;

export const localJavaScriptName = `local-javascript.js`;
export const localJavaScriptFile = `~/assets/js/local-javascript.js`;

export const jsGetElementStyleSheet = `
(function() {
    const els = document.getElementsByClassName('red');
    if (!els.length) {
        return 'Element not found';
    }

    var el = els[0];

    var style = window.getComputedStyle(el);
    var result = {};

    Object.keys(style)
        .filter(function(key) {
            return isNaN(key);
        })
        .forEach(function(key) {
            result[key] = style[key];
        });

    return result;
})();
`;

export function eventAsPromise<T extends EventData>(view: View, eventName: string) {
    return new Promise<T>((resolve) => {
        const cb = (args: T) => {
            resolve(args);
            view.off(eventName);
        };

        view.on(eventName, cb);
    });
}
