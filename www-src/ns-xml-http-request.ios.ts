const originalXMLHttpRequest = XMLHttpRequest;

const xLocalRegexp = /^x-local:\/\/(.*)/i;

class NSXMLHttpRequest extends originalXMLHttpRequest {
    public open(method, url) {
        const m = url.match(xLocalRegexp);
        if (m) {
            url = `http://<%= SERVERURL %>/?x-local=${escape(m[1])}`;
        }

        super.open(method, url);
    }
}

(window as any)["XMLHttpRequest"] = NSXMLHttpRequest;
