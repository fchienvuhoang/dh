export async function elementAsPng(element: HTMLElement) {
  const { toPng } = await import("html-to-image");

  await document.fonts.ready;
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#fffdf9",
    width: element.offsetWidth,
    height: element.scrollHeight + element.offsetHeight - element.clientHeight,
    style: { maxHeight: "none", overflow: "visible" },
    filter: (node) =>
      !(node instanceof HTMLElement && node.dataset.imageExportIgnore === "true"),
  });

  return dataUrl;
}

export function copyElementAsPng(element: HTMLElement) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    return Promise.reject(new Error("Thiết bị chưa cho phép copy ảnh. Vui lòng dùng Tải ảnh giao dịch."));
  }
  // Start the clipboard write inside the click gesture, including on iPhone.
  const image = elementAsPng(element).then(url => fetch(url).then(response => response.blob()));
  return navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
}

export async function downloadElementAsPng(element: HTMLElement, fileName: string) {
  const dataUrl = await elementAsPng(element);

  const link = document.createElement("a");
  link.download = `${sanitizeFileName(fileName)}.png`;
  link.href = dataUrl;
  link.click();
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "giao-dich";
}
