import React, { useState } from "react";
import {
  LayoutDashboard,
  Youtube,
  FolderSearch,
  ListVideo,
  History,
  Settings,
  LogOut,
  PlusCircle,
  Menu,
  X,
} from "lucide-react";
import useUser from "@/utils/useUser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Google Site Verification
export const metadata = {
  verification: {
    google: "ANB5tncl_LNEEOaUtmr6OmfrNFbuCiEKLTBuigoz3qA",
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const NavItem = ({ href, icon: Icon, label, active }) => (
  <a
    href={href}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active
        ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
        : "text-gray-400 hover:bg-white/5 hover:text-white"
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </a>
);

export default function RootLayout({ children }) {
  const { data: user, loading } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/drive", icon: FolderSearch, label: "Drive Folders" },
    { href: "/queue", icon: ListVideo, label: "Review Queue" },
    { href: "/history", icon: History, label: "Upload History" },
    { href: "/accounts", icon: Youtube, label: "Connected Accounts" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  if (loading)
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-12 w-12 bg-red-600 rounded-xl"></div>
            <div className="h-4 w-32 bg-white/10 rounded"></div>
          </div>
        </div>
      </QueryClientProvider>
    );

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-red-600/30">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Youtube size={18} />
            </div>
            <span className="font-bold text-lg">YT Shorts Auto</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <div className="flex">
          <aside
            className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-[#0d0d0d] border-r border-white/5 transform transition-transform duration-300 lg:translate-x-0 lg:static
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
          >
            <div className="flex flex-col h-full p-6">
              <div className="hidden lg:flex items-center gap-3 mb-10 px-2">
                <div className="h-10 w-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
                  <Youtube size={24} />
                </div>
                <span className="font-bold text-xl tracking-tight">
                  YT Shorts Auto
                </span>
              </div>

              <nav className="flex-1 space-y-1">
                {navItems.map((item) => (
                  <NavItem
                    key={item.href}
                    {...item}
                    active={pathname === item.href}
                  />
                ))}
              </nav>

              <div className="mt-auto pt-6 border-t border-white/5">
                {user ? (
                  <div className="flex items-center gap-3 px-2 mb-6">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 border border-white/10 flex items-center justify-center font-bold">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {user.name || "Creator"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <a
                    href="/account/signin"
                    className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/5 rounded-xl transition-all mb-4"
                  >
                    <PlusCircle size={20} />
                    <span className="font-medium">Sign In</span>
                  </a>
                )}
                <a
                  href="/account/logout"
                  className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Sign Out</span>
                </a>
              </div>
            </div>
          </aside>

          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <main className="flex-1 min-h-screen p-4 lg:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              {children}

              {/* Footer with Privacy & Terms links */}
              <footer className="mt-16 pt-8 border-t border-white/5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                  <p>
                    © {new Date().getFullYear()} YT Shorts Auto. All rights
                    reserved.
                  </p>
                  <div className="flex items-center gap-6">
                    <a
                      href="/privacy"
                      className="hover:text-white transition-colors underline"
                    >
                      Privacy Policy
                    </a>
                    <a
                      href="/terms"
                      className="hover:text-white transition-colors underline"
                    >
                      Terms of Service
                    </a>
                  </div>
                </div>
              </footer>
            </div>
          </main>
        </div>

        <style jsx global>{`
          ::-webkit-scrollbar {
            width: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #0a0a0a;
          }
          ::-webkit-scrollbar-thumb {
            background: #2a2a2a;
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #3a3a3a;
          }
        `}</style>
      </div>
    </QueryClientProvider>
  );
}
