interface ViewPortProperties {
    width?: number | "device-width";
    height?: number | "device-height";
    initialScale?: number;
    maximumScale?: number;
    minimumScale?: number;
    userScalable?: boolean | "yes" | "no";
}

(function(window) {
    const defaultViewPort: ViewPortProperties = {
        initialScale: 1.0,
    };

    const document = window.document;
    let meta: HTMLMetaElement;
    if (!document.querySelector('head meta[name="viewport"]')) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "viewport");

        document.head.appendChild(meta);
    }

    const viewPortInput = "<%= VIEW_PORT %>";
    let viewPortValues = defaultViewPort;
    if (viewPortInput && typeof viewPortInput === "object") {
        viewPortValues = viewPortInput;
    }

    const { initialScale = defaultViewPort.initialScale, width, height, userScalable, minimumScale, maximumScale } = viewPortValues;

    const content = [`initial-scale=${initialScale}`] as string[];

    if (width) {
        content.push(`width=${width}`);
    }

    if (height) {
        content.push(`height=${height}`);
    }

    if (typeof userScalable === "boolean") {
        content.push(`user-scalable=${userScalable ? "yes" : "no"}`);
    } else if (typeof userScalable === "string") {
        const lcUserScalable = `${userScalable}`.toLowerCase();
        if (lcUserScalable === "yes") {
            content.push(`user-scalable=yes`);
        } else if (lcUserScalable === "no") {
            content.push(`user-scalable=no`);
        } else {
            console.error(`userScalable=${JSON.stringify(userScalable)} is an unknown value`);
        }
    }

    if (minimumScale) {
        content.push(`minimum-scale=${minimumScale}`);
    }

    if (maximumScale) {
        content.push(`maximum-scale=${maximumScale}`);
    }

    meta.setAttribute("content", content.join(", "));
})(window);
