import React from "react";
import {
  FileVideo,
  CheckCircle2,
  Clock,
  Upload,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowRight,
  BarChart3,
  Play,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/components/StatusBadge";
import useUser from "@/utils/useUser";
import { toast } from "sonner";

const STATUS_ORDER = ["uploading", "analyzing", "detected", "ready_for_review", "pending_review", "scheduled", "published", "failed"];

const StepIndicator = ({ status }) => {
  const steps = [
    { key: "scanned", label: "Scanned", icon: FileVideo },
    { key: "metadata", label: "AI Metadata", icon: Sparkles },
    { key: "review", label: "Review", icon: Clock },
    { key: "upload", label: "Upload", icon: Upload },
    { key: "done", label: "Done", icon: CheckCircle2 },
  ];

  let activeIdx = 0;
  if (status === "detected") activeIdx = 0;
  else if (status === "analyzing") activeIdx = 1;
  else if (status === "pending_review" || status === "ready_for_review") activeIdx = 2;
  else if (status === "scheduled") activeIdx = 2;
  else if (status === "uploading") activeIdx = 3;
  else if (status === "published") activeIdx = 4;
  else if (status === "failed") activeIdx = -1;

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isDone = activeIdx > i;
        const isActive = activeIdx === i;
        const isFailed = status === "failed";
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                isDone
                  ? "bg-green-500/20 text-green-500"
                  : isActive
                    ? isFailed
                      ? "bg-red-500/20 text-red-500"
                      : "bg-red-600/20 text-red-500 ring-2 ring-red-500/30"
                    : "bg-white/5 text-gray-600"
              }`}
              title={step.label}
            >
              {isDone ? (
                <CheckCircle2 size={14} />
              ) : isActive && (status === "analyzing" || status === "uploading") ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Icon size={14} />
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-4 h-0.5 ${isDone ? "bg-green-500/40" : "bg-white/5"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function PipelinePage() {
  const { data: user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: async () => {
      const res = await fetch("/api/videos/pipeline");
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 10000,
    retry: false,
  });

  // Retry single video
  const retryMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/videos/retry/${id}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Retry failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Video queued for retry");
      queryClient.invalidateQueries(["pipeline"]);
    },
    onError: (err) => toast.error(err.message),
  });

  // Retry ALL failed videos
  const retryAllMutation = useMutation({
    mutationFn: async () => {
      const failedVideos = (data?.videos || []).filter(v => v.status === "failed");
      const results = await Promise.allSettled(
        failedVideos.map(v => fetch(`/api/videos/retry/${v.id}`, { method: "POST" }))
      );
      const succeeded = results.filter(r => r.status === "fulfilled").length;
      return { succeeded, total: failedVideos.length };
    },
    onSuccess: ({ succeeded, total }) => {
      toast.success(`Retrying ${succeeded}/${total} failed videos`);
      queryClient.invalidateQueries(["pipeline"]);
    },
    onError: () => toast.error("Failed to retry videos"),
  });

  if (userLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-[#1a1a1a] rounded-3xl border border-white/5 p-12 max-w-md text-center">
          <Upload size={32} className="text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Sign In Required</h2>
          <p className="text-gray-400 mb-6">Sign in to view your upload pipeline.</p>
          <a href="/account/signin" className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-all inline-block">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const videos = data?.videos || [];
  const stats = data?.stats || {};

  const sortedVideos = [...videos].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    return ai - bi;
  });

  const uploading = videos.filter((v) => v.status === "uploading").length;
  const inProgress = videos.filter((v) => ["detected", "analyzing", "pending_review", "ready_for_review", "scheduled"].includes(v.status)).length;
  const done = videos.filter((v) => v.status === "published").length;
  const failed = videos.filter((v) => v.status === "failed").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Upload Pipeline</h1>
          <p className="text-gray-400 mt-1">Track today's videos from scan to YouTube.</p>
        </div>
        {failed > 0 && (
          <button
            onClick={() => retryAllMutation.mutate()}
            disabled={retryAllMutation.isPending}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={retryAllMutation.isPending ? "animate-spin" : ""} />
            Retry All Failed ({failed})
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Loader2 size={18} className="text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{uploading}</p>
          </div>
          <p className="text-xs text-gray-500">Uploading Now</p>
        </div>
        <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{inProgress}</p>
          </div>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
        <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 size={18} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold">{done}</p>
          </div>
          <p className="text-xs text-gray-500">Published Today</p>
        </div>
        <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/10">
              <BarChart3 size={18} className="text-red-500" />
            </div>
            <p className="text-2xl font-bold">{stats.published_today || 0}/{stats.daily_limit || 5}</p>
          </div>
          <p className="text-xs text-gray-500">Daily Quota Used</p>
        </div>
      </div>

      {stats.next_upload_in_minutes != null && (
        <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-yellow-500/20 flex items-center gap-3">
          <Clock size={18} className="text-yellow-500" />
          <p className="text-sm text-gray-300">
            Next upload in <strong className="text-yellow-500">~{stats.next_upload_in_minutes} min</strong> (interval: every {stats.interval_hours}h)
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#1a1a1a] h-20 rounded-2xl border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : sortedVideos.length > 0 ? (
        <div className="space-y-3">
          {sortedVideos.map((video) => (
            <div
              key={video.id}
              className={`bg-[#1a1a1a] p-5 rounded-2xl border transition-all ${
                video.status === "uploading"
                  ? "border-orange-500/30 shadow-lg shadow-orange-500/5"
                  : video.status === "published"
                    ? "border-green-500/20"
                    : video.status === "failed"
                      ? "border-red-500/20"
                      : "border-white/5"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  video.status === "published"
                    ? "bg-green-500/10"
                    : video.status === "uploading"
                      ? "bg-orange-500/10"
                      : video.status === "failed"
                        ? "bg-red-500/10"
                        : "bg-white/5"
                }`}>
                  {video.status === "published" ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : video.status === "uploading" ? (
                    <Loader2 size={20} className="text-orange-500 animate-spin" />
                  ) : video.status === "failed" ? (
                    <AlertCircle size={20} className="text-red-500" />
                  ) : video.status === "analyzing" ? (
                    <Sparkles size={20} className="text-purple-500 animate-pulse" />
                  ) : (
                    <FileVideo size={20} className="text-gray-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-bold truncate">{video.meta_title || video.filename}</p>
                    <StatusBadge status={video.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{video.filename}</span>
                    {video.duration && <span>{Math.round(video.duration)}s</span>}
                    {video.file_size && <span>{(video.file_size / (1024 * 1024)).toFixed(1)} MB</span>}
                    {video.confidence_score && (
                      <span className="text-yellow-500">AI: {(video.confidence_score * 100).toFixed(0)}%</span>
                    )}
                  </div>
                  {video.status === "failed" && video.error_message && (
                    <p className="text-xs text-red-400 mt-1 truncate">{video.error_message}</p>
                  )}
                </div>

                <div className="hidden md:block shrink-0">
                  <StepIndicator status={video.status} />
                </div>

                {video.status === "published" && video.youtube_video_url && (
                  <a
                    href={video.youtube_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-2 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500/20 transition-all"
                    title="View on YouTube"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>

              {video.status === "uploading" && (
                <div className="mt-3 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#1a1a1a] py-20 rounded-3xl border border-dashed border-white/10 text-center">
          <Upload size={40} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No Videos Today</h3>
          <p className="text-gray-400 max-w-sm mx-auto mb-6">
            Scan a Drive folder to start detecting and uploading videos.
          </p>
          <a
            href="/drive"
            className="bg-red-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-700 transition-all inline-block"
          >
            Go to Drive Folders
          </a>
        </div>
      )}
    </div>
  );
}
