import React from "react";
import {
  Youtube,
  FolderSearch,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  XCircle,
  LogIn,
  Instagram,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useUser from "@/utils/useUser";

// Instagram icon (lucide doesn't have it, use inline SVG)
const InstagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={props.size || 24} height={props.size || 24} className={props.className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const AccountCard = ({
  provider,
  icon: Icon,
  label,
  status,
  onConnect,
  onDisconnect,
  isDisconnecting,
  scope,
}) => (
  <div
    className={`bg-[#1a1a1a] p-8 rounded-3xl border transition-all ${
      status === "connected" ? "border-green-500/20" : "border-white/5"
    }`}
  >
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div
          className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
            status === "connected"
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          }`}
        >
          <Icon size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold">{label}</h3>
          <p className="text-xs text-gray-500">{scope}</p>
        </div>
      </div>
      {status === "connected" ? (
        <CheckCircle2 size={24} className="text-green-500" />
      ) : (
        <XCircle size={24} className="text-gray-600" />
      )}
    </div>

    <p className="text-gray-400 text-sm mb-6">
      {status === "connected"
        ? `Your ${label} account is securely connected and ready to use.`
        : `Connect your ${label} account to enable ${label === "Google Drive" ? "folder scanning" : "video uploads"}.`}
    </p>

    {status === "connected" ? (
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 text-green-500 bg-green-500/5 py-3 px-4 rounded-xl border border-green-500/10">
          <CheckCircle2 size={18} />
          <span className="font-semibold text-sm">Active Connection</span>
        </div>
        <button
          onClick={onDisconnect}
          disabled={isDisconnecting}
          className="px-4 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
        >
          <XCircle size={16} />
          {isDisconnecting ? "..." : "Disconnect"}
        </button>
      </div>
    ) : (
      <button
        onClick={onConnect}
        className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        Connect {label}
        <ExternalLink size={16} />
      </button>
    )}
  </div>
);

export default function AccountsPage() {
  const { data: user, loading: userLoading } = useUser();

  const {
    data: accounts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["connected-accounts"],
    queryFn: async () => {
      const [googleRes, igRes] = await Promise.all([
        fetch("/api/google/status"),
        fetch("/api/instagram/status"),
      ]);
      const google = googleRes.ok ? await googleRes.json() : {};
      const instagram = igRes.ok ? await igRes.json() : {};
      return { ...google, instagram: instagram.connected, instagramUsername: instagram.username, instagramImage: instagram.image };
    },
    enabled: !!user,
    retry: false,
  });

  const handleConnect = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      "/api/google",
      "google-oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
    const checkPopup = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          queryClient.invalidateQueries(["connected-accounts"]);
        }
      } catch (e) {
        // Cross-origin - popup still on Google's domain
      }
    }, 500);
  };

  const handleConnectInstagram = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      "/api/instagram",
      "instagram-oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
    const checkPopup = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          queryClient.invalidateQueries(["connected-accounts"]);
        }
      } catch (e) {}
    }, 500);
  };

  const queryClient = useQueryClient();
  const disconnectMutation = useMutation({
    mutationFn: async (provider) => {
      const res = await fetch("/api/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Account disconnected");
      queryClient.invalidateQueries(["connected-accounts"]);
    },
    onError: () => toast.error("Failed to disconnect"),
  });

  const disconnectInstagramMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/instagram/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect Instagram");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Instagram disconnected");
      queryClient.invalidateQueries(["connected-accounts"]);
    },
    onError: () => toast.error("Failed to disconnect Instagram"),
  });

  // Show login prompt if not authenticated
  if (userLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-red-600 rounded-xl"></div>
          <div className="h-4 w-32 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-[#1a1a1a] rounded-3xl border border-white/5 p-12 max-w-md text-center">
          <div className="h-16 w-16 bg-red-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LogIn size={32} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Sign In Required</h2>
          <p className="text-gray-400 mb-8">
            You need to sign in or create an account before connecting your
            Google Drive and YouTube.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/account/signin"
              className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-all"
            >
              Sign In
            </a>
            <a
              href="/account/signup"
              className="bg-[#2a2a2a] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#333] transition-all border border-white/10"
            >
              Create Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  const driveStatus = accounts?.drive ? "connected" : "disconnected";
  const youtubeStatus = accounts?.youtube ? "connected" : "disconnected";
  const isFullyConnected = accounts?.drive && accounts?.youtube;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Connected Accounts</h1>
          <p className="text-gray-400 mt-1">
            Manage your Google Drive and YouTube connections securely.
          </p>
        </div>
        {isFullyConnected && (
          <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/10">
            <CheckCircle2 size={20} />
            <span className="font-bold text-sm">Fully Connected</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-[#1a1a1a] h-64 rounded-3xl border border-white/5 animate-pulse"
            ></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AccountCard
            provider="google_drive"
            label="Google Drive"
            scope="drive.readonly"
            icon={FolderSearch}
            status={driveStatus}
            onConnect={handleConnect}
            onDisconnect={() => disconnectMutation.mutate("google_drive")}
            isDisconnecting={disconnectMutation.isPending}
          />
          <AccountCard
            provider="youtube"
            label="YouTube"
            scope="youtube.upload"
            icon={Youtube}
            status={youtubeStatus}
            onConnect={handleConnect}
            onDisconnect={() => disconnectMutation.mutate("youtube")}
            isDisconnecting={disconnectMutation.isPending}
          />
          <AccountCard
            provider="instagram"
            label="Instagram"
            scope="instagram_content_publish"
            icon={InstagramIcon}
            status={accounts?.instagram ? "connected" : "disconnected"}
            onConnect={handleConnectInstagram}
            onDisconnect={() => disconnectInstagramMutation.mutate()}
            isDisconnecting={disconnectInstagramMutation.isPending}
          />
        </div>
      )}

      <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-2xl flex gap-4">
        <AlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-bold text-blue-500 mb-1">
            Secure OAuth 2.0 Connection
          </h4>
          <p className="text-sm text-gray-400 leading-relaxed">
            We use Google's official OAuth 2.0 protocol. Your credentials are
            never stored on our servers. Access tokens are encrypted and
            automatically refreshed. You can revoke access anytime from your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-400 underline"
            >
              Google Account settings
            </a>
            .
          </p>
        </div>
      </div>

      {isFullyConnected && (
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-8">
          <h3 className="font-bold text-xl mb-6 text-center">
            ✨ You're All Set!
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="h-12 w-12 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FolderSearch size={24} className="text-green-500" />
              </div>
              <h4 className="font-bold mb-1">Scan Drive Folders</h4>
              <p className="text-xs text-gray-500">
                Automatically detect videos
              </p>
            </div>
            <div>
              <div className="h-12 w-12 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg
                  className="h-6 w-6 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h4 className="font-bold mb-1">AI Metadata</h4>
              <p className="text-xs text-gray-500">Generate optimized titles</p>
            </div>
            <div>
              <div className="h-12 w-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Youtube size={24} className="text-red-500" />
              </div>
              <h4 className="font-bold mb-1">Publish Shorts</h4>
              <p className="text-xs text-gray-500">Upload to your channel</p>
            </div>
          </div>
          <div className="mt-8 text-center">
            <a
              href="/drive"
              className="bg-red-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-red-700 transition-all inline-block"
            >
              Start Adding Folders →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
