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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import useUser from "@/utils/useUser";

const AccountCard = ({
  provider,
  icon: Icon,
  label,
  status,
  onConnect,
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
      <div className="flex items-center gap-2 text-green-500 bg-green-500/5 py-3 px-4 rounded-xl border border-green-500/10">
        <CheckCircle2 size={18} />
        <span className="font-semibold text-sm">Active Connection</span>
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
      const res = await fetch("/api/auth/google/status");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch account status");
      }
      return res.json();
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
      "/api/auth/google",
      "google-oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
    const checkPopup = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          window.location.reload();
        }
      } catch (e) {
        // Cross-origin - popup still on Google's domain
      }
    }, 500);
  };

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
          />
          <AccountCard
            provider="youtube"
            label="YouTube"
            scope="youtube.upload"
            icon={Youtube}
            status={youtubeStatus}
            onConnect={handleConnect}
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
