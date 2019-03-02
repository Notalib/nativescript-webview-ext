import * as fs from "tns-core-modules/file-system";
import { EventData, View } from "tns-core-modules/ui/page/page";

const baseUrl = `${fs.knownFolders.currentApp().path}/assets/html/`;

// HTML test files
export const testFile = `${baseUrl}/html/test.html`;
export const testWithSpacesFile = `${baseUrl}/html/test with spaces.html`;
export const emptyHTMLFile = `${baseUrl}/html/empty.html`;
export const javascriptCallsFile = `${baseUrl}/html/javascript-calls.html`;
export const javascriptCallsXLocalFile = `${baseUrl}/html/javascript-calls-x-local.html`;
export const cssNotPredefinedFile = `${baseUrl}/html/css-not-predefined.html`;
export const cssPreDefinedlinkFile = `${baseUrl}/html/css-predefined-link-tags.html`;

export const emptyHTMLXLocalSource = "x-local://empty.html";

// Resource loads
export const localStyleSheetCssNAME = `local-stylesheet.css`;
export const localStyleSheetCssFile = `${baseUrl}/css/local-stylesheet.css`;

export const localJavaScriptName = `local-javascript.js`;
export const localJavaScriptFile = `${baseUrl}/js/local-javascript.js`;

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
