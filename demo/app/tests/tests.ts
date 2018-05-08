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

    it("src", (cb) => {
        const src = '~/assets/test-data/html/empty.html';
        loadWebSite(src)
            .then(() => {
                expect(URL.parse(webview.src, true).href).toBe(URL.parse(src, true).href);
                cb();
            });
    });

    it("stylesheet-loaded", (done) => {
        const src = '~/assets/test-data/html/css-predefined-link-tags.html';

        webview.registerLocalResource('local-stylesheet.css', '~/assets/test-data/css/local-stylesheet.css');

        loadWebSite(src)
            .then(() => timeoutPromise())
            .then(() => webview.executeJavaScript(`
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
                `, false)
            )
            .then((style: any) => {
                expect(style).toBeDefined();
                expect(style.color).toBeDefined();
                expect(style.color).toBe('rgb(0, 128, 0)');

                done();
            });
    });

    it('JavaScript interface', (done) => {
        const src = '~/assets/test-data/html/javascript-calls.html';

        loadWebSite(src)
            .then(() => timeoutPromise())
            .then(() => webview.executeJavaScript(`setupEventListener()`))
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
            .then(() => webview.executeJavaScript(`getNumber()`))
            .then((result) => expect(result).toEqual(42))
            .then(() => webview.executeJavaScript(`getNumberFloat()`))
            .then((result) => expect(result).toEqual(3.14))
            .then(() => webview.executeJavaScript(`getTruth()`))
            .then((result) => expect(result).toEqual(true))
            .then(() => webview.executeJavaScript(`getFalse()`))
            .then((result) => expect(result).toEqual(false))
            .then(() => webview.executeJavaScript(`getString()`))
            .then((result) => expect(result).toEqual('string result from webview JS function'))
            .then(() => webview.executeJavaScript(`getArray()`))
            .then((result) => expect(result).toEqual([1.5, true, "hello"]))
            .then(() => webview.executeJavaScript(`getObject()`))
            .then((result) => expect(result).toEqual({ prop: "test", name: "object-test", values: [ 42, 3.14 ] }))
            .then(() => done());
    });

    it(('load page via x-local'), (done) => {
        const src = 'x-local://empty.html';
        const filepath = '~/assets/test-data/html/empty.html';
        webview.registerLocalResource('empty.html', filepath);

        loadWebSite(src)
            .then(() => {
                expect(webview.src).toBe(src);
                done();
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
