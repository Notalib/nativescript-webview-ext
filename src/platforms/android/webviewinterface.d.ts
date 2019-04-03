/// <reference path="../../node_modules/tns-platform-declarations/android-28.d.ts" />

declare namespace dk {
    export namespace nota {
        export namespace webviewinterface {
            export class WebViewBridgeInterface {
                public emitEvent(param0: string, param1: string): void;
                public emitEventToNativeScript(param0: string, param1: string): void;
                public constructor();
            }
        }
    }
}
