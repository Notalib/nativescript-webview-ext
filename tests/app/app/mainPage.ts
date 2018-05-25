import { Page } from "tns-core-modules/ui/page";
import * as tests from "../testRunner";

function runTests() {
    setTimeout(() => tests.runAll(''), 10);
}

export function onNavigatedTo(args) {
    args.object.off(Page.loadedEvent, onNavigatedTo);

    runTests();
}
