import React, { useState, useEffect } from "react";
import * as diff from "diff";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/hooks/useApi";
import { toast } from "sonner";
import { History, RotateCcw, GitCompare } from "lucide-react";

interface VersionItem {
  id: string;
  document_id: string;
  file_path: string;
  created_at: string;
  note?: string;
}

interface VersionHistoryModalProps {
  documentId: string;
  currentContent: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  documentId,
  currentContent,
  open,
  onOpenChange,
  onRestored,
}) => {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionItem | null>(null);
  const [versionContent, setVersionContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (open && documentId) {
      loadVersions();
    } else {
      setSelectedVersion(null);
      setVersionContent("");
    }
  }, [open, documentId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<VersionItem[]>(`/api/documents/${documentId}/versions`);
      setVersions(data);
      if (data.length > 0) {
        selectVersion(data[0]);
      }
    } catch (err: any) {
      toast.error(`Không thể tải lịch sử phiên bản: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectVersion = async (version: VersionItem) => {
    setSelectedVersion(version);
    setLoadingContent(true);
    try {
      const data = await apiRequest<{ version_id: string; content: string }>(
        `/api/documents/${documentId}/versions/${version.id}`
      );
      setVersionContent(data.content);
    } catch (err: any) {
      toast.error(`Không thể đọc nội dung snapshot: ${err.message}`);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm("Bạn có chắc chắn muốn khôi phục nội dung từ phiên bản này không?")) return;
    setRestoring(true);
    try {
      await apiRequest(`/api/documents/${documentId}/versions/${versionId}/restore`, {
        method: "POST",
      });
      toast.success("Đã khôi phục phiên bản thành công!");
      onRestored();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Lỗi khôi phục: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  // Tính toán diff giữa version snapshot và nội dung hiện tại
  const diffParts = selectedVersion
    ? diff.diffLines(versionContent, currentContent)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-6 font-sans">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Lịch sử phiên bản (Version History)
          </DialogTitle>
          <DialogDescription>
            Xem lại các bản snapshot đã lưu và so sánh thay đổi với nội dung hiện tại.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden mt-2">
          {/* Cột trái: Danh sách các version */}
          <div className="border rounded-md p-2 overflow-y-auto space-y-1.5 bg-muted/20">
            <div className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">
              Các bản lưu ({versions.length})
            </div>
            {loading && <div className="text-xs text-muted-foreground p-2">Đang tải...</div>}
            {versions.map((v, idx) => {
              const isSelected = selectedVersion?.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => selectVersion(v)}
                  className={`p-2.5 rounded-md text-xs cursor-pointer transition-colors border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-accent border-border"
                  }`}
                >
                  <div className="flex items-center justify-between font-medium">
                    <span>{idx === 0 ? "Bản gần nhất" : `Bản #${versions.length - idx}`}</span>
                    <span className="text-[10px] opacity-80">{v.created_at.split(" ")[1]}</span>
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5 truncate">
                    {v.note || "Snapshot tự động"}
                  </div>
                  <div className="text-[10px] opacity-70 mt-1">{v.created_at.split(" ")[0]}</div>
                </div>
              );
            })}
          </div>

          {/* Cột phải: Xem Diff hoặc nội dung */}
          <div className="md:col-span-2 border rounded-md flex flex-col overflow-hidden bg-card">
            {selectedVersion && (
              <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <GitCompare className="w-3.5 h-3.5 text-primary" /> So sánh với hiện tại
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Bản lưu lúc: {selectedVersion.created_at} ({selectedVersion.note || "Không có ghi chú"})
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  onClick={() => handleRestore(selectedVersion.id)}
                  disabled={restoring || loadingContent}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Khôi phục bản này
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-5">
              {loadingContent ? (
                <div className="text-muted-foreground text-center py-10">Đang nạp dữ liệu...</div>
              ) : selectedVersion ? (
                <div>
                  <div className="mb-3 text-[11px] text-muted-foreground flex gap-4 font-sans border-b pb-2">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="inline-block w-2.5 h-2.5 bg-emerald-200 border border-emerald-500 rounded-sm"></span>
                      + Thêm mới trong bản hiện tại
                    </span>
                    <span className="flex items-center gap-1 text-rose-600">
                      <span className="inline-block w-2.5 h-2.5 bg-rose-200 border border-rose-500 rounded-sm"></span>
                      - Có trong bản snapshot nhưng đã xóa ở hiện tại
                    </span>
                  </div>
                  {diffParts.map((part, index) => {
                    const colorClass = part.added
                      ? "bg-emerald-100/70 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : part.removed
                      ? "bg-rose-100/70 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                      : "text-foreground opacity-80";
                    return (
                      <div key={index} className={`${colorClass} px-1.5 whitespace-pre-wrap`}>
                        {part.value}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-10">Chọn một phiên bản bên trái để xem.</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
