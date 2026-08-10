import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Toaster } from "@/components/ui/sonner";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "eaisyDocs - Iratkezelő",
  description: "Elektronikus iratkezelő rendszer",
};

import { createClient } from "@/utils/supabase/server";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  let docsRole = "ugyintezo";
  let hrRole = "munkavallalo";

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("felhasznalo_profil")
        .select("docs_szerepkor, hr_szerepkor")
        .eq("id", user.id)
        .single();
      if (profile?.docs_szerepkor) {
        docsRole = profile.docs_szerepkor;
      }
      if (profile?.hr_szerepkor) {
        hrRole = profile.hr_szerepkor;
      }
    }
  } catch (e) {
    console.error("Error fetching user role in layout:", e);
  }

  return (
    <html
      lang="hu"
      suppressHydrationWarning
      className={`${montserrat.variable} font-sans h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <LayoutWrapper docsRole={docsRole} hrRole={hrRole}>
              {children}
            </LayoutWrapper>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
