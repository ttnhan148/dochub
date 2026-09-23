import React, { useState, useEffect } from "react";
import { Sidebar, FolderItem, TagItem, DocumentSummary } from "./Sidebar";
import { EditorSplitView, FullDocument } from "./EditorSplitView";
import { CommandPalette } from "./CommandPalette";
import { SettingsDialog } from "./SettingsDialog";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/hooks/useApi";
import { toast } from "sonner";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Dashboard: React.FC = () => {
  const { logout } = useAuth();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [currentDocument, setCurrentDocument] = useState<FullDocument | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Global Dialogs
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Tải dữ liệu folders, tags và documents
  const loadSidebarData = async () => {
    try {
      const [foldersData, tagsData] = await Promise.all([
        apiRequest<FolderItem[]>("/api/folders"),
        apiRequest<TagItem[]>("/api/tags"),
      ]);
      setFolders(foldersData);
      setTags(tagsData);
    } catch (err: any) {
      toast.error(`Lỗi tải dữ liệu: ${err.message}`);
    }
  };

  const loadDocuments = async () => {
    try {
      let endpoint = "/api/documents";
      const params: string[] = [];
      if (selectedFolderId) {
        params.push(`folder_id=${selectedFolderId}`);
      }
      if (selectedTagId) {
        params.push(`tag_id=${selectedTagId}`);
      }
      if (params.length > 0) {
        endpoint += `?${params.join("&")}`;
      }

      const docs = await apiRequest<DocumentSummary[]>(endpoint);
      setDocuments(docs);

      // Nếu chưa chọn doc hoặc doc đã chọn không nằm trong danh sách
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err: any) {
      toast.error(`Lỗi tải danh sách tài liệu: ${err.message}`);
    }
  };

  useEffect(() => {
    loadSidebarData();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [selectedFolderId, selectedTagId]);

  // Tải nội dung chi tiết của document được chọn
  useEffect(() => {
    if (!selectedDocId) {
      setCurrentDocument(null);
      return;
    }

    setLoadingDoc(true);
    apiRequest<FullDocument>(`/api/documents/${selectedDocId}`)
      .then((doc) => {
        setCurrentDocument(doc);
      })
      .catch((err) => {
        toast.error(`Lỗi nạp tài liệu: ${err.message}`);
        setSelectedDocId(null);
        setCurrentDocument(null);
      })
      .finally(() => setLoadingDoc(false));
  }, [selectedDocId]);

  // Tạo tài liệu mới
  const handleCreateDocument = async (type: "markdown" | "html", folderId?: string) => {
    try {
      const newDoc = await apiRequest<FullDocument>("/api/documents", {
        method: "POST",
        body: JSON.stringify({
          title: type === "markdown" ? "Tài liệu mới" : "Trang HTML mới",
          type: type,
          folder_id: folderId || null,
          content:
            type === "markdown"
              ? "# Tài liệu mới\n\nBắt đầu soạn thảo nội dung tại đây..."
              : "<h1>Trang HTML mới</h1>\n<p>Bắt đầu nhập mã HTML tại đây...</p>",
          tags: [],
        }),
      });
      toast.success("Đã tạo tài liệu mới!");
      await loadSidebarData();
      await loadDocuments();
      setSelectedDocId(newDoc.id);
    } catch (err: any) {
      toast.error(`Lỗi tạo tài liệu: ${err.message}`);
    }
  };

  // Import file có sẵn (.md / .html)
  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase();
      const docType = ext === "html" || ext === "htm" ? "html" : "markdown";
      const title = file.name.replace(/\.[^/.]+$/, "");

      const newDoc = await apiRequest<FullDocument>("/api/documents", {
        method: "POST",
        body: JSON.stringify({
          title: title,
          type: docType,
          folder_id: selectedFolderId,
          content: text,
          tags: ["imported"],
        }),
      });
      toast.success(`Đã import thành công: ${file.name}`);
      await loadSidebarData();
      await loadDocuments();
      setSelectedDocId(newDoc.id);
    } catch (err: any) {
      toast.error(`Lỗi import: ${err.message}`);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans">
      {/* Sidebar điều hướng */}
      <Sidebar
        folders={folders}
        tags={tags}
        documents={documents}
        selectedDocId={selectedDocId}
        selectedFolderId={selectedFolderId}
        selectedTagId={selectedTagId}
        onSelectDocument={(id) => setSelectedDocId(id)}
        onSelectFolder={(id) => setSelectedFolderId(id)}
        onSelectTag={(id) => setSelectedTagId(id)}
        onCreateDocument={handleCreateDocument}
        onImportFile={handleImportFile}
        onRefreshData={() => {
          loadSidebarData();
          loadDocuments();
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onLogout={logout}
      />

      {/* Vùng Main Workspace */}
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        {loadingDoc ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
            Đang mở tài liệu...
          </div>
        ) : currentDocument ? (
          <EditorSplitView
            key={currentDocument.id}
            document={currentDocument}
            onDocumentUpdated={(updated) => {
              setCurrentDocument(updated);
              loadDocuments();
              loadSidebarData();
            }}
            onDocumentDeleted={() => {
              setSelectedDocId(null);
              setCurrentDocument(null);
              loadDocuments();
              loadSidebarData();
            }}
            onDocumentCreated={(newDocId) => {
              loadDocuments();
              loadSidebarData();
              setSelectedDocId(newDocId);
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="font-semibold text-foreground text-lg mb-1">Chưa chọn tài liệu nào</h3>
            <p className="text-xs max-w-sm mb-4">
              Chọn một tài liệu từ danh sách bên trái hoặc tạo tài liệu mới để bắt đầu làm việc.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleCreateDocument("markdown", selectedFolderId || undefined)}>
                <Plus className="w-4 h-4 mr-1.5" /> Tạo Markdown
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCreateDocument("html", selectedFolderId || undefined)}>
                <Plus className="w-4 h-4 mr-1.5" /> Tạo HTML
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectDocument={(docId) => setSelectedDocId(docId)}
      />

      {/* Global Settings Modal */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
};
