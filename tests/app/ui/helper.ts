// tslint:disable:ordered-imports
import * as frame from "tns-core-modules/ui/frame";
import { unsetValue, isIOS } from "tns-core-modules/ui/core/view";
import { Page } from "tns-core-modules/ui/page";
import * as TKUnit from "../TKUnit";
import * as utils from "tns-core-modules/utils/utils";
import { Color } from "tns-core-modules/color";

// TODO: Remove this and get it from global to decouple builder for angular
import { createViewFromEntry } from "tns-core-modules/ui/builder";

export let ASYNC = 0.2;
export let MEMORY_ASYNC = 2;

export function getColor(uiColor: UIColor): Color {
    let redRef = new interop.Reference<number>();
    let greenRef = new interop.Reference<number>();
    let blueRef = new interop.Reference<number>();
    let alphaRef = new interop.Reference<number>();

    uiColor.getRedGreenBlueAlpha(redRef, greenRef, blueRef, alphaRef);
    let red = redRef.value * 255;
    let green = greenRef.value * 255;
    let blue = blueRef.value * 255;
    let alpha = alphaRef.value * 255;

    return new Color(alpha, red, green, blue);
}

function clearPage(): void {
    let newPage = getCurrentPage();
    if (!newPage) {
        throw new Error("NO CURRENT PAGE!!!!");
    }

    newPage.style.backgroundColor = unsetValue;
    newPage.style.color = unsetValue;
    newPage.bindingContext = unsetValue;
    newPage.className = unsetValue;
    newPage.id = unsetValue;
}

export function navigate(pageFactory: () => Page, navigationContext?: any): Page {
    let entry: frame.NavigationEntry = { create: pageFactory, animated: false, context: navigationContext, clearHistory: true };
    return navigateWithEntry(entry);
}

export function getCurrentPage(): Page {
    return frame.topmost().currentPage;
}

export function waitUntilNavigatedFrom(action: Function) {
    const currentPage = frame.topmost().currentPage;
    let completed = false;
    function navigatedFrom(args) {
        args.object.page.off("navigatedFrom", navigatedFrom);
        completed = true;
    }

    currentPage.on("navigatedFrom", navigatedFrom);
    action();
    TKUnit.waitUntilReady(() => completed);
}

export function navigateWithEntry(entry: frame.NavigationEntry): Page {
    const page = createViewFromEntry(entry) as Page;
    entry.moduleName = null;
    entry.create = function() {
        return page;
    };

    waitUntilNavigatedFrom(() => frame.topmost().navigate(entry));
    return page;
}

export function forceGC() {
    if (isIOS) {
        /* tslint:disable:no-unused-expression */
        // Could cause GC on the next call.
        new ArrayBuffer(4 * 1024 * 1024);
    }

    utils.GC();
    TKUnit.wait(0.001);
}
