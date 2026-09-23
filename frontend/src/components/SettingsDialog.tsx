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
import { apiRequest } from "@/hooks/useApi";
import { toast } from "sonner";
import { Settings, Sparkles, CloudUpload, ShieldCheck } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const data = await apiRequest<{
        api_base_url: string;
        api_key_masked: string;
        model_name: string;
      }>("/api/settings/ai");
      setApiBaseUrl(data.api_base_url || "");
      setApiKey(data.api_key_masked || "");
      setModelName(data.model_name || "");
    } catch (err: any) {
      toast.error(`Không thể nạp cài đặt: ${err.message}`);
    }
  };

  const handleTest = async () => {
    if (!apiBaseUrl || !modelName) {
      toast.error("Vui lòng điền đủ API Base URL và Tên Model");
      return;
    }
    setTesting(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>("/api/settings/ai/test", {
        method: "POST",
        body: JSON.stringify({
          api_base_url: apiBaseUrl,
          api_key: apiKey,
          model_name: modelName,
        }),
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(`Kiểm tra kết nối thất bại: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await apiRequest("/api/settings/ai", {
        method: "PUT",
        body: JSON.stringify({
          api_base_url: apiBaseUrl,
          api_key: apiKey,
          model_name: modelName,
        }),
      });
      setApiKey(data.api_key_masked);
      toast.success("Đã lưu cấu hình AI thành công!");
    } catch (err: any) {
      toast.error(`Lỗi lưu cài đặt: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBackupNow = async () => {
    setBackingUp(true);
    try {
      const res = await apiRequest<{ message: string }>("/api/settings/backup/trigger", {
        method: "POST",
      });
      toast.success(res.message);
    } catch (err: any) {
      toast.error(`Lỗi kích hoạt sao lưu: ${err.message}`);
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl font-sans">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> Cài đặt hệ thống (DocHub Settings)
          </DialogTitle>
          <DialogDescription>
            Cấu hình mô hình AI theo cơ chế BYOK (Azure AI Foundry / OpenAI-compatible) và sao lưu dữ liệu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nhóm cấu hình AI BYOK */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="w-4 h-4" /> Cấu hình Azure AI Foundry (BYOK)
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">API Base URL (Endpoint):</label>
              <Input
                placeholder="https://your-resource.openai.azure.com/openai/deployments/..."
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">API Key:</label>
              <Input
                type="password"
                placeholder="Nhập API Key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Model / Deployment Name:</label>
              <Input
                placeholder="gpt-4o, gpt-4o-mini, v.v."
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing}
                className="gap-1 text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {testing ? "Đang kiểm tra..." : "Test connection"}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
                {saving ? "Đang lưu..." : "Lưu cấu hình"}
              </Button>
            </div>
          </div>

          {/* Nhóm Backup */}
          <div className="border rounded-lg p-4 space-y-2 bg-muted/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CloudUpload className="w-4 h-4" /> Sao lưu dự phòng (Backup)
            </div>
            <p className="text-xs text-muted-foreground">
              Hệ thống tự động sao lưu toàn bộ cơ sở dữ liệu SQLite và tệp tin cục bộ hàng ngày. Bạn có thể nhấn
              nút bên dưới để tạo bản sao lưu ngay lập tức và đẩy lên Azure Blob Storage.
            </p>
            <div className="pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBackupNow}
                disabled={backingUp}
                className="gap-1.5 text-xs"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                {backingUp ? "Đang xử lý sao lưu..." : "Backup now (Sao lưu ngay)"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
