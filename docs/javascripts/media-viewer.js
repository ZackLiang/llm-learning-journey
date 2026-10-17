(() => {
  const ensureViewer = () => {
    let viewer = document.querySelector(".media-viewer");
    if (viewer) return viewer;

    viewer = document.createElement("div");
    viewer.className = "media-viewer";
    viewer.setAttribute("aria-hidden", "true");
    viewer.innerHTML = `
      <button class="media-viewer__close" type="button" aria-label="关闭预览">×</button>
      <div class="media-viewer__content"></div>
      <p class="media-viewer__hint">点击空白处或按 Esc 关闭</p>
    `;
    document.body.appendChild(viewer);

    const close = () => {
      viewer.classList.remove("is-open");
      viewer.setAttribute("aria-hidden", "true");
      viewer.querySelector(".media-viewer__content").replaceChildren();
    };
    viewer.addEventListener("click", (event) => {
      if (event.target === viewer || event.target.closest(".media-viewer__close")) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
    return viewer;
  };

  const openMedia = (source) => {
    const viewer = ensureViewer();
    const content = viewer.querySelector(".media-viewer__content");
    const clone = source.cloneNode(true);
    clone.classList.add("media-viewer__clone");
    if (clone.tagName === "IMG") clone.removeAttribute("height");
    content.replaceChildren(clone);
    viewer.classList.add("is-open");
    viewer.setAttribute("aria-hidden", "false");
  };

  document.addEventListener("click", (event) => {
    const image = event.target.closest("img.paper-figure");
    const diagram = event.target.closest(".mermaid");
    if (image) openMedia(image);
    else if (diagram && diagram.querySelector("svg")) openMedia(diagram);
  });
})();
