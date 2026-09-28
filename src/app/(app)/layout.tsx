import AppShellLoader from "@/components/app/AppShellLoader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShellLoader>{children}</AppShellLoader>;
}
