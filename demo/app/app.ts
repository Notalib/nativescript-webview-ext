/// <reference path="../../src/platforms/ios/GCDWebServer.d.ts" />

import "nativescript-tslib";

import "./bundle-config";

import * as application from "tns-core-modules/application";
import * as fs from "tns-core-modules/file-system";

const webserver = new GCDWebServer();

webserver.addDefaultHandlerForMethodRequestClassProcessBlock("GET", GCDWebServerRequest.class(), function(request) {
    const filepath = `${fs.knownFolders.currentApp().path}/assets/test-data/html/javascript-calls.html`;
    // return GCDWebServerDataResponse.responseWithHTML("<html><body><p>Hello World</p></body></html>");
    const response = GCDWebServerFileResponse.responseWithFile(filepath);
    response.setValueForAdditionalHeader("*", "Access-Control-Allow-Origin");
    return response;
});

webserver.startWithPortBonjourName(18080, null);

application.start({ moduleName: "main-page" });
