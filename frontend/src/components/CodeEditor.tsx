import React from "react";
import CodeMirror from "@uiw/react-codemirror";

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language?: "markdown" | "html";
  onFileUpload?: (file: File) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onFileUpload,
}) => {
  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onFileUpload) {
      e.preventDefault();
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className="h-full w-full overflow-hidden text-sm font-mono flex flex-col"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <CodeMirror
        value={value}
        height="100%"
        className="h-full overflow-auto text-sm font-mono"
        onChange={(val) => onChange(val)}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
      />
    </div>
  );
};
