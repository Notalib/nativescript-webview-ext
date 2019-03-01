import { WebViewCommonTest } from "./web-view-tests-common";

export class WebViewTest extends WebViewCommonTest {}

export function createTestCase(): WebViewTest {
    return new WebViewTest();
}
