var WebviewExt = require("nativescript-webview-ext").WebviewExt;
var webviewExt = new WebviewExt();

describe("greet function", function() {
    it("exists", function() {
        expect(webviewExt.greet).toBeDefined();
    });

    it("returns a string", function() {
        expect(webviewExt.greet()).toEqual("Hello, NS");
    });
});