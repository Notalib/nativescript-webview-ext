import { NativeScriptConfig } from "@nativescript/core";

export default {
    id: "dk.nota.webviewdemo",
    appResourcesPath: "App_Resources",
    android: {
        v8Flags: "--expose_gc",
        markingMode: "none",
    },
    appPath: "app",
} as NativeScriptConfig;
