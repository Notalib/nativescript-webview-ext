import { WebViewCommonTest, emptyHTMLFile } from "./web-view-tests-common";
import { DoneCallback } from "~/TKUnit";
import * as TKUnit from "~/TKUnit";

export class WebViewTest extends WebViewCommonTest {
    public async test_builtInZoomControls(done: DoneCallback) {
        const webview = this.testView;

        // >> webview-built-in-zoom-controls
        try {
            const androidWebView = webview.android as android.webkit.WebView;
            const args = await webview.loadUrl(emptyHTMLFile);

            // >> (hide)
            const expectedTitle = "Blank";
            const actualTitle = await webview.getTitle();

            TKUnit.assertNull(args.error, args.error);
            TKUnit.assertEqual(actualTitle, expectedTitle, `File "${emptyHTMLFile}" not loaded properly.`);

            TKUnit.assertEqual(webview.builtInZoomControls, true, `builtInZoomControls should be enabled by default`);
            TKUnit.assertEqual(androidWebView.getSettings().getBuiltInZoomControls(), true, `default native value for builtInZoomControls should be true`);

            let currentValue: any = false;
            let expected = false;
            webview.builtInZoomControls = currentValue;

            TKUnit.assertEqual(webview.builtInZoomControls, expected, `builtInZoomControls should be disabled`);
            TKUnit.assertEqual(androidWebView.getSettings().getBuiltInZoomControls(), expected, `native value for builtInZoomControls should be false`);

            currentValue = "true";
            expected = true;
            webview.builtInZoomControls = currentValue;

            TKUnit.assertEqual(webview.builtInZoomControls, expected, `builtInZoomControls string => boolean converter`);
            TKUnit.assertEqual(androidWebView.getSettings().getBuiltInZoomControls(), expected, `native value for builtInZoomControls after string => boolean`);

            currentValue = "false";
            expected = false;
            webview.builtInZoomControls = currentValue;

            TKUnit.assertEqual(webview.builtInZoomControls, expected, `builtInZoomControls string => boolean converter`);
            TKUnit.assertEqual(androidWebView.getSettings().getBuiltInZoomControls(), expected, `native value for builtInZoomControls after string => boolean`);

            done();
        } catch (err) {
            done(err);
        }
        // << webview-built-in-zoom-controls
    }

    public async test_displayZoomControls(done: DoneCallback) {
        const webview = this.testView;

        // >> webview-built-in-zoom-controls
        try {
            const androidWebView = webview.android as android.webkit.WebView;
            const args = await webview.loadUrl(emptyHTMLFile);

            // >> (hide)
            const expectedTitle = "Blank";
            const actualTitle = await webview.getTitle();

            TKUnit.assertNull(args.error, args.error);
            TKUnit.assertEqual(actualTitle, expectedTitle, `File "${emptyHTMLFile}" not loaded properly.`);

            TKUnit.assertEqual(webview.displayZoomControls, true, `displayZoomControls should be enabled by default`);
            TKUnit.assertEqual(androidWebView.getSettings().getDisplayZoomControls(), true, `default native value for displayZoomControls should be true`);

            let currentValue: any = false;
            let expected = false;
            webview.displayZoomControls = currentValue;

            TKUnit.assertEqual(webview.displayZoomControls, expected, `displayZoomControls should be disabled`);
            TKUnit.assertEqual(androidWebView.getSettings().getDisplayZoomControls(), expected, `native value for displayZoomControls should be false`);

            currentValue = "true";
            expected = true;
            webview.displayZoomControls = currentValue;

            TKUnit.assertEqual(webview.displayZoomControls, expected, `displayZoomControls string => boolean converter`);
            TKUnit.assertEqual(androidWebView.getSettings().getDisplayZoomControls(), expected, `native value for displayZoomControls after string => boolean`);

            currentValue = "false";
            expected = false;
            webview.displayZoomControls = currentValue;

            TKUnit.assertEqual(webview.displayZoomControls, expected, `displayZoomControls string => boolean converter`);
            TKUnit.assertEqual(androidWebView.getSettings().getDisplayZoomControls(), expected, `native value for displayZoomControls after string => boolean`);

            done();
        } catch (err) {
            done(err);
        }
        // << webview-built-in-zoom-controls
    }
}

export function createTestCase(): WebViewTest {
    return new WebViewTest();
}
