import React, { useEffect, useRef } from "react";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import katex from "katex";
import mermaid from "mermaid";

interface MarkdownPreviewProps {
  content: string;
}

// Khởi tạo Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
});

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Cấu hình MarkdownIt
  const md: MarkdownIt = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str: string, lang: string): string {
      if (lang === "mermaid") {
        return `<div class="mermaid-block">${md.utils.escapeHtml(str)}</div>`;
      }
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
        } catch (__) {}
      }
      return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    },
  });

  // Xử lý KaTeX math sơ bộ trước khi render markdown:
  // Thay thế display math $$...$$ và inline math $...$
  const processMath = (text: string): string => {
    if (!text) return "";
    // Display math: $$...$$
    let processed = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      } catch (e) {
        return `$$${math}$$`;
      }
    });
    // Inline math: $...$ (không phải \$)
    processed = processed.replace(/(?<!\\)\$([^\$\n]+?)\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      } catch (e) {
        return `$${math}$`;
      }
    });
    return processed;
  };

  const processedContent = processMath(content);
  const htmlOutput = md.render(processedContent);

  // Render Mermaid diagrams sau khi DOM đã vẽ
  useEffect(() => {
    if (!containerRef.current) return;
    const mermaidNodes = containerRef.current.querySelectorAll<HTMLDivElement>(".mermaid-block");
    if (mermaidNodes.length === 0) return;

    mermaidNodes.forEach(async (node, index) => {
      const code = node.textContent || "";
      if (!code) return;
      const id = `mermaid-svg-${Date.now()}-${index}`;
      try {
        const { svg } = await mermaid.render(id, code);
        node.innerHTML = svg;
      } catch (err) {
        node.innerHTML = `<div class="p-2 border border-red-300 bg-red-50 text-red-600 text-xs font-mono rounded">Lỗi vẽ Mermaid diagram: ${String(err)}</div>`;
      }
    });
  }, [htmlOutput]);

  return (
    <div
      ref={containerRef}
      className="prose prose-slate dark:prose-invert max-w-none p-6 text-foreground font-sans leading-relaxed selection:bg-primary/20"
      dangerouslySetInnerHTML={{ __html: htmlOutput }}
    />
  );
};
