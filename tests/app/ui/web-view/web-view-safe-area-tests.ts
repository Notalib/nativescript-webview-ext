import { WebViewExt } from "@nota/nativescript-webview-ext";
import * as platform from "tns-core-modules/platform";
import { parse } from "tns-core-modules/ui/builder";
import * as view from "tns-core-modules/ui/core/view";
import { ios as iosUtils } from "tns-core-modules/utils/utils";
import * as TKUnit from "../../TKUnit";
import { UITest } from "../../ui-test";
import * as helper from "../helper";
import { bottom, dipToDp, equal, left, right, top } from "../layouts/layout-tests-helper";

// Argh.... Needed for WebViewSafeAreaTest.getViews(template) to work;
global.registerModule("ui/web-view-ext", () => require("@nota/nativescript-webview-ext"));

export class WebViewSafeAreaTest extends UITest<WebViewExt> {
    private executeSnippet<U extends { root: view.View }>(ui: U, setup: (ui: U) => void, test: (ui: U) => void, pageOptions?: helper.PageOptions): void {
        function waitUntilTestElementLayoutIsValid(view: view.View, timeoutSec?: number): void {
            TKUnit.waitUntilReady(() => {
                return view.isLayoutValid;
            }, timeoutSec || 1);
        }

        setup(ui);
        helper.buildUIAndRunTest(
            ui.root,
            () => {
                waitUntilTestElementLayoutIsValid(ui.root);
                test(ui);
            },
            pageOptions,
        );
    }

    private noop() {
        // no operation
    }

    private getViews(template: string) {
        let root = parse(template);
        return {
            root,
            list: root.getViewById("webview") as WebViewExt,
        };
    }

    private webview_in_full_screen(webView: WebViewExt, pageOptions?: helper.PageOptions) {
        let expectedTop = 0;
        if (pageOptions && pageOptions.actionBarFlat) {
            const actionBarHeight = round(dipToDp(webView.page.actionBar.nativeViewProtected.frame.size.height));
            const app = iosUtils.getter(UIApplication, UIApplication.sharedApplication);
            const statusBarHeight = round(dipToDp(app.statusBarFrame.size.height));
            expectedTop = actionBarHeight + statusBarHeight;
        }

        const l = left(webView);
        const t = top(webView);
        const r = right(webView);
        const b = bottom(webView);
        equal(l, 0, `${webView}.left - actual:${l}; expected: ${0}`);
        equal(t, expectedTop, `${webView}.top - actual:${t}; expected: ${expectedTop}`);
        equal(r, platform.screen.mainScreen.widthPixels, `${webView}.right - actual:${r}; expected: ${platform.screen.mainScreen.widthPixels}`);
        equal(b, platform.screen.mainScreen.heightPixels, `${webView}.bottom - actual:${b}; expected: ${platform.screen.mainScreen.heightPixels}`);
    }

    private webview_in_full_screen_test(pageOptions?: helper.PageOptions) {
        const snippet = `
            <WebViewExt id="webview" loaded="onLoaded" backgroundColor="Crimson"></WebViewExt>
        `;

        this.executeSnippet(
            this.getViews(snippet),
            this.noop,
            ({ list }) => {
                this.webview_in_full_screen(list, pageOptions);
            },
            pageOptions,
        );
    }

    public test_webview_in_full_screen_action_bar() {
        this.webview_in_full_screen_test({
            actionBar: true,
        });
    }

    public test_webview_in_full_screen_action_bar_hidden() {
        this.webview_in_full_screen_test({
            actionBarHidden: true,
        });
    }

    public test_webview_in_full_screen_action_bar_flat() {
        this.webview_in_full_screen_test({
            actionBarFlat: true,
        });
    }

    public test_webview_in_full_screen_tab_bar() {
        this.webview_in_full_screen_test({
            tabBar: true,
        });
    }
}

export function createTestCase(): WebViewSafeAreaTest {
    return new WebViewSafeAreaTest();
}
