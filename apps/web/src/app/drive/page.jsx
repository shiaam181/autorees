import React, { useState } from "react";
import {
  FolderPlus,
  FolderOpen,
  MoreVertical,
  Play,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function DriveFoldersPage() {
  const queryClient = useQueryClient();
  const [folderUrl, setFolderUrl] = useState("");

  const { data: sources, isLoading } = useQuery({
    queryKey: ["drive-sources"],
    queryFn: async () => {
      const res = await fetch("/api/drive/folders");
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
  });

  const addFolderMutation = useMutation({
    mutationFn: async (url) => {
      const res = await fetch("/api/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderUrl: url }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add folder");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Folder added and scanning started!");
      setFolderUrl("");
      queryClient.invalidateQueries(["drive-sources"]);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/drive/scan/${id}`, { method: "POST" });
      if (!res.ok) throw new Error("Scan failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Folder scan initiated");
      queryClient.invalidateQueries(["drive-sources"]);
    },
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold">Drive Source Folders</h1>
          <p className="text-gray-400 mt-1">
            Manage the Google Drive folders that we scan for new Shorts.
          </p>
        </div>
      </div>

      {/* Add Folder Section */}
      <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <FolderPlus size={120} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-xl font-bold mb-4">Connect New Folder</h2>
          <p className="text-gray-400 text-sm mb-6">
            Paste a shared Google Drive folder link. Make sure the account you
            connected has access to this folder.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="https://drive.google.com/drive/folders/..."
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 outline-none focus:border-red-600/50 transition-all"
              />
            </div>
            <button
              onClick={() => addFolderMutation.mutate(folderUrl)}
              disabled={addFolderMutation.isPending || !folderUrl}
              className="bg-white text-black font-bold px-8 py-4 rounded-2xl hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addFolderMutation.isPending ? "Adding..." : "Add Folder"}
              <FolderPlus size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Folders List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold px-2 flex items-center gap-2">
          <FolderOpen size={20} className="text-red-500" />
          Active Sources
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#1a1a1a] h-48 rounded-3xl border border-white/5 animate-pulse"
              ></div>
            ))}
          </div>
        ) : sources?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sources.map((source) => (
              <div
                key={source.id}
                className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all flex flex-col group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="p-4 rounded-2xl bg-red-600/10 text-red-600">
                    <FolderOpen size={28} />
                  </div>
                  <button className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white">
                    <MoreVertical size={20} />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate group-hover:text-red-500 transition-colors">
                    {source.folder_name || "Unnamed Folder"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                    <CheckCircle2 size={12} className="text-green-500" />
                    <span>Auto-queue: {source.auto_queue ? "On" : "Off"}</span>
                    <span className="mx-1">•</span>
                    <span>
                      {new Date(source.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex gap-2">
                  <button
                    onClick={() => scanMutation.mutate(source.id)}
                    disabled={scanMutation.isPending}
                    className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={14} /> Scan Now
                  </button>
                  <a
                    href={source.folder_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#1a1a1a] py-20 rounded-3xl border border-dashed border-white/10 text-center">
            <div className="p-5 rounded-full bg-white/5 inline-flex mb-6">
              <FolderOpen size={40} className="text-gray-700" />
            </div>
            <h3 className="text-xl font-bold mb-2">No folders connected</h3>
            <p className="text-gray-400 max-w-sm mx-auto mb-8">
              Connect your first Google Drive folder to start detecting videos
              and creating viral Shorts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
