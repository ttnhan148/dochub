import React, { useState, useEffect } from "react";
import { Command } from "cmdk";
import { apiRequest } from "@/hooks/useApi";
import { Search, FileText, Folder, CornerDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResultItem {
  document_id: string;
  title: string;
  snippet: string;
  folder_id?: string;
  folder_name?: string;
  tags: string[];
  updated_at: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDocument: (documentId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  onSelectDocument,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Lắng nghe phím tắt Ctrl+K hoặc Cmd+K toàn cục
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Tìm kiếm FTS5 khi query thay đổi (debounce 250ms)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiRequest<SearchResultItem[]>(
          `/api/search?q=${encodeURIComponent(query.trim())}&limit=15`
        );
        setResults(data);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4 font-sans"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-2xl bg-card border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full">
          <div className="flex items-center border-b px-3 bg-muted/20">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Tìm kiếm tài liệu theo tiêu đề hoặc nội dung... (Ctrl + K)"
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-96 overflow-y-auto p-2">
            {loading && (
              <div className="p-4 text-xs text-center text-muted-foreground">
                Đang tìm kiếm trong toàn văn bản...
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="p-4 text-xs text-center text-muted-foreground">
                Không tìm thấy tài liệu phù hợp với từ khóa "{query}".
              </div>
            )}

            {!query && (
              <div className="p-4 text-xs text-center text-muted-foreground">
                Gõ từ khóa để tìm kiếm siêu tốc với SQLite FTS5...
              </div>
            )}

            {results.map((item) => (
              <Command.Item
                key={item.document_id}
                value={item.document_id + " " + item.title}
                onSelect={() => {
                  onSelectDocument(item.document_id);
                  onOpenChange(false);
                }}
                className="flex flex-col gap-1 p-2.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold">{item.title}</span>
                  </div>
                  {item.folder_name && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Folder className="w-3 h-3" /> {item.folder_name}
                    </span>
                  )}
                </div>

                {/* Trích đoạn Highlight FTS5 */}
                {item.snippet && (
                  <div
                    className="text-[11px] text-muted-foreground line-clamp-2 pl-6 font-sans"
                    dangerouslySetInnerHTML={{ __html: item.snippet }}
                  />
                )}

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex items-center gap-1 pl-6 pt-1">
                    {item.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[9px] px-1 py-0 h-4">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                )}
              </Command.Item>
            ))}
          </Command.List>

          <div className="flex items-center justify-between border-t px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/10">
            <span>Tìm kiếm toàn văn bản SQLite FTS5 (Tiếng Việt có dấu)</span>
            <span className="flex items-center gap-1">
              Nhấn <CornerDownLeft className="w-3 h-3 inline" /> để mở
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
};
