// ============================================================================
// RICH TEXT EDITOR — vanilla contenteditable + execCommand.
// Supports: bold, italic, underline, strike, headings, lists, quote,
// code block, inline code, link, image (uploads to Supabase Storage),
// table, horizontal rule, align, undo/redo.
// ============================================================================
function initRichText(toolbarEl, bodyEl, { uploadFolder = "notes" } = {}) {
  if (!toolbarEl || !bodyEl) return null;
  bodyEl.setAttribute("contenteditable", "true");

  function exec(cmd, val = null) {
    document.execCommand(cmd, false, val);
    bodyEl.focus();
  }

  function insertHTML(html) {
    document.execCommand("insertHTML", false, html);
    bodyEl.focus();
  }

  function makeBtn(label, title, handler) {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = label;
    b.title = title;
    b.addEventListener("click", (e) => { e.preventDefault(); handler(); });
    return b;
  }

  const groups = [
    [
      makeBtn("<b>B</b>", "Bold", () => exec("bold")),
      makeBtn("<i>I</i>", "Italic", () => exec("italic")),
      makeBtn("<u>U</u>", "Underline", () => exec("underline")),
      makeBtn("<s>S</s>", "Strikethrough", () => exec("strikeThrough")),
    ],
    [
      makeBtn("H1", "Heading 1", () => exec("formatBlock", "H2")),
      makeBtn("H2", "Heading 2", () => exec("formatBlock", "H3")),
      makeBtn("¶", "Paragraph", () => exec("formatBlock", "P")),
    ],
    [
      makeBtn("&bull;", "Bullet list", () => exec("insertUnorderedList")),
      makeBtn("1.", "Numbered list", () => exec("insertOrderedList")),
      makeBtn("&ldquo;", "Quote", () => exec("formatBlock", "BLOCKQUOTE")),
    ],
    [
      makeBtn("&lt;/&gt;", "Inline code", () => exec("formatBlock", "PRE")),
      makeBtn("{ }", "Code block", () => insertHTML('<pre><code contenteditable="true">// code\n</code></pre><p><br></p>')),
      makeBtn("!", "Callout", () => insertHTML('<div class="callout">💡 Note — write here</div><p><br></p>')),
    ],
    [
      makeBtn("&#128279;", "Insert link", () => {
        const url = prompt("Link URL:", "https://");
        if (url) exec("createLink", url);
      }),
      makeBtn("&#128247;", "Insert image", async () => {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = async () => {
          const file = input.files[0];
          if (!file) return;
          try {
            toast("Uploading image…");
            const url = await uploadToStorage(file, uploadFolder);
            insertHTML(`<img src="${url}" alt="">`);
            toast("Image inserted", "ok");
          } catch (err) { toast("Upload failed: " + err.message, "err"); }
        };
        input.click();
      }),
      makeBtn("&#9636;", "Table (3x3)", () => {
        insertHTML(`<table><tr><th>Col 1</th><th>Col 2</th><th>Col 3</th></tr>
          <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
          <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></table><p><br></p>`);
      }),
      makeBtn("&#8213;", "Horizontal rule", () => exec("insertHorizontalRule")),
    ],
    [
      makeBtn("&#8624;", "Undo", () => exec("undo")),
      makeBtn("&#8625;", "Redo", () => exec("redo")),
    ],
  ];

  groups.forEach((g, i) => {
    g.forEach(btn => toolbarEl.appendChild(btn));
    if (i < groups.length - 1) {
      const sep = document.createElement("span");
      sep.style.cssText = "width:1px;background:var(--line);margin:4px 4px;";
      toolbarEl.appendChild(sep);
    }
  });

  return {
    getHTML: () => bodyEl.innerHTML.trim(),
    setHTML: (html) => { bodyEl.innerHTML = html || ""; },
  };
}
