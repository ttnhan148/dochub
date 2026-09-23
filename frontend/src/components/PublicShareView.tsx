import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "@/hooks/useApi";
import { MarkdownPreview } from "./MarkdownPreview";
import { HtmlPreview } from "./HtmlPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Printer, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PublicShareData {
  share_id: string;
  document_id?: string;
  title?: string;
  type?: "markdown" | "html";
  content?: string;
  requires_password: boolean;
  updated_at?: string;
}

export const PublicShareView: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [data, setData] = useState<PublicShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const fetchShareData = async () => {
    if (!shareId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<PublicShareData>(`/api/share/public/${shareId}`);
      setData(res);
    } catch (err: any) {
      if (err.status === 410) {
        setError("Liên kết chia sẻ này đã hết hạn.");
      } else if (err.status === 404) {
        setError("Liên kết chia sẻ không tồn tại hoặc đã bị thu hồi.");
      } else {
        setError(err.message || "Không thể tải tài liệu.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShareData();
  }, [shareId]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setUnlocking(true);
    try {
      await apiRequest(`/api/share/public/${shareId}/unlock`, {
        method: "POST",
        body: JSON.stringify({ password: password.trim() }),
      });
      toast.success("Mở khóa thành công!");
      fetchShareData();
    } catch (err: any) {
      toast.error(err.message || "Mật khẩu không chính xác");
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-sans">
        <div className="text-sm text-muted-foreground animate-pulse">Đang nạp tài liệu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background font-sans p-4">
        <div className="max-w-md w-full text-center space-y-3 p-6 rounded-lg border bg-card shadow-sm">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-lg font-bold">Liên kết không khả dụng</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (data?.requires_password) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background font-sans p-4">
        <div className="max-w-sm w-full space-y-4 p-6 rounded-xl border bg-card shadow-lg text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Tài liệu được bảo vệ</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Vui lòng nhập mật khẩu được cung cấp để xem nội dung tài liệu.
            </p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-3">
            <Input
              type="password"
              placeholder="Nhập mật khẩu truy cập..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full text-xs" disabled={unlocking}>
              {unlocking ? "Đang xác thực..." : "Mở khóa tài liệu"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
      {/* Top Header cho người xem read-only (ẩn khi in ra giấy/PDF) */}
      <header className="border-b px-6 py-3 flex items-center justify-between bg-card/80 backdrop-blur sticky top-0 z-10 print:hidden">
        <div>
          <h1 className="text-base font-bold truncate max-w-md sm:max-w-xl">{data?.title}</h1>
          {data?.updated_at && (
            <div className="text-[11px] text-muted-foreground">
              Cập nhật lần cuối: {data.updated_at}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5" /> In / Lưu PDF
          </Button>
        </div>
      </header>

      {/* Vùng hiển thị tài liệu */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8">
        {data?.type === "markdown" ? (
          <MarkdownPreview content={data.content || ""} />
        ) : (
          <div className="w-full min-h-[80vh] border rounded-lg overflow-hidden shadow-sm">
            <HtmlPreview content={data?.content || ""} />
          </div>
        )}
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground print:hidden">
        Trình bày bởi <strong>DocHub</strong>
      </footer>
    </div>
  );
};
