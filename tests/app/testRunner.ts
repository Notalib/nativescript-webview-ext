/* tslint:disable */
import * as TKUnit from "./TKUnit";
import { _resetRootView, getRootView } from "tns-core-modules/application";
import { messageType } from "tns-core-modules/trace";
import { topmost, Frame, NavigationEntry } from "tns-core-modules/ui/frame";
import { Page } from "tns-core-modules/ui/page";
import { TextView } from "tns-core-modules/ui/text-view";
import { Button } from "tns-core-modules/ui/button";
import { StackLayout } from "tns-core-modules/ui/layouts/stack-layout";
import * as platform from "tns-core-modules/platform";
import "./ui-test";
import * as fs from "tns-core-modules/file-system";
import { unsetValue } from "tns-core-modules/ui/core/properties";
import { ad } from "tns-core-modules/utils/utils";

Frame.defaultAnimatedNavigation = false;

export function isRunningOnEmulator(): boolean {
    // This checks are not good enough to be added to modules but keeps unittests green.

    if (platform.device.os === platform.platformNames.android) {
        return android.os.Build.FINGERPRINT.indexOf("generic") > -1 ||
            android.os.Build.HARDWARE.toLowerCase() === "goldfish" ||
            android.os.Build.HARDWARE.toLowerCase() === "donatello" || // VS Emulator
            android.os.Build.PRODUCT.toLocaleLowerCase().indexOf("sdk") > -1 ||
            android.os.Build.PRODUCT.toLocaleLowerCase().indexOf("emulator") > -1; // VS Emulator
    }
    else if (platform.device.os === platform.platformNames.ios) {
        //return platform.device.model === "iPhone Simulator";
        return (__dirname.search("Simulator") > -1);
    } else {
        throw new Error('Unsupported platform');
    }
}

export const allTests = {};

import * as webViewTests from "./ui/web-view/web-view-tests";
allTests["WEB-VIEW"] = webViewTests;

const testsSuitesWithLongDelay = {
    HTTP: 15 * 1000,
}

const testsWithLongDelay = {
    testLocation: 10000,
    testLocationOnce: 10000,
    testLocationOnceMaximumAge: 10000,
    //web-view-tests
    testLoadExistingUrl: 10000 * 5,
    testLoadLocalFile: 10000 * 5,
    testLoadInvalidUrl: 10000,
    testLoadUpperCaseSrc: 10000 * 5,
    test_SettingImageSrc: 30 * 1000,
    test_ChainingAnimations: 30 * 1000,
    test_AnimatingProperties: 30 * 1000,
    test_AnimateBackgroundColor_FromString: 10 * 1000
}

let startTime;
let running = false;
let testsQueue = new Array<TestInfo>();

function printRunTestStats() {
    const testCases = new Array<string>();

    let failedTestCount = 0;
    const failedTestInfo = [];
    const slowTests = new Array<string>();

    let allTests = testsQueue.filter(t => t.isTest);

    allTests.forEach((testCase, i, arr) => {
        let testName = testCase.testName;
        if (!testCase.isPassed) {
            failedTestCount++;
            failedTestInfo.push(testCase.testName + " FAILED: " + testCase.errorMessage);
        }

        let duration = (testCase.duration / 1000).toFixed(2);
        if (testCase.duration > 500) {
            slowTests.push(`${testCase.testName}: ${duration}s`);
        }
    });

    const totalTime = (TKUnit.time() - startTime).toFixed(2);

    let finalMessage = `\n` +
        `=== ALL TESTS COMPLETE ===\n` +
        `${(allTests.length - failedTestCount)} OK, ${failedTestCount} failed\n` +
        `DURATION: ${totalTime} ms\n` +
        `=== END OF TESTS ===\n`;

    TKUnit.write(finalMessage, messageType.info);

    failedTestInfo.forEach((message, i, arr) => {
        TKUnit.write(message, messageType.error);
        finalMessage += "\n" + message;
    });

    // console.log("test-result.xml:\n" + generateTestFile(allTests));

    // DO NOT CHANGE THE FIRST ROW! Used as an indicator for test run pass detection.
    TKUnit.write(`Tests EOF!`, messageType.info);

    showReportPage(finalMessage);
}

function generateTestFile(allTests: TestInfo[]) {
    let failedTestCount = 0;

    const testCases = new Array<string>();
    allTests.forEach((testCase, i, arr) => {
        let testName = testCase.testName;
        let duration = (testCase.duration / 1000).toFixed(2);

        testCases.push(`<testcase classname="${platform.device.os}" name="${testName}" time="${duration}">`)
        if (!testCase.isPassed) {
            failedTestCount++;
            testCases.push(`<failure type="exceptions.AssertionError"><![CDATA[${testCase.errorMessage}]]></failure>`)
        }
        testCases.push(`</testcase>`);
    });

    const totalTime = (TKUnit.time() - startTime).toFixed(2);

    const result = [
        "<testsuites>",
        `<testsuite name="NativeScript Tests" timestamp="${new Date()}" hostname="hostname" time="${totalTime}" errors="0" tests="${allTests.length}" skipped="0" failures="${failedTestCount}">`,
        ...testCases,
        "</testsuite>",
        "</testsuites>"
    ].join("");

    return result;
}

