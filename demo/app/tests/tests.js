var WebViewExt = require("@nota/nativescript-webview-ext").WebViewExt;
var WebViewExt = new WebViewExt();

describe("greet function", function() {
    it("exists", function() {
        expect(WebViewExt.greet).toBeDefined();
    });

    it("returns a string", function() {
        expect(WebViewExt.greet()).toEqual("Hello, NS");
    });
});
