document.addEventListener("DOMContentLoaded", () => {
  if (window.mermaid) {
    mermaid.initialize({ startOnLoad: true, theme: document.body.dataset.mdColorScheme === "slate" ? "dark" : "default", securityLevel: "loose" });
  }
});
