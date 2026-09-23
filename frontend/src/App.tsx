import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Dashboard } from "@/components/Dashboard";
import { LoginPage } from "@/components/LoginPage";
import { PublicShareView } from "@/components/PublicShareView";
import { Toaster } from "@/components/ui/sonner";

const AuthenticatedArea: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background font-sans">
        <div className="text-sm text-muted-foreground animate-pulse">Đang tải DocHub...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Dashboard />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Trang xem công khai Read-only cho khách hàng qua link chia sẻ */}
          <Route path="/s/:shareId" element={<PublicShareView />} />

          {/* Vùng quản trị và soạn thảo chính (yêu cầu đăng nhập) */}
          <Route path="/" element={<AuthenticatedArea />} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
