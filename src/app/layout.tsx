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
import { CompanyProvider } from "@/contexts/company-context";
import { getUserCompaniesServer, getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server";
import type { Company } from "@/types/company";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  let docsRole = "ugyintezo";
  let hrRole = "munkavallalo";
  let elerhetoModulok: string[] = [];
  let companies: Company[] = [];
  let activeCompanyId: string | null = null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      companies = await getUserCompaniesServer();
      activeCompanyId = await getActiveCompanyIdServer();

      // Scoped (aktív cégre vonatkozó) szerepkörök feloldása (GDPR / béradat védelem)
      const scopedRoles = await getActiveCompanyMemberRolesServer(activeCompanyId);
      docsRole = scopedRoles.docsRole;
      hrRole = scopedRoles.hrRole;

      const { data: profile } = await supabase
        .from("felhasznalo_profil")
        .select("elerheto_modulok")
        .eq("id", user.id)
        .single();
      if (profile?.elerheto_modulok) {
        elerhetoModulok = profile.elerheto_modulok;
      }
    }
  } catch (e) {
    console.error("Error fetching user data in layout:", e);
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
            <CompanyProvider initialCompanies={companies} initialCompanyId={activeCompanyId}>
              <LayoutWrapper docsRole={docsRole} hrRole={hrRole} elerhetoModulok={elerhetoModulok}>
                {children}
              </LayoutWrapper>
            </CompanyProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
