import React, { useEffect, useRef } from "react";

interface HtmlPreviewProps {
  content: string;
}

export const HtmlPreview: React.FC<HtmlPreviewProps> = ({ content }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      // Chèn font Be Vietnam Pro mặc định vào iframe để đồng nhất typography
      const htmlWithFont = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
            <style>
              body {
                font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                padding: 1.5rem;
                margin: 0;
                line-height: 1.6;
                color: #1e293b;
              }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `;
      doc.write(htmlWithFont);
      doc.close();
    }
  }, [content]);

  return (
    <iframe
      ref={iframeRef}
      title="HTML Sandboxed Preview"
      // CẢNH BÁO BẢO MẬT: Bắt buộc chỉ dùng allow-scripts, tuyệt đối KHÔNG có allow-same-origin
      sandbox="allow-scripts"
      className="w-full h-full border-0 bg-white"
    />
  );
};
