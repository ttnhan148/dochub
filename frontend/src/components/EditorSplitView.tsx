import React, { useState, useEffect, useRef } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Share2,
  History,
  Sparkles,
  Languages,
  Paperclip,
  Trash2,
  Columns,
  Square,
  Eye,
  Plus,
  X,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CodeEditor } from "./CodeEditor";
import { MarkdownPreview } from "./MarkdownPreview";
import { HtmlPreview } from "./HtmlPreview";
import { ShareDialog } from "./ShareDialog";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { apiRequest } from "@/hooks/useApi";
import { toast } from "sonner";

export interface FullDocument {
  id: string;
  title: string;
  type: "markdown" | "html";
  folder_id?: string;
  created_at: string;
  updated_at: string;
  current_version_id?: string;
  tags: { id: string; name: string }[];
  content: string;
}

interface EditorSplitViewProps {
  document: FullDocument;
  onDocumentUpdated: (doc: FullDocument) => void;
  onDocumentDeleted: (docId: string) => void;
  onDocumentCreated: (docId: string) => void;
}

export const EditorSplitView: React.FC<EditorSplitViewProps> = ({
  document,
  onDocumentUpdated,
  onDocumentDeleted,
  onDocumentCreated,
}) => {
  const [content, setContent] = useState(document.content);
  const [title, setTitle] = useState(document.title);
  const [tags, setTags] = useState<string[]>(document.tags.map((t) => t.name));
  const [newTagInput, setNewTagInput] = useState("");
  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">("split");
  const [isDraft, setIsDraft] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals state
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState("English");
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestTagsOpen, setSuggestTagsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ khi đổi document được chọn
  useEffect(() => {
    // Kiểm tra xem có bản draft trong localStorage không
    const draftKey = `dochub_draft_${document.id}`;
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft && savedDraft !== document.content) {
      setContent(savedDraft);
      setIsDraft(true);
      toast.info("Đã khôi phục bản nháp tạm thời từ trình duyệt");
    } else {
      setContent(document.content);
      setIsDraft(false);
    }

    setTitle(document.title);
    setTags(document.tags.map((t) => t.name));
  }, [document.id]);

  // Cập nhật nội dung & lưu draft vào localStorage (debounce an toàn)
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsDraft(true);
    localStorage.setItem(`dochub_draft_${document.id}`, newContent);
  };

  // Lưu tài liệu vào backend & tạo snapshot version
  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await apiRequest<FullDocument>(`/api/documents/${document.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: title.trim() || document.title,
          content: content,
          tags: tags,
        }),
      });
      // Xóa draft sau khi đã lưu thành công
      localStorage.removeItem(`dochub_draft_${document.id}`);
      setIsDraft(false);
      onDocumentUpdated(updated);
      toast.success("Đã lưu tài liệu & tạo snapshot phiên bản mới!");
    } catch (err: any) {
      toast.error(`Lỗi khi lưu: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Phím tắt Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [content, title, tags, document.id]);

  // Upload tệp asset đính kèm
  const handleFileUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.warning("Tệp tin có kích thước lớn (>50MB), quá trình tải có thể mất nhiều thời gian.");
    }
    const formData = new FormData();
    formData.append("document_id", document.id);
    formData.append("file", file);

    try {
      const asset = await apiRequest<{ id: string; filename: string; url: string }>("/api/assets/upload", {
        method: "POST",
        body: formData,
      });

      const isImage = file.type.startsWith("image/");
      const insertSnippet =
        document.type === "markdown"
          ? isImage
            ? `\n![${asset.filename}](${asset.url})\n`
            : `\n[${asset.filename}](${asset.url})\n`
          : isImage
          ? `\n<img src="${asset.url}" alt="${asset.filename}" />\n`
          : `\n<a href="${asset.url}">${asset.filename}</a>\n`;

      handleContentChange(content + insertSnippet);
      toast.success(`Đã tải lên và chèn: ${file.name}`);
    } catch (err: any) {
      toast.error(`Lỗi tải tệp: ${err.message}`);
    }
  };

  // Xóa tài liệu
  const handleDeleteDocument = async () => {
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn tài liệu "${document.title}"?`)) return;
    try {
      await apiRequest(`/api/documents/${document.id}`, { method: "DELETE" });
      localStorage.removeItem(`dochub_draft_${document.id}`);
      toast.success("Đã xóa tài liệu");
      onDocumentDeleted(document.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // AI Suggest Tags
  const handleSuggestTags = async () => {
    setSuggestingTags(true);
    try {
      const data = await apiRequest<{ tags: string[] }>("/api/ai/suggest-tags", {
        method: "POST",
        body: JSON.stringify({ document_id: document.id }),
      });
      setSuggestedTags(data.tags || []);
      setSuggestTagsOpen(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSuggestingTags(false);
    }
  };

  const handleApplySuggestedTag = (tag: string) => {
    const cleanTag = tag.trim().toLowerCase();
    if (!tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
      setIsDraft(true);
    }
  };

  // AI Translate
  const handleTranslate = async () => {
    setTranslating(true);
    try {
      const newDoc = await apiRequest<FullDocument>("/api/ai/translate", {
        method: "POST",
        body: JSON.stringify({
          document_id: document.id,
          target_lang: targetLang,
        }),
      });
      toast.success(`Đã dịch thành công bản sao: ${newDoc.title}`);
      setTranslateOpen(false);
      onDocumentCreated(newDoc.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTranslating(false);
    }
  };

  // Thêm Tag thủ công
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTagInput.trim()) {
      e.preventDefault();
      const clean = newTagInput.trim().toLowerCase();
      if (!tags.includes(clean)) {
        setTags([...tags, clean]);
        setIsDraft(true);
      }
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    setIsDraft(true);
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-background font-sans">
      {/* Thanh Header / Toolbar */}
      <div className="border-b px-4 py-2 flex flex-wrap items-center justify-between gap-2 bg-card">
        {/* Nhập tiêu đề & trạng thái nháp */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDraft(true);
            }}
            placeholder="Tiêu đề tài liệu..."
            className="font-bold text-base border-transparent hover:border-input focus:border-input h-9 px-2 shadow-none"
          />
          {isDraft ? (
            <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40 shrink-0">
              Nháp chưa lưu
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[11px] text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 shrink-0 flex items-center gap-1">
              <Check className="w-3 h-3" /> Đã lưu
            </Badge>
          )}
        </div>

        {/* Cụm Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs">
          {/* Chế độ View Mode */}
          <div className="flex border rounded-md p-0.5 bg-muted/40 mr-1">
            <button
              onClick={() => setViewMode("split")}
              className={`p-1.5 rounded ${viewMode === "split" ? "bg-background shadow-xs text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
              title="Split-view (Soạn thảo & Xem song song)"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("editor")}
              className={`p-1.5 rounded ${viewMode === "editor" ? "bg-background shadow-xs text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
              title="Chỉ soạn thảo"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`p-1.5 rounded ${viewMode === "preview" ? "bg-background shadow-xs text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
              title="Chỉ xem Preview"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Upload file đính kèm */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => fileInputRef.current?.click()}
            title="Đính kèm ảnh hoặc file"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </Button>

          {/* AI Gợi ý Tags */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs text-indigo-600 dark:text-indigo-400"
            onClick={handleSuggestTags}
            disabled={suggestingTags}
            title="AI gợi ý tags"
          >
            <Sparkles className="w-3.5 h-3.5" /> {suggestingTags ? "Đang nghĩ..." : "Tags AI"}
          </Button>

          {/* AI Dịch song ngữ */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs text-blue-600 dark:text-blue-400"
            onClick={() => setTranslateOpen(true)}
            title="Dịch song ngữ bằng AI"
          >
            <Languages className="w-3.5 h-3.5" /> Dịch
          </Button>

          {/* Lịch sử phiên bản */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setHistoryOpen(true)}
            title="Lịch sử phiên bản"
          >
            <History className="w-3.5 h-3.5" /> Lịch sử
          </Button>

          {/* Chia sẻ công khai */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setShareOpen(true)}
            title="Chia sẻ ra ngoài"
          >
            <Share2 className="w-3.5 h-3.5" /> Chia sẻ
          </Button>

          {/* Nút Save chính */}
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-3.5 h-3.5" /> {saving ? "Đang lưu..." : "Lưu (Ctrl+S)"}
          </Button>

          {/* Xóa tài liệu */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleDeleteDocument}
            title="Xóa tài liệu"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Dòng quản lý Tags */}
      <div className="px-4 py-1.5 border-b flex items-center gap-1.5 flex-wrap bg-muted/10 text-xs">
        <span className="text-[11px] text-muted-foreground font-medium">Tags:</span>
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1 text-[11px] px-2 py-0.5">
            #{t}
            <button
              onClick={() => handleRemoveTag(t)}
              className="hover:text-destructive focus:outline-none"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <Input
          placeholder="+ Thêm tag (gõ Enter)..."
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          className="h-6 w-36 text-xs px-2 shadow-none border-dashed bg-transparent"
        />
      </div>

      {/* Vùng Workspace chính: Resizable Split-view */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "split" && (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={25}>
              <CodeEditor
                value={content}
                onChange={handleContentChange}
                language={document.type}
                onFileUpload={handleFileUpload}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25} className="overflow-y-auto bg-muted/5">
              {document.type === "markdown" ? (
                <MarkdownPreview content={content} />
              ) : (
                <HtmlPreview content={content} />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {viewMode === "editor" && (
          <div className="h-full">
            <CodeEditor
              value={content}
              onChange={handleContentChange}
              language={document.type}
              onFileUpload={handleFileUpload}
            />
          </div>
        )}

        {viewMode === "preview" && (
          <div className="h-full overflow-y-auto bg-muted/5">
            {document.type === "markdown" ? (
              <MarkdownPreview content={content} />
            ) : (
              <HtmlPreview content={content} />
            )}
          </div>
        )}
      </div>

      {/* Modal Chia sẻ */}
      <ShareDialog
        documentId={document.id}
        documentTitle={document.title}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      {/* Modal Lịch sử phiên bản */}
      <VersionHistoryModal
        documentId={document.id}
        currentContent={content}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRestored={() => {
          apiRequest<FullDocument>(`/api/documents/${document.id}`).then((doc) => {
            setContent(doc.content);
            onDocumentUpdated(doc);
          });
        }}
      />

      {/* Modal Chọn ngôn ngữ Dịch AI */}
      <Dialog open={translateOpen} onOpenChange={setTranslateOpen}>
        <DialogContent className="max-w-sm font-sans">
          <DialogHeader>
            <DialogTitle>Dịch tài liệu bằng AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Bản dịch sẽ được tạo thành một tài liệu mới độc lập mang hậu tố ngôn ngữ, không làm ảnh hưởng tài liệu gốc.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium">Ngôn ngữ đích:</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full text-sm border rounded-md p-2 bg-background"
              >
                <option value="English">Tiếng Anh (English)</option>
                <option value="Vietnamese">Tiếng Việt</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTranslateOpen(false)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleTranslate} disabled={translating}>
              {translating ? "Đang dịch..." : "Bắt đầu dịch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Gợi ý Tags AI */}
      <Dialog open={suggestTagsOpen} onOpenChange={setSuggestTagsOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI đề xuất thẻ (Tags)
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-xs text-muted-foreground">
              Nhấp vào các nhãn dưới đây để gắn nhanh vào tài liệu của bạn:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedTags.length === 0 && (
                <div className="text-xs text-muted-foreground">Không có tag nào được gợi ý.</div>
              )}
              {suggestedTags.map((tag) => {
                const isAdded = tags.includes(tag.toLowerCase());
                return (
                  <Badge
                    key={tag}
                    variant={isAdded ? "default" : "outline"}
                    className="cursor-pointer gap-1 text-xs py-1 px-2.5 transition-all"
                    onClick={() => handleApplySuggestedTag(tag)}
                  >
                    {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    #{tag}
                  </Badge>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setSuggestTagsOpen(false)}>
              Xong
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
