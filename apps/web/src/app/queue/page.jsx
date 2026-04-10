import React, { useState, useRef } from "react";
import {
  FileVideo,
  Sparkles,
  UploadCloud,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  ChevronRight,
  Info,
  MoreVertical,
  Clock,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";

const VideoThumbnail = ({ videoId, className = "" }) => {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const videoRef = useRef(null);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-[#2a2a2a] ${className}`}>
        <FileVideo size={40} className="text-white/10" />
      </div>
    );
  }

  return (
    <div
      className={`relative group/vid cursor-pointer bg-black ${className}`}
      onClick={() => {
        if (!videoRef.current) return;
        if (playing) {
          videoRef.current.pause();
          setPlaying(false);
        } else {
          videoRef.current.play().catch(() => setError(true));
          setPlaying(true);
        }
      }}
    >
      <video
        ref={videoRef}
        src={`/api/videos/stream/${videoId}`}
        className="w-full h-full object-cover"
        muted
        playsInline
        preload="metadata"
        onError={() => setError(true)}
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/vid:bg-black/40 transition-all">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Play size={18} className="text-white ml-0.5" fill="white" />
          </div>
        </div>
      )}
    </div>
  );
};

const VideoReviewCard = ({ video, onReview }) => {
  const isVertical = video.height > video.width;
  const aspectLabel = isVertical ? "9:16 VERTICAL" : "HORIZONTAL";
  const duration = video.duration
    ? `${Math.round(video.duration)}s`
    : "Unknown";

  return (
    <div className="bg-[#1a1a1a] rounded-3xl border border-white/5 overflow-hidden hover:border-white/10 transition-all flex flex-col md:flex-row h-full md:h-48 group">
      <div className="md:w-36 relative border-b md:border-b-0 md:border-r border-white/5 overflow-hidden">
        <VideoThumbnail videoId={video.id} className="w-full h-full min-h-[120px]" />
        <div className="absolute top-2 right-2 flex flex-col gap-1 pointer-events-none">
          <span className="text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded text-white backdrop-blur-md border border-white/10">
            {aspectLabel}
          </span>
          <span className="text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded text-white backdrop-blur-md border border-white/10">
            {duration}
          </span>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg truncate mb-1 group-hover:text-red-500 transition-colors">
              {video.filename}
            </h3>
            <p className="text-xs text-gray-500">
              Detected{" "}
              {new Date(
                video.detected_at || video.created_at,
              ).toLocaleDateString()}{" "}
              • {(video.file_size / (1024 * 1024)).toFixed(1)} MB
            </p>
          </div>
          <StatusBadge status={video.status} />
        </div>

        {video.last_error && (
          <div className="mt-2 text-xs text-red-400 bg-red-500/5 px-3 py-2 rounded-lg border border-red-500/10 flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{video.last_error}</span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onReview(video)}
            className="bg-white text-black text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
          >
            <Sparkles size={16} /> Review & Optimize
          </button>
        </div>
      </div>
    </div>
  );
};

export default function QueuePage() {
  const queryClient = useQueryClient();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  const { data: queue, isLoading } = useQuery({
    queryKey: ["video-queue"],
    queryFn: async () => {
      const res = await fetch("/api/videos/queue");
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch queue");
      return res.json();
    },
    retry: false,
  });

  const { data: metadata, refetch: refetchMetadata } = useQuery({
    queryKey: ["metadata", selectedVideo?.id],
    queryFn: async () => {
      if (!selectedVideo) return null;
      const res = await fetch(`/api/videos/metadata/${selectedVideo.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedVideo,
  });

  const generateMetaMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/metadata/generate/${id}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("AI metadata generated successfully!");
      refetchMetadata();
      queryClient.invalidateQueries(["video-queue"]);
    },
    onError: (err) => {
      if (err.message.includes("rate limit") || err.message.includes("exhausted")) {
        toast.error("API rate limit reached. Wait a minute or add more keys in API Keys page.");
      } else {
        toast.error(err.message);
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/videos/publish/${id}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Video published to YouTube!");
      setSelectedVideo(null);
      queryClient.invalidateQueries(["video-queue"]);
      queryClient.invalidateQueries(["upload-history"]);
    },
    onError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({ id, scheduled_for, timezone }) => {
      const res = await fetch(`/api/videos/schedule/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_for, timezone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Schedule failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Video scheduled successfully!");
      setIsScheduling(false);
      setSelectedVideo(null);
      queryClient.invalidateQueries(["video-queue"]);
    },
    onError: (err) => {
      toast.error(`Schedule failed: ${err.message}`);
    },
  });

  const handleSchedule = () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error("Please select both date and time");
      return;
    }
    const scheduledFor = new Date(
      `${scheduleDate}T${scheduleTime}`,
    ).toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    scheduleMutation.mutate({
      id: selectedVideo.id,
      scheduled_for: scheduledFor,
      timezone,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Review Queue</h1>
          <p className="text-gray-400 mt-1">
            Review AI suggestions and finalize your Shorts for upload.
          </p>
        </div>
      </div>

      {!selectedVideo ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[#1a1a1a] h-48 rounded-3xl border border-white/5 animate-pulse"
              ></div>
            ))
          ) : queue?.length > 0 ? (
            queue.map((video) => (
              <VideoReviewCard
                key={video.id}
                video={video}
                onReview={setSelectedVideo}
              />
            ))
          ) : (
            <div className="xl:col-span-2 bg-[#1a1a1a] py-32 rounded-3xl border border-dashed border-white/10 text-center">
              <UploadCloud size={48} className="text-gray-700 mx-auto mb-6" />
              <h3 className="text-xl font-bold mb-2">No videos in queue</h3>
              <p className="text-gray-400 mb-8">
                Scan a Drive folder to start detecting short-form content.
              </p>
              <a
                href="/drive"
                className="bg-red-600 text-white font-bold px-8 py-3 rounded-2xl hover:bg-red-700 transition-all inline-block"
              >
                Go to Drive Folders
              </a>
            </div>
          )}
        </div>
      ) : (
        /* Editor View - mostly stays same with schedule UI added */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4 duration-500">
          <div className="lg:col-span-2 space-y-6">
            <button
              onClick={() => {
                setSelectedVideo(null);
                setIsScheduling(false);
              }}
              className="text-sm font-medium text-gray-500 hover:text-white flex items-center gap-2 transition-all mb-4"
            >
              <ChevronRight size={16} className="rotate-180" /> Back to Queue
            </button>

            <div className="bg-[#1a1a1a] rounded-3xl border border-white/5 overflow-hidden">
              <div className="relative bg-black w-full" style={{ maxHeight: "400px" }}>
                <video
                  key={selectedVideo.id}
                  src={`/api/videos/stream/${selectedVideo.id}`}
                  className="w-full max-h-[400px] object-contain"
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>
            </div>

            <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <FileEdit size={24} className="text-red-500" />
                  {selectedVideo.filename}
                </h2>
                <button
                  onClick={() => generateMetaMutation.mutate(selectedVideo.id)}
                  disabled={generateMetaMutation.isPending}
                  className="bg-red-600/10 text-red-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600/20 transition-all flex items-center gap-2 border border-red-500/10 disabled:opacity-50"
                >
                  <Sparkles size={16} />{" "}
                  {generateMetaMutation.isPending
                    ? "Generating..."
                    : "Regenerate AI"}
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-400 flex items-center justify-between">
                    <span>Title</span>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded uppercase">
                      YouTube Optimized
                    </span>
                  </label>
                  <input
                    type="text"
                    defaultValue={metadata?.title || ""}
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-2xl p-4 text-white font-bold text-lg outline-none focus:border-red-600/50"
                    placeholder="Generate metadata first..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-400">
                    Description
                  </label>
                  <textarea
                    rows={6}
                    defaultValue={metadata?.description || ""}
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-600/50 resize-none"
                    placeholder="Generate metadata first..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-400">
                    Hashtags
                  </label>
                  <div className="flex flex-wrap gap-2 p-4 bg-[#2a2a2a] rounded-2xl border border-white/10 min-h-[100px]">
                    {metadata?.hashtags?.map((tag, i) => (
                      <span
                        key={i}
                        className="bg-red-600/20 text-red-500 px-3 py-1.5 rounded-lg text-sm font-bold border border-red-500/10"
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                    {!metadata?.hashtags && (
                      <span className="text-gray-600 italic text-sm">
                        Generate metadata first...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 space-y-6">
              <h3 className="font-bold text-lg">Publish Actions</h3>

              {!isScheduling ? (
                <div className="space-y-3">
                  <button
                    onClick={() => publishMutation.mutate(selectedVideo.id)}
                    disabled={publishMutation.isPending || !metadata?.title}
                    className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <UploadCloud size={20} />{" "}
                    {publishMutation.isPending ? "Uploading..." : "Publish Now"}
                  </button>
                  <button
                    onClick={() => setIsScheduling(true)}
                    className="w-full bg-[#2a2a2a] hover:bg-[#333] text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/5"
                  >
                    <Calendar size={20} /> Schedule for Later
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">
                      Date
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full bg-[#2a2a2a] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-red-600/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full bg-[#2a2a2a] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-red-600/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSchedule}
                      disabled={scheduleMutation.isPending}
                      className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                      {scheduleMutation.isPending ? "Scheduling..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setIsScheduling(false)}
                      className="px-4 bg-[#2a2a2a] text-white font-bold py-3 rounded-xl hover:bg-[#333] transition-all border border-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Status</span>
                  <StatusBadge status={selectedVideo.status} />
                </div>
              </div>
            </div>

            {metadata && (
              <div className="bg-red-600/5 p-6 rounded-3xl border border-red-600/10">
                <h4 className="font-bold text-red-500 flex items-center gap-2 mb-2">
                  <Sparkles size={16} /> AI Analysis
                </h4>
                <p className="text-sm text-gray-400 leading-relaxed italic">
                  "
                  {metadata.ai_notes ||
                    "AI-generated metadata based on video analysis"}
                  "
                </p>
                {metadata.confidence_score && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full"
                        style={{ width: `${metadata.confidence_score * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-red-500">
                      {(metadata.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
