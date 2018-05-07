import { WebViewExt } from '@nota/nativescript-webview-ext';
import { isAndroid } from 'tns-core-modules/platform';
import * as trace from 'tns-core-modules/trace';
import * as frame from 'tns-core-modules/ui/frame';
import { PercentLength } from 'tns-core-modules/ui/frame';
import { GridLayout, ItemSpec } from "tns-core-modules/ui/layouts/grid-layout";
import * as URL from 'url';

trace.setCategories('NOTA');
trace.enable();

describe("WebViewExt", function () {
    let webview: WebViewExt;
    let src: string;

    beforeEach((cb) => {
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

        if (isAndroid) {
            src = 'http://10.0.2.2:8080';
        } else {
            src = 'http://localhost:8080';
        }

        const load = (args) => {
            webview.registerLocalResource('local-stylesheet.css', '~/assets/local-stylesheet.css');

            webview.off(WebViewExt.loadFinishedEvent, load);

            console.log(args.error);
            console.log(args.url);
            if (args.error) {
                throw new Error(args.error);
            }

            if (URL.parse(args.url, true).href === URL.parse(src, true).href) {
                cb();
            } else {
                throw new Error(`${args.url} === ${src}`);
            }
        };

        webview.on(WebViewExt.loadFinishedEvent, load);
        webview.src = src;
    });

    it("src", () => {
        expect(URL.parse(webview.src, true).href).toBe(URL.parse(src, true).href);
    });

    it("stylesheet-loaded", (done) => {
        webview.loadStyleSheetFile('local-stylesheet.css', '~/assets/local-stylesheet.css', false);

        setTimeout(() => {
            webview.executeJavaScript(`
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
                .then((style: any) => {
                    expect(style).toBeDefined();
                    expect(style.color).toBeDefined();
                    expect(style.color).toBe('rgb(0, 128, 0)');

                    done();
                })
                .catch((err) => {
                    console.error(err);
                    throw new Error(err);
                });
        }, 100);
    });

    afterEach(() => {
        const parent = webview && webview.parent as GridLayout;
        if (parent) {
            parent.removeChild(webview);
        }

        webview = null;
    });
});
