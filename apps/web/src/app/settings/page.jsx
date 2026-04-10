import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Zap,
  Globe,
  Lock,
  Trash2,
  Save,
  FolderSearch,
  Sparkles,
  Upload,
  Clock,
  Eye,
  Shield,
  Video,
  Hash,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
    <div className="flex-1 mr-4">
      <p className="font-bold">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        checked ? "bg-red-600" : "bg-gray-700"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("automation");
  const [localSettings, setLocalSettings] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

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

  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings({ ...settings });
    }
  }, [settings]);

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
    onSuccess: (data) => {
      toast.success("Settings saved!");
      setLocalSettings(data);
      setHasChanges(false);
      queryClient.invalidateQueries(["user-settings"]);
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const update = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!localSettings) return;
    updateMutation.mutate(localSettings);
  };

  const tabs = [
    { id: "automation", label: "Automation", icon: Zap },
    { id: "upload", label: "Upload Defaults", icon: Globe },
    { id: "security", label: "Security", icon: Lock },
  ];

  if (isLoading || !localSettings) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-red-600 rounded-xl" />
          <div className="h-4 w-32 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
            hasChanges
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-white/10 text-gray-500 cursor-not-allowed"
          }`}
        >
          <Save size={20} />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-56 space-y-1">
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

        <div className="flex-1 space-y-6">
          {activeTab === "automation" && (
            <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 space-y-8">
              <div className="space-y-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FolderSearch size={22} className="text-red-500" />
                  Scanning
                </h3>
                <p className="text-sm text-gray-500">Control how your Drive folders are monitored for new videos.</p>
              </div>
              <div className="space-y-4">
                <Toggle
                  checked={localSettings.auto_scan ?? true}
                  onChange={(v) => update("auto_scan", v)}
                  label="Auto-Scan Folders"
                  description="Automatically scan your connected Drive folders for new videos at regular intervals."
                />
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                  <div className="flex-1 mr-4">
                    <p className="font-bold flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      Scan Interval
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">How often to check folders for new videos.</p>
                  </div>
                  <select
                    value={localSettings.scan_interval_minutes ?? 5}
                    onChange={(e) => update("scan_interval_minutes", parseInt(e.target.value))}
                    className="bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-2 text-white outline-none"
                  >
                    <option value={1}>Every 1 min</option>
                    <option value={5}>Every 5 min</option>
                    <option value={15}>Every 15 min</option>
                    <option value={30}>Every 30 min</option>
                    <option value={60}>Every 1 hour</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-white/5 pt-8 space-y-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles size={22} className="text-red-500" />
                  AI Metadata
                </h3>
                <p className="text-sm text-gray-500">Control how AI generates titles, descriptions, and tags.</p>
              </div>
              <div className="space-y-4">
                <Toggle
                  checked={localSettings.auto_metadata ?? true}
                  onChange={(v) => update("auto_metadata", v)}
                  label="Auto-Generate Metadata"
                  description="Automatically generate AI titles, descriptions, and hashtags for detected videos using Gemini."
                />
                <Toggle
                  checked={localSettings.auto_queue ?? false}
                  onChange={(v) => update("auto_queue", v)}
                  label="Auto-Queue New Videos"
                  description="Automatically add all new Drive videos to the review queue without manual selection."
                />
              </div>

              <div className="border-t border-white/5 pt-8 space-y-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Upload size={22} className="text-red-500" />
                  Publishing
                </h3>
                <p className="text-sm text-gray-500">Control how and when videos are published to YouTube.</p>
              </div>
              <div className="space-y-4">
                <Toggle
                  checked={localSettings.review_required ?? true}
                  onChange={(v) => update("review_required", v)}
                  label="Require Human Review"
                  description="Videos won't be uploaded until you manually approve the metadata. Disable for fully automatic publishing."
                />
                <Toggle
                  checked={localSettings.auto_publish ?? false}
                  onChange={(v) => update("auto_publish", v)}
                  label="Auto-Publish to YouTube"
                  description="Automatically upload videos with high-confidence AI metadata to YouTube Shorts. Use with caution."
                />

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                  <div className="flex-1 mr-4">
                    <p className="font-bold">Videos Per Day</p>
                    <p className="text-xs text-gray-500 mt-0.5">Maximum number of videos to scan and upload per day. Already uploaded videos won't reappear.</p>
                  </div>
                  <select
                    value={localSettings.daily_upload_limit ?? 5}
                    onChange={(e) => update("daily_upload_limit", parseInt(e.target.value))}
                    className="bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-2 text-white outline-none"
                  >
                    <option value={1}>1 video/day</option>
                    <option value={2}>2 videos/day</option>
                    <option value={3}>3 videos/day</option>
                    <option value={5}>5 videos/day</option>
                    <option value={10}>10 videos/day</option>
                    <option value={15}>15 videos/day</option>
                    <option value={20}>20 videos/day</option>
                    <option value={50}>50 videos/day</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                  <div className="flex-1 mr-4">
                    <p className="font-bold flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      Gap Between Uploads
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Wait this long between uploading each video to YouTube.</p>
                  </div>
                  <select
                    value={localSettings.upload_interval_hours ?? 2}
                    onChange={(e) => update("upload_interval_hours", parseFloat(e.target.value))}
                    className="bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-2 text-white outline-none"
                  >
                    <option value={0.5}>30 minutes</option>
                    <option value={1}>1 hour</option>
                    <option value={1.5}>1.5 hours</option>
                    <option value={2}>2 hours</option>
                    <option value={3}>3 hours</option>
                    <option value={4}>4 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={8}>8 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 space-y-8">
              <div className="space-y-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Video size={22} className="text-red-500" />
                  YouTube Defaults
                </h3>
                <p className="text-sm text-gray-500">Default settings applied to all uploaded videos.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                    <Eye size={14} /> Privacy Status
                  </label>
                  <select
                    value={localSettings.default_privacy ?? "public"}
                    onChange={(e) => update("default_privacy", e.target.value)}
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-600/50"
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                    <Hash size={14} /> Category
                  </label>
                  <select
                    value={localSettings.default_category ?? "22"}
                    onChange={(e) => update("default_category", e.target.value)}
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-600/50"
                  >
                    <option value="22">People & Blogs</option>
                    <option value="24">Entertainment</option>
                    <option value="20">Gaming</option>
                    <option value="27">Education</option>
                    <option value="10">Music</option>
                    <option value="17">Sports</option>
                    <option value="28">Science & Technology</option>
                    <option value="23">Comedy</option>
                    <option value="26">How-to & Style</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <Toggle
                  checked={localSettings.made_for_kids ?? false}
                  onChange={(v) => update("made_for_kids", v)}
                  label="Made for Kids"
                  description="Mark all uploaded videos as made for children (required by YouTube COPPA compliance)."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-400">
                  Branding Line (Appended to descriptions)
                </label>
                <input
                  type="text"
                  value={localSettings.branding_line ?? ""}
                  onChange={(e) => update("branding_line", e.target.value)}
                  placeholder="e.g. Created with YT Shorts Auto"
                  className="w-full bg-[#2a2a2a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-600/50"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-400">Default Timezone</label>
                <select
                  value={localSettings.default_timezone ?? "UTC"}
                  onChange={(e) => update("default_timezone", e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-600/50"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Central Europe (CET)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Asia/Tokyo">Japan (JST)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 space-y-8">
              <div className="space-y-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Shield size={22} className="text-red-500" />
                  Account Security
                </h3>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-400">Notification Email</label>
                <input
                  type="email"
                  value={localSettings.notification_email ?? ""}
                  onChange={(e) => update("notification_email", e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-[#2a2a2a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-600/50"
                />
                <p className="text-xs text-gray-500">Receive alerts when uploads fail or require attention.</p>
              </div>

              <div className="pt-4 border-t border-white/5">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
