/**
 * Status badge component for video workflow
 */
export function getStatusConfig(status) {
  const configs = {
    detected: {
      label: "Detected",
      color: "blue",
      bgClass: "bg-blue-500/10",
      textClass: "text-blue-500",
      borderClass: "border-blue-500/20",
      description: "New video found in Drive",
    },
    analyzing: {
      label: "Analyzing",
      color: "purple",
      bgClass: "bg-purple-500/10",
      textClass: "text-purple-500",
      borderClass: "border-purple-500/20",
      description: "AI is generating metadata",
    },
    pending_review: {
      label: "Pending Review",
      color: "yellow",
      bgClass: "bg-yellow-500/10",
      textClass: "text-yellow-500",
      borderClass: "border-yellow-500/20",
      description: "Needs human approval",
    },
    ready_for_review: {
      label: "Ready for Review",
      color: "cyan",
      bgClass: "bg-cyan-500/10",
      textClass: "text-cyan-500",
      borderClass: "border-cyan-500/20",
      description: "High confidence - ready to publish",
    },
    scheduled: {
      label: "Scheduled",
      color: "indigo",
      bgClass: "bg-indigo-500/10",
      textClass: "text-indigo-500",
      borderClass: "border-indigo-500/20",
      description: "Queued for automatic upload",
    },
    uploading: {
      label: "Uploading",
      color: "orange",
      bgClass: "bg-orange-500/10",
      textClass: "text-orange-500",
      borderClass: "border-orange-500/20",
      description: "Publishing to YouTube",
    },
    published: {
      label: "Published",
      color: "green",
      bgClass: "bg-green-500/10",
      textClass: "text-green-500",
      borderClass: "border-green-500/20",
      description: "Live on YouTube Shorts",
    },
    failed: {
      label: "Failed",
      color: "red",
      bgClass: "bg-red-500/10",
      textClass: "text-red-500",
      borderClass: "border-red-500/20",
      description: "Upload encountered an error",
    },
  };

  return (
    configs[status] || {
      label: status,
      color: "gray",
      bgClass: "bg-gray-500/10",
      textClass: "text-gray-500",
      borderClass: "border-gray-500/20",
      description: "Unknown status",
    }
  );
}

export function StatusBadge({ status, showDescription = false }) {
  const config = getStatusConfig(status);

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bgClass} ${config.textClass} ${config.borderClass}`}
        title={config.description}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${config.textClass.replace("text-", "bg-")}`}
        ></span>
        {config.label}
      </span>
      {showDescription && (
        <span className="text-xs text-gray-500 pl-1">{config.description}</span>
      )}
    </div>
  );
}
