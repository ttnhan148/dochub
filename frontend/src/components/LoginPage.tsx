import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      toast.success("Đăng nhập thành công!");
    } catch (err: any) {
      toast.error(err.message || "Tên đăng nhập hoặc mật khẩu không đúng");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 font-sans">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-2xl border bg-card shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto shadow-md font-bold text-xl">
            D
          </div>
          <h1 className="text-2xl font-bold tracking-tight">DocHub</h1>
          <p className="text-xs text-muted-foreground">
            Đăng nhập để quản lý và soạn thảo tài liệu kiến thức
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Tên người dùng</label>
            <Input
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Mật khẩu</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full font-semibold gap-2" disabled={submitting}>
            {submitting ? "Đang xác thực..." : "Đăng nhập"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="text-center text-[11px] text-muted-foreground">
          DocHub Single-User Knowledge Base &bull; Local Storage &bull; SQLite FTS5
        </div>
      </div>
    </div>
  );
};
