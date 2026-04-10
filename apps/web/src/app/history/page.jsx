import React, { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  History as HistoryIcon,
  Search,
  Youtube,
  Clock,
  Filter,
  AlertCircle,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/components/StatusBadge";

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [expandedLogs, setExpandedLogs] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: history, isLoading } = useQuery({
    queryKey: ["upload-history", statusFilter],
    queryFn: async () => {
      const url =
        statusFilter === "all"
          ? "/api/videos/history"
          : `/api/videos/history?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    retry: false,
  });

  const retryMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/videos/retry/${id}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Retry failed");
      }
      return res.json();
    },
    onSuccess: () => {
      alert("Video queued for retry!");
      queryClient.invalidateQueries(["upload-history"]);
      queryClient.invalidateQueries(["video-queue"]);
    },
    onError: (err) => {
      alert(`Retry failed: ${err.message}`);
    },
  });

  const toggleLogs = (videoId) => {
    setExpandedLogs((prev) => ({ ...prev, [videoId]: !prev[videoId] }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Upload History</h1>
          <p className="text-gray-400 mt-1">
            Track your published Shorts, scheduled uploads, and any failures.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder="Search videos..."
              className="bg-[#1a1a1a] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-red-600/50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#1a1a1a] border border-white/5 px-3 py-2 rounded-xl text-sm outline-none focus:border-red-600/50"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Video
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Link / Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6">
                      <div className="h-4 w-48 bg-white/5 rounded"></div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="h-4 w-24 bg-white/5 rounded"></div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="h-4 w-32 bg-white/5 rounded"></div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="h-4 w-12 bg-white/5 rounded"></div>
                    </td>
                  </tr>
                ))
              ) : history?.length > 0 ? (
                history.map((video) => (
                  <React.Fragment key={video.id}>
                    <tr className="hover:bg-white/[0.01] transition-all group">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-8 bg-[#2a2a2a] rounded flex items-center justify-center">
                            <Youtube size={14} className="text-white/20" />
                          </div>
                          <div>
                            <span className="font-medium group-hover:text-red-500 transition-colors block">
                              {video.filename}
                            </span>
                            {video.retry_count > 0 && (
                              <span className="text-[10px] text-yellow-500">
                                {video.retry_count} retry attempts
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <StatusBadge status={video.status} />
                        {video.status === "scheduled" && video.scheduled_at && (
                          <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(video.scheduled_at).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-6 text-sm text-gray-400">
                        {video.published_at
                          ? new Date(video.published_at).toLocaleDateString()
                          : video.detected_at
                            ? new Date(video.detected_at).toLocaleDateString()
                            : "-"}
                        <span className="block text-[10px] text-gray-600">
                          {video.published_at
                            ? `at ${new Date(
                                video.published_at,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : "Not published"}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          {video.youtube_video_url && (
                            <a
                              href={video.youtube_video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/5 transition-all"
                              title="View on YouTube"
                            >
                              <ExternalLink size={18} />
                            </a>
                          )}
                          {video.status === "failed" && (
                            <button
                              onClick={() => retryMutation.mutate(video.id)}
                              disabled={
                                retryMutation.isPending ||
                                video.retry_count >= 3
                              }
                              className="text-yellow-500 hover:text-yellow-400 p-2 rounded-lg hover:bg-yellow-500/5 transition-all disabled:opacity-30"
                              title={
                                video.retry_count >= 3
                                  ? "Max retries reached"
                                  : "Retry upload"
                              }
                            >
                              <RefreshCw size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => toggleLogs(video.id)}
                            className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all"
                            title="View logs"
                          >
                            {expandedLogs[video.id] ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedLogs[video.id] && (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 bg-[#0d0d0d]">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                              <FileText size={14} /> Video Details
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500 text-xs">
                                  File Size
                                </span>
                                <p className="font-medium">
                                  {(video.file_size / (1024 * 1024)).toFixed(2)}{" "}
                                  MB
                                </p>
                              </div>
                              {video.duration && (
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Duration
                                  </span>
                                  <p className="font-medium">
                                    {Math.round(video.duration)}s
                                  </p>
                                </div>
                              )}
                              {video.width && video.height && (
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Resolution
                                  </span>
                                  <p className="font-medium">
                                    {video.width}x{video.height}
                                  </p>
                                </div>
                              )}
                              {video.detected_at && (
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Detected
                                  </span>
                                  <p className="font-medium text-xs">
                                    {new Date(
                                      video.detected_at,
                                    ).toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                            {video.error_message && (
                              <div className="mt-4 bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                                <div className="flex items-start gap-2 text-red-400">
                                  <AlertCircle
                                    size={16}
                                    className="flex-shrink-0 mt-0.5"
                                  />
                                  <div>
                                    <p className="font-bold text-xs mb-1">
                                      Error Details:
                                    </p>
                                    <p className="text-sm">
                                      {video.error_message}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-24 text-center">
                    <HistoryIcon
                      size={48}
                      className="text-gray-800 mx-auto mb-4"
                    />
                    <p className="text-gray-500 font-medium">
                      {statusFilter === "all"
                        ? "No upload history yet."
                        : `No ${statusFilter} videos found.`}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Once you publish your first Short, it will appear here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
