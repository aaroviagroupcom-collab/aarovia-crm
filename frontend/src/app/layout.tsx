import type { Metadata } from "next";
import "./globals.css";
import { ReactQueryProvider } from "@/providers/QueryProvider";
import MetaPixel from "@/components/MetaPixel";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Aarovia Properties CRM",
  description: "Enterprise Real Estate CRM by Aarovia Properties",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
      </head>
      <body>
        <ReactQueryProvider>
          <MetaPixel />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: "#1a1a2e", color: "#fff", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" },
              success: { iconTheme: { primary: "#FFD700", secondary: "#1a1a2e" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
        </ReactQueryProvider>
      </body>
    </html>
  );
}


