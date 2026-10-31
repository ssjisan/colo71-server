const escapeHtml = (v = "") =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
function serializeNode(node) {
  if (!node || typeof node !== "object") return "";
  if (typeof node.text === "string") {
    let s = escapeHtml(node.text).replace(/\n/g, "<br />");
    if (node.bold) s = `<strong>${s}</strong>`;
    if (node.italic) s = `<em>${s}</em>`;
    if (node.underline) s = `<u>${s}</u>`;
    return s;
  }
  const children = Array.isArray(node.children)
    ? node.children.map(serializeNode).join("")
    : "";
  const align = ["left", "center", "right", "justify"].includes(node.align)
    ? ` style="text-align:${node.align}"`
    : "";
  switch (node.type) {
    case "paragraph":
      return `<p${align}>${children || "<br />"}</p>`;
    case "heading-one":
      return `<h1${align}>${children}</h1>`;
    case "heading-two":
      return `<h2${align}>${children}</h2>`;
    case "heading-three":
      return `<h3${align}>${children}</h3>`;
    case "heading-four":
      return `<h4${align}>${children}</h4>`;
    case "heading-five":
      return `<h5${align}>${children}</h5>`;
    case "heading-six":
      return `<h6${align}>${children}</h6>`;
    case "block-quote":
      return `<blockquote>${children}</blockquote>`;
    case "numbered-list":
      return `<ol${align}>${children}</ol>`;
    case "bulleted-list":
      return `<ul${align}>${children}</ul>`;
    case "list-item":
      return `<li>${children}</li>`;
    case "break":
      return "<br />";
    case "image": {
      const url = escapeHtml(node.url || "");
      const width = Number(node.width);
      const style =
        Number.isFinite(width) && width > 0
          ? `width:${Math.min(width, 2000)}px;`
          : "max-width:100%;";
      const imageAlign = ["left", "center", "right"].includes(node.align)
        ? node.align
        : "left";
      return `<div style="text-align:${imageAlign};margin:10px 0"><img src="${url}" alt="${escapeHtml(node.alt || "")}" style="${style}height:auto;max-width:100%" /></div>`;
    }
    default:
      return children;
  }
}
const serializeContent = (json) => json.map(serializeNode).join("");
function walkImages(nodes, callback) {
  for (const node of nodes) {
    if (node?.type === "image") callback(node);
    if (Array.isArray(node?.children)) walkImages(node.children, callback);
  }
}
module.exports = { serializeContent, walkImages };
