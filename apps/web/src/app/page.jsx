import React from "react";
import {
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileEdit,
  TrendingUp,
  ArrowRight,
  Plus,
} from "lucide-react";
import useUser from "@/utils/useUser";
import { useQuery } from "@tanstack/react-query";

const StatCard = ({ label, value, icon: Icon, color, trend }) => (
  <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500`}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
          +{trend}%
        </span>
      )}
    </div>
    <h3 className="text-gray-400 text-sm font-medium">{label}</h3>
    <p className="text-3xl font-bold mt-1">{value}</p>
  </div>
);

export default function Dashboard() {
  const { data: user } = useUser();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const displayStats = stats || {
    processed: 0,
    uploadedToday: 0,
    scheduled: 0,
    failed: 0,
    drafts: 0,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.name || "Creator"}
          </h1>
          <p className="text-gray-400 mt-1">
            Here's what's happening with your Shorts today.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/drive"
            className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            <Plus size={20} />
            Add Folder
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Processed"
          value={displayStats.processed}
          icon={TrendingUp}
          color="blue"
          trend="12"
        />
        <StatCard
          label="Uploaded Today"
          value={displayStats.uploadedToday}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="Scheduled"
          value={displayStats.scheduled}
          icon={Clock}
          color="purple"
        />
        <StatCard
          label="Failed Uploads"
          value={displayStats.failed}
          icon={AlertCircle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity / Drafts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileEdit size={20} className="text-red-500" />
              Drafts Pending Review
            </h2>
            <a
              href="/queue"
              className="text-sm text-red-500 hover:text-red-400 font-medium flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </a>
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              </div>
            ) : displayStats.drafts > 0 ? (
              <div className="divide-y divide-white/5">
                {/* Mock items for now */}
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-all"
                  >
                    <div className="h-16 w-12 bg-[#2a2a2a] rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      <Play size={16} className="text-white/20" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">
                        tutorial_video_0{i}.mp4
                      </h4>
                      <p className="text-xs text-gray-500">
                        Detected 2 hours ago • Vertical 9:16
                      </p>
                    </div>
                    <a
                      href={`/queue?id=${i}`}
                      className="px-4 py-2 rounded-lg border border-white/10 text-sm font-medium hover:bg-white/5 transition-all"
                    >
                      Review
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="p-4 rounded-full bg-white/5 inline-flex mb-4">
                  <CheckCircle2 size={32} className="text-gray-600" />
                </div>
                <p className="text-gray-400">
                  All caught up! No drafts pending review.
                </p>
                <a
                  href="/drive"
                  className="text-red-500 text-sm mt-2 inline-block"
                >
                  Connect a folder to start
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips / Guide */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold px-2">Shorts Best Practices</h2>
          <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 p-6 rounded-2xl border border-red-500/10">
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <p className="text-sm text-gray-300">
                  Keep it under 60 seconds for Shorts shelf.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <p className="text-sm text-gray-300">
                  Use vertical 9:16 aspect ratio always.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <p className="text-sm text-gray-300">
                  Include #shorts in your description.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  4
                </div>
                <p className="text-sm text-gray-300">
                  Hook the viewer in the first 3 seconds.
                </p>
              </li>
            </ul>
          </div>

          <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5">
            <h3 className="font-bold mb-2">Need Help?</h3>
            <p className="text-sm text-gray-400 mb-4">
              Check our documentation for advanced scheduling tips.
            </p>
            <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-all">
              View Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
