(function(window) {
    const document = window.document;
    let meta = document.querySelector('head meta[name="viewport"]');
    if (!meta) {
        meta = document.createElement("meta");
        document.head.appendChild(meta);
    }

    meta.setAttribute("name", "viewport");
    meta.setAttribute("content", "initial-scale=1.0");
})(window);
