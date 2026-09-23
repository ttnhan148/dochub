import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/hooks/useApi";
import { toast } from "sonner";
import { Copy, Trash2, Ban, Lock } from "lucide-react";

interface ShareItem {
  id: string;
  document_id: string;
  has_password: boolean;
  expires_at?: string;
  created_at: string;
  revoked: boolean;
  share_url: string;
}

interface ShareDialogProps {
  documentId: string;
  documentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  documentId,
  documentTitle,
  open,
  onOpenChange,
}) => {
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchShares = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const data = await apiRequest<ShareItem[]>(`/api/share/document/${documentId}`);
      setShares(data);
    } catch (err: any) {
      toast.error(`Không thể tải liên kết chia sẻ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchShares();
      setPassword("");
      setExpiresAt("");
    }
  }, [open, documentId]);

  const handleCreateShare = async () => {
    setCreating(true);
    try {
      await apiRequest("/api/share", {
        method: "POST",
        body: JSON.stringify({
          document_id: documentId,
          password: password.trim() || null,
          expires_at: expiresAt ? expiresAt.replace("T", " ") + ":00" : null,
        }),
      });
      toast.success("Đã tạo liên kết chia sẻ mới!");
      setPassword("");
      setExpiresAt("");
      fetchShares();
    } catch (err: any) {
      toast.error(`Lỗi tạo chia sẻ: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      await apiRequest(`/api/share/${shareId}/revoke`, { method: "POST" });
      toast.success("Đã thu hồi liên kết chia sẻ!");
      fetchShares();
    } catch (err: any) {
      toast.error(`Lỗi thu hồi: ${err.message}`);
    }
  };

  const handleDelete = async (shareId: string) => {
    try {
      await apiRequest(`/api/share/${shareId}`, { method: "DELETE" });
      toast.success("Đã xóa liên kết chia sẻ!");
      fetchShares();
    } catch (err: any) {
      toast.error(`Lỗi xóa: ${err.message}`);
    }
  };

  const handleCopy = (shareUrl: string) => {
    const fullUrl = `${window.location.origin}${shareUrl}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Đã sao chép liên kết vào bộ nhớ tạm!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl font-sans">
        <DialogHeader>
          <DialogTitle>Chia sẻ tài liệu</DialogTitle>
          <DialogDescription>
            Tạo liên kết xem công khai (Read-only) cho khách hàng: <strong>{documentTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Form tạo mới */}
        <div className="bg-muted/40 p-4 rounded-lg border space-y-3">
          <div className="text-sm font-medium">Tùy chọn tạo liên kết mới</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Mật khẩu bảo vệ (Tùy chọn):</label>
              <Input
                type="password"
                placeholder="Để trống nếu công khai..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Ngày hết hạn (Tùy chọn):</label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleCreateShare} disabled={creating} size="sm" className="w-full mt-2">
            {creating ? "Đang tạo..." : "Tạo liên kết chia sẻ"}
          </Button>
        </div>

        {/* Danh sách link hiện có */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Các liên kết đã tạo ({shares.length})
          </div>
          {loading && <div className="text-xs text-muted-foreground py-2">Đang tải danh sách...</div>}
          {!loading && shares.length === 0 && (
            <div className="text-xs text-muted-foreground py-4 text-center">Chưa có liên kết nào.</div>
          )}
          {shares.map((share) => (
            <div
              key={share.id}
              className="flex items-center justify-between p-3 rounded-md border bg-card text-xs"
            >
              <div className="space-y-1 overflow-hidden pr-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-primary font-medium truncate">
                    {window.location.origin}{share.share_url}
                  </span>
                  {share.has_password && (
                    <Badge variant="outline" className="flex items-center gap-1 text-[10px]">
                      <Lock className="w-2.5 h-2.5" /> Có mật khẩu
                    </Badge>
                  )}
                  {share.revoked ? (
                    <Badge variant="destructive" className="text-[10px]">Đã thu hồi</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Đang hoạt động</Badge>
                  )}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Tạo ngày: {share.created_at} {share.expires_at ? `| Hết hạn: ${share.expires_at}` : ""}
                </div>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                {!share.revoked && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopy(share.share_url)}
                    title="Sao chép liên kết"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
                {!share.revoked && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-amber-600 hover:text-amber-700"
                    onClick={() => handleRevoke(share.id)}
                    title="Thu hồi liên kết"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(share.id)}
                  title="Xóa vĩnh viễn"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
