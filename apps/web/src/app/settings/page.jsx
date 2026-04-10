import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  Lock,
  Globe,
  Trash2,
  CheckCircle2,
  Save,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: async (newData) => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Settings updated successfully");
      queryClient.invalidateQueries(["user-settings"]);
    },
  });

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "upload", label: "Upload Defaults", icon: Globe },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Lock },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <button
          onClick={() => updateMutation.mutate({})} // Just a dummy save for demo
          className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-all"
        >
          <Save size={20} /> Save Changes
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="md:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-red-600 text-white font-bold"
                  : "text-gray-400 hover:bg-white/5 hover:text-white font-medium"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 space-y-8">
            {activeTab === "general" && (
              <>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">General Preferences</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                      <div>
                        <p className="font-bold">Human Review Required</p>
                        <p className="text-xs text-gray-500">
                          Videos won't upload until you approve metadata.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked
                        className="h-6 w-11 appearance-none bg-gray-700 checked:bg-red-600 rounded-full relative cursor-pointer transition-all before:content-[''] before:absolute before:top-1 before:left-1 before:h-4 before:w-4 before:bg-white before:rounded-full before:transition-all checked:before:left-6"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                      <div>
                        <p className="font-bold">Auto-queue New Videos</p>
                        <p className="text-xs text-gray-500">
                          Automatically add new Drive files to the review queue.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-6 w-11 appearance-none bg-gray-700 checked:bg-red-600 rounded-full relative cursor-pointer transition-all before:content-[''] before:absolute before:top-1 before:left-1 before:h-4 before:w-4 before:bg-white before:rounded-full before:transition-all checked:before:left-6"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <label className="block text-sm font-bold text-gray-400">
                    Branding Line (Appended to descriptions)
                  </label>
                  <input
                    type="text"
                    defaultValue="Created with YT Shorts Auto"
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-600/50"
                  />
                </div>
              </>
            )}

            {activeTab === "upload" && (
              <>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">YouTube Defaults</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400">
                        Privacy Status
                      </label>
                      <select className="w-full bg-[#2a2a2a] border border-white/10 rounded-2xl p-4 text-white outline-none">
                        <option>Public</option>
                        <option>Unlisted</option>
                        <option>Private</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400">
                        Category
                      </label>
                      <select className="w-full bg-[#2a2a2a] border border-white/10 rounded-2xl p-4 text-white outline-none">
                        <option>People & Blogs</option>
                        <option>Entertainment</option>
                        <option>Gaming</option>
                        <option>Education</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="p-6 border border-red-500/20 bg-red-500/5 rounded-2xl">
                  <h4 className="text-red-500 font-bold flex items-center gap-2 mb-2">
                    <Trash2 size={18} /> Danger Zone
                  </h4>
                  <p className="text-sm text-gray-400 mb-6">
                    Deleting your account will remove all connected sources,
                    upload history, and cached metadata. This action cannot be
                    undone.
                  </p>
                  <button className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all">
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
