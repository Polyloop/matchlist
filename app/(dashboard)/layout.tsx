import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { CommandPalette } from "@/components/command-palette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <OrganizationSwitcher />
          </div>
          <UserButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
