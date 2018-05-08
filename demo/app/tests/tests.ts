import { WebViewExt } from '@nota/nativescript-webview-ext';
import * as fs from 'tns-core-modules/file-system';
import { isAndroid } from 'tns-core-modules/platform';
import * as trace from 'tns-core-modules/trace';
import * as frame from 'tns-core-modules/ui/frame';
import { PercentLength } from 'tns-core-modules/ui/frame';
import { GridLayout, ItemSpec } from "tns-core-modules/ui/layouts/grid-layout";
import * as URL from 'url';

trace.setCategories('NOTA');
trace.enable();

function resolveSrc(src: string) {
    if (src.startsWith('~/')) {
        src = `file://${fs.knownFolders.currentApp().path}/${src.substr(2)}`;
    } else if (src.startsWith("/")) {
        src = "file://" + src;
    }

    return src;
}

function timeoutPromise(delay = 100) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

describe("WebViewExt", function () {
    let webview: WebViewExt;
    const emptyHTMLFile = '~/assets/test-data/html/empty.html';
    const javascriptCallsFile = '~/assets/test-data/html/javascript-calls.html';
    const javascriptCallsXLocalFile = '~/assets/test-data/html/javascript-calls-x-local.html';
    const cssNotPredefinedFile = '~/assets/test-data/html/css-not-predefined.html';
    const cssPreDefinedlinkFile = '~/assets/test-data/html/css-predefined-link-tags.html';

    const localStyleSheetCssNAME = 'local-stylesheet.css';
    const localStyleSheetCssFile = '~/assets/test-data/css/local-stylesheet.css';

    const localJavaScriptName = 'local-javascript.js';
    const localJavaScriptFile = '~/assets/test-data/js/local-javascript.js';

    function loadWebSite(src: string) {
        return new Promise((resolve, reject) => {
            const load = (args) => {
                webview.off(WebViewExt.loadFinishedEvent, load);

                if (args.error) {
                    reject(new Error(args.error));
                    return;
                }

                const loadedSrc = URL.parse(args.url, true).href;
                const expectedSrc = URL.parse(resolveSrc(src), true).href;
                expect(loadedSrc).toEqual(expectedSrc);
                resolve();
            };

            webview.on(WebViewExt.loadFinishedEvent, load);
            webview.src = src;
        });
    }

    beforeEach(() => {
        const page = frame.topmost().currentPage;

        const grid = new GridLayout();
        grid.height = PercentLength.parse('100%');
        page.content = grid;

        grid.addRow(new ItemSpec(0, 'star'));
        grid.addColumn(new ItemSpec(0, 'star'));

        webview = new WebViewExt();
        webview.row = 0;
        webview.col = 0;
        grid.addChild(webview);
    });

    describe('load files', () => {
        it("local file via ~/", (done) => {
            const src = emptyHTMLFile;
            loadWebSite(src)
                .then(() => {
                    expect(URL.parse(webview.src, true).href).toBe(URL.parse(src, true).href);
                    done();
                });
        });

        it(('local file via x-local'), (done) => {
            const src = 'x-local://empty.html';
            webview.registerLocalResource('empty.html', emptyHTMLFile);

            loadWebSite(src)
                .then(() => {
                    expect(webview.src).toBe(src);
                    done();
                });
        });
    });

    describe('inject files', () => {
        describe('stylesheets', () => {
            const testForRedScript = `
        (function() {
            var style = window.getComputedStyle(document.getElementsByClassName("red")[0]);
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

            const expectedRedColor = 'rgb(0, 128, 0)';

            it('Loaded predefined stylesheet', (done) => {
                const src = cssPreDefinedlinkFile;
                webview.registerLocalResource(localStyleSheetCssNAME, localStyleSheetCssFile);

                loadWebSite(src)
                    .then(() => timeoutPromise())
                    .then(() => webview.executeJavaScript(testForRedScript, false))
                    .then((style: any) => {
                        expect(style).toBeDefined();
                        expect(style.color).toBeDefined();
                        expect(style.color).toBe(expectedRedColor);

                        done();
                    });
            });

            it('Inject via x-local once', (done) => {
                const src = cssNotPredefinedFile;
                loadWebSite(src)
                    .then(() => webview.loadStyleSheetFile(localStyleSheetCssNAME, localStyleSheetCssFile))
                    .then(() => timeoutPromise())
                    .then(() => webview.executeJavaScript(testForRedScript, false))
                    .then((style: any) => {
                        expect(style).toBeDefined();
                        expect(style.color).toBeDefined();
                        expect(style.color).toBe(expectedRedColor);

                        done();
                    });
            });
        });

        describe('JavaScript', () => {
            it('once', (done) => {
                loadWebSite(javascriptCallsXLocalFile)
                    .then(() => webview.loadJavaScriptFile(localJavaScriptName, localJavaScriptFile))
                    .then(() => timeoutPromise())
                    .then(() => webview.executeJavaScript(`getNumber()`))
                    .then((result) => expect(result).toEqual(42))
                    .then(done);
            });

            it('auto load', (done) => {
                webview.autoLoadJavaScriptFile(localJavaScriptName, localJavaScriptFile);

                loadWebSite(javascriptCallsXLocalFile)
                    .then(() => timeoutPromise())
                    .then(() => webview.executeJavaScript(`getNumber()`))
                    .then((result) => expect(result).toEqual(42))
                    .then(() => loadWebSite(emptyHTMLFile))
                    .then(() => timeoutPromise())
                    .then(() => webview.executeJavaScript(`getNumber()`))
                    .then((result) => expect(result).toEqual(42))
                    .then(done);
            });
        });
    });

    describe('JavaScript interface', () => {
        const src = javascriptCallsFile;
        beforeEach((done) => {
            loadWebSite(src)
                .then(() => timeoutPromise())
                .then(done);
        });

        it('events', (done) => {
            webview.executeJavaScript(`setupEventListener()`)
                .then(() => {
                    return new Promise((resolve) => {
                        const expected = {
                            huba: 'hop',
                        };

                        webview.on('web-message', (args: any) => {
                            const data = args.data;
                            expect(expected).toEqual(data);
                            webview.off('web-message');
                            resolve();
                        });

                        webview.emitToWebView('tns-message', expected);
                    });
                })
                .then(done);
        });

        it('getNumber() - The answer to the ultimate question of life, the universe and everything', (done) => {
            webview.executeJavaScript(`getNumber()`)
                .then((result) => expect(result).toEqual(42))
                .then(done);
        });

        it('Get pi', (done) => {
            webview.executeJavaScript(`getNumberFloat()`)
                .then((result) => expect(result).toEqual(3.14))
                .then(done);
        });

        it('Get boolean - true', (done) => {
            webview.executeJavaScript(`getTruth()`)
                .then((result) => expect(result).toEqual(true))
                .then(done);
        });

        it('Get boolean - false', (done) => {
            webview.executeJavaScript(`getFalse()`)
                .then((result) => expect(result).toEqual(false))
                .then(done);
        });

        it('getString()', (done) => {
            webview.executeJavaScript(`getString()`)
                .then((result) => expect(result).toEqual(('string result from webview JS function')))
                .then(done);
        });

        it('getArray()', (done) => {
            webview.executeJavaScript(`getArray()`)
                .then((result) => expect(result).toEqual([1.5, true, "hello"]))
                .then(done);
        });

        it('getObject()', (done) => {
            webview.executeJavaScript(`getObject()`)
                .then((result) => expect(result).toEqual({ prop: "test", name: "object-test", values: [42, 3.14] }))
                .then(done);
        });
    });

    afterEach(() => {
        const parent = webview && webview.parent as GridLayout;
        if (parent) {
            parent.removeChild(webview);
        }

        webview = null;
    });
});
