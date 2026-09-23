import React, { useState } from "react";
import {
  Folder as FolderIcon,
  FolderPlus,
  FileText,
  FileCode,
  Plus,
  Upload,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Tag as TagIcon,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiRequest } from "@/hooks/useApi";

export interface FolderItem {
  id: string;
  name: string;
  parent_id?: string;
  created_at?: string;
}

export interface TagItem {
  id: string;
  name: string;
  doc_count: number;
}

export interface DocumentSummary {
  id: string;
  title: string;
  type: "markdown" | "html";
  folder_id?: string;
  created_at: string;
  updated_at: string;
  tags: { id: string; name: string }[];
}

interface SidebarProps {
  folders: FolderItem[];
  tags: TagItem[];
  documents: DocumentSummary[];
  selectedDocId: string | null;
  selectedFolderId: string | null;
  selectedTagId: string | null;
  onSelectDocument: (docId: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onSelectTag: (tagId: string | null) => void;
  onCreateDocument: (type: "markdown" | "html", folderId?: string) => void;
  onImportFile: (file: File) => void;
  onRefreshData: () => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  tags,
  documents,
  selectedDocId,
  selectedFolderId,
  selectedTagId,
  onSelectDocument,
  onSelectFolder,
  onSelectTag,
  onCreateDocument,
  onImportFile,
  onRefreshData,
  onOpenSettings,
  onOpenSearch,
  onLogout,
}) => {
  const [folderOpenMap, setFolderOpenMap] = useState<Record<string, boolean>>({});
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderOpenMap((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await apiRequest("/api/folders", {
        method: "POST",
        body: JSON.stringify({
          name: newFolderName.trim(),
          parent_id: createFolderParentId,
        }),
      });
      toast.success("Đã tạo thư mục mới!");
      setNewFolderName("");
      setCreateFolderOpen(false);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Bạn có chắc muốn xóa thư mục này không?")) return;
    try {
      await apiRequest(`/api/folders/${folderId}`, { method: "DELETE" });
      toast.success("Đã xóa thư mục");
      if (selectedFolderId === folderId) onSelectFolder(null);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-64 h-full bg-card border-r flex flex-col font-sans select-none shrink-0">
      {/* Header thương hiệu DocHub */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
            D
          </div>
          <div>
            <div className="font-bold text-sm leading-none tracking-tight">DocHub</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Knowledge Base & Live Docs</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onOpenSearch}
          title="Tìm kiếm (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Nút tác vụ nhanh: Tạo mới & Import */}
      <div className="p-3 space-y-2 border-b bg-muted/10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="w-full justify-start gap-2 shadow-sm text-xs font-semibold">
              <Plus className="w-4 h-4" /> Tạo tài liệu mới
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-xs"
              onClick={() => onCreateDocument("markdown", selectedFolderId || undefined)}
            >
              <FileText className="w-4 h-4 text-primary" /> Markdown Document
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-xs"
              onClick={() => onCreateDocument("html", selectedFolderId || undefined)}
            >
              <FileCode className="w-4 h-4 text-amber-500" /> HTML Document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <label className="flex items-center justify-center w-full px-3 py-1.5 border border-dashed rounded-md text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Import file .md / .html
          <input
            type="file"
            accept=".md,.html,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Danh mục Cây thư mục & Documents */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs">
        {/* Nhóm Thư mục */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Thư mục</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setCreateFolderParentId(null);
                setCreateFolderOpen(true);
              }}
              title="Tạo thư mục gốc mới"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div
            onClick={() => {
              onSelectFolder(null);
              onSelectTag(null);
            }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
              selectedFolderId === null && selectedTagId === null
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <FolderIcon className="w-4 h-4 text-primary" />
            <span>Tất cả tài liệu</span>
          </div>

          {/* Danh sách folder */}
          {folders
            .filter((f) => !f.parent_id)
            .map((f) => {
              const isOpen = folderOpenMap[f.id] ?? false;
              const isSelected = selectedFolderId === f.id;
              return (
                <div key={f.id} className="space-y-0.5">
                  <div
                    onClick={() => {
                      onSelectFolder(f.id);
                      onSelectTag(null);
                    }}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <button
                        onClick={(e) => toggleFolder(f.id, e)}
                        className="p-0.5 hover:bg-muted-foreground/10 rounded"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <FolderIcon className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted-foreground/10 rounded">
                          <Edit2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setCreateFolderParentId(f.id);
                            setCreateFolderOpen(true);
                          }}
                        >
                          <FolderPlus className="w-3.5 h-3.5 mr-2" /> Thêm thư mục con
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteFolder(f.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Xóa thư mục
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Hiển thị thư mục con nếu đang mở */}
                  {isOpen && (
                    <div className="pl-4 space-y-0.5 border-l ml-3">
                      {folders
                        .filter((sub) => sub.parent_id === f.id)
                        .map((sub) => (
                          <div
                            key={sub.id}
                            onClick={() => {
                              onSelectFolder(sub.id);
                              onSelectTag(null);
                            }}
                            className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer ${
                              selectedFolderId === sub.id
                                ? "bg-accent text-accent-foreground font-medium"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="truncate">{sub.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFolder(sub.id);
                              }}
                              className="text-muted-foreground hover:text-destructive p-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Nhóm Tags */}
        <div>
          <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Nhãn (Tags)
          </div>
          <div className="flex flex-wrap gap-1 px-1 mt-1">
            {tags.map((t) => {
              const isSelected = selectedTagId === t.id;
              return (
                <Badge
                  key={t.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => onSelectTag(isSelected ? null : t.id)}
                  className="cursor-pointer text-[10px] px-1.5 py-0.5 font-normal gap-1 transition-colors"
                >
                  <TagIcon className="w-2.5 h-2.5" />
                  {t.name}
                  <span className="opacity-60 text-[9px]">({t.doc_count})</span>
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Danh sách tài liệu thuộc bộ lọc hiện tại */}
        <div>
          <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Danh sách tài liệu ({documents.length})
          </div>
          <div className="space-y-0.5 mt-1">
            {documents.length === 0 && (
              <div className="text-muted-foreground text-[11px] px-2 py-2">Chưa có tài liệu nào.</div>
            )}
            {documents.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument(doc.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {doc.type === "markdown" ? (
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
                  ) : (
                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary-foreground" : "text-amber-500"}`} />
                  )}
                  <span className="truncate">{doc.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Settings & Logout */}
      <div className="p-2 border-t flex items-center justify-between bg-muted/20 text-xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="gap-1.5 text-muted-foreground hover:text-foreground text-xs h-8"
        >
          <SettingsIcon className="w-3.5 h-3.5" /> Cài đặt
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="gap-1.5 text-muted-foreground hover:text-destructive text-xs h-8"
        >
          <LogOut className="w-3.5 h-3.5" /> Thoát
        </Button>
      </div>

      {/* Modal tạo folder */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="max-w-sm font-sans">
          <DialogHeader>
            <DialogTitle>Tạo thư mục mới</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Tên thư mục..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(false)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleCreateFolder}>
              Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
