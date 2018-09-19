/// <reference path="../../node_modules/tns-platform-declarations/android.d.ts" />

declare module dk {
	export module nota {
		export module webviewinterface {
			export class WebViewBridgeInterface {
				public emitEvent(param0: string, param1: string): void;
				public emitEventToNativeScript(param0: string, param1: string): void;
				public constructor();
			}
		}
	}
}
