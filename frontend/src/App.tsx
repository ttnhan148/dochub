import React from 'react';

export default function App() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="max-w-md space-y-4 rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-primary">DocHub</h1>
        <p className="text-sm text-muted-foreground">
          Markdown & HTML Knowledge Base & Presentation Tool.
        </p>
        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Frontend đang chạy với <strong>React + Vite + Tailwind CSS + shadcn/ui</strong> và font chữ <strong>Be Vietnam Pro</strong>.
        </div>
      </div>
    </div>
  );
}