function showReportPage(finalMessage: string) {
    const stack = new StackLayout();
    const btn = new Button();
    btn.text = "Rerun tests";
    btn.on("tap", () => runAll(testsSelector));
    stack.addChild(btn);

    const messageContainer = new TextView();
    messageContainer.editable = messageContainer.autocorrect = false;
    messageContainer.text = finalMessage;
    stack.addChild(messageContainer);

    topmost().navigate({
        create: () => {
            const page = new Page();
            page.content = stack;
            messageContainer.focus();
            page.style.fontSize = 11;
            if (platform.isAndroid) {
                page.on('navigatedTo', () => {
                    messageContainer.focus();
                    setTimeout(() => messageContainer.dismissSoftInput());
                });
            }

            return page;
        },
        clearHistory: true
    });
}

function startLog(): void {
    let testsName: string = this.name;
    TKUnit.write("START " + testsName + " TESTS.", messageType.info);
    this.start = TKUnit.time();
}

function log(): void {
    let testsName: string = this.name;
    let duration = TKUnit.time() - this.start;
    TKUnit.write(testsName + " COMPLETED for " + duration.toFixed(2) + " BACKSTACK DEPTH: " + topmost().backStack.length, messageType.info);
}

let testsSelector: string
export function runAll(testSelector?: string) {
    testsSelector = testSelector;
    if (running) {
        // TODO: We may schedule pending run requests
        return;
    }

    let singleModuleName, singleTestName;
    if (testSelector) {
        const pair = testSelector.split(".");
        singleModuleName = pair[0];
        if (singleModuleName) {
            if (singleModuleName.length === 0) {
                singleModuleName = undefined;
            } else {
                singleModuleName = singleModuleName.toLowerCase();
            }
        }

        singleTestName = pair[1];
        if (singleTestName) {
            if (singleTestName.length === 0) {
                singleTestName = undefined;
            } else {
                singleTestName = singleTestName.toLowerCase();
            }
        }
    }

    console.log("TESTS: " + singleModuleName ? singleModuleName : "" + " " + singleTestName ? singleTestName : "");

    const totalSuccess = 0;
    const totalFailed: Array<TKUnit.TestFailure> = [];
    testsQueue.push(new TestInfo(() => { running = true; startTime = TKUnit.time(); }));
    for (const name in allTests) {
        if (singleModuleName && (singleModuleName !== name.toLowerCase())) {
            continue;
        }

        const testModule = allTests[name];

        const test = testModule.createTestCase ? testModule.createTestCase() : testModule;
        test.name = name;

        testsQueue.push(new TestInfo(startLog, test));

        if (test.setUpModule) {
            testsQueue.push(new TestInfo(test.setUpModule, test));
        }

        for (const testName in test) {
            if (singleTestName && (singleTestName !== testName.toLowerCase())) {
                continue;
            }

            const testFunction = test[testName];
            if ((typeof (testFunction) === "function") && (testName.substring(0, 4) == "test")) {
                if (test.setUp) {
                    testsQueue.push(new TestInfo(test.setUp, test));
                }
                const testTimeout = testsWithLongDelay[testName] || testsSuitesWithLongDelay[name];
                testsQueue.push(new TestInfo(testFunction, test, true, name + "." + testName, false, null, testTimeout));
                if (test.tearDown) {
                    testsQueue.push(new TestInfo(test.tearDown, test));
                }
            }
        }
        if (test.tearDownModule) {
            testsQueue.push(new TestInfo(test.tearDownModule, test));
        }
        testsQueue.push(new TestInfo(log, test));
    }

    testsQueue.push(new TestInfo(printRunTestStats));
    testsQueue.push(new TestInfo(function () { testsQueue = []; running = false; }));

    TKUnit.runTests(testsQueue, 0);
}

class TestInfo implements TKUnit.TestInfoEntry {
    testFunc: () => void;
    instance: any;
    isTest: boolean;
    testName: string;
    isPassed: boolean;
    errorMessage: string;
    testTimeout: number;
    duration: number;

    constructor(testFunc, testInstance?: any, isTest?, testName?, isPassed?, errorMessage?, testTimeout?, duration?) {
        this.testFunc = testFunc;
        this.instance = testInstance || null;
        this.isTest = isTest || false;
        this.testName = testName || "";
        this.isPassed = isPassed || false;
        this.errorMessage = errorMessage || "";
        this.testTimeout = testTimeout;
        this.duration = duration;
    }
}
