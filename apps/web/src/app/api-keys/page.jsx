import React, { useState } from "react";
import {
  Key,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Sparkles,
  Shield,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useUser from "@/utils/useUser";

const PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    placeholder: "AIza...",
    helpUrl: "https://aistudio.google.com/apikey",
    helpText: "Get key from Google AI Studio",
  },
  {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    helpText: "Get key from OpenAI Platform",
  },
];

const getProviderInfo = (id) => PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];

export default function ApiKeysPage() {
  const { data: user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newProvider, setNewProvider] = useState("gemini");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const res = await fetch("/api/api-keys");
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch keys");
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: async ({ api_key, label, provider }) => {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key, label, provider }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add key");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("API key added and verified!");
      setNewKey("");
      setNewLabel("");
      setShowAddForm(false);
      queryClient.invalidateQueries(["api-keys"]);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const res = await fetch("/api/api-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries(["api-keys"]),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("API key removed");
      queryClient.invalidateQueries(["api-keys"]);
    },
  });

  if (userLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-[#1a1a1a] rounded-3xl border border-white/5 p-12 max-w-md text-center">
          <Key size={32} className="text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Sign In Required</h2>
          <p className="text-gray-400 mb-6">Sign in to manage your API keys.</p>
          <a href="/account/signin" className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-all inline-block">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const providerInfo = getProviderInfo(newProvider);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-gray-400 mt-1">Manage your AI API keys for metadata generation.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-all"
        >
          <Plus size={18} /> Add Key
        </button>
      </div>

      <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-blue-500/20 flex items-start gap-4">
        <Sparkles size={20} className="text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-gray-300">
            <strong>How it works:</strong> Add API keys from <strong>Google Gemini</strong> or <strong>OpenAI (ChatGPT)</strong>.
            When one key hits its rate limit, the system automatically switches to the next available key.
          </p>
          <div className="flex gap-4 mt-3">
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline">
              Get Gemini Key
            </a>
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 underline">
              Get OpenAI Key
            </a>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/10 space-y-5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Key size={18} className="text-red-500" /> Add New API Key
          </h3>

          <div>
            <label className="text-sm font-bold text-gray-400 block mb-2">Provider</label>
            <div className="grid grid-cols-2 gap-3">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setNewProvider(p.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    newProvider === p.id
                      ? `${p.borderColor} ${p.bgColor}`
                      : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <p className={`font-bold ${newProvider === p.id ? p.color : "text-white"}`}>
                    {p.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{p.helpText}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-bold text-gray-400 block mb-1">Label (optional)</label>
              <input
                type="text"
                placeholder="e.g. My Main Key, Backup Key"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-red-600/50"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-400 block mb-1">API Key</label>
              <input
                type="password"
                placeholder={providerInfo.placeholder}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-red-600/50 font-mono"
              />
              <a
                href={providerInfo.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs ${providerInfo.color} mt-1 inline-block underline`}
              >
                {providerInfo.helpText}
              </a>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => addMutation.mutate({ api_key: newKey, label: newLabel, provider: newProvider })}
              disabled={!newKey.trim() || addMutation.isPending}
              className="bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {addMutation.isPending ? "Verifying..." : "Add & Verify Key"}
              <Shield size={16} />
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewKey(""); setNewLabel(""); }}
              className="text-gray-400 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[#1a1a1a] h-24 rounded-2xl border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : keys?.length > 0 ? (
        <div className="space-y-3">
          {keys.map((key) => {
            const pi = getProviderInfo(key.provider);
            return (
              <div
                key={key.id}
                className={`bg-[#1a1a1a] p-5 rounded-2xl border transition-all flex items-center gap-4 ${
                  key.is_active ? "border-white/5" : "border-white/5 opacity-50"
                }`}
              >
                <div className={`p-3 rounded-xl ${key.is_active ? pi.bgColor : "bg-gray-500/10"}`}>
                  <Key size={20} className={key.is_active ? pi.color : "text-gray-500"} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold">{key.label || `${pi.name} Key`}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pi.bgColor} ${pi.color}`}>
                      {pi.name}
                    </span>
                    {key.is_active ? (
                      <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">Active</span>
                    ) : (
                      <span className="text-xs bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded-full">Disabled</span>
                    )}
                    {key.error_count > 0 && (
                      <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle size={10} /> {key.error_count} errors
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-1">{key.masked_key}</p>
                  {key.last_used_at && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      Last used: {new Date(key.last_used_at).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMutation.mutate({ id: key.id, is_active: !key.is_active })}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all"
                    title={key.is_active ? "Disable" : "Enable"}
                  >
                    {key.is_active ? (
                      <ToggleRight size={24} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={24} className="text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Remove this API key?")) deleteMutation.mutate(key.id);
                    }}
                    className="p-2 hover:bg-red-500/10 rounded-xl transition-all text-gray-500 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#1a1a1a] py-16 rounded-3xl border border-dashed border-white/10 text-center">
          <Key size={40} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No API Keys Added</h3>
          <p className="text-gray-400 max-w-sm mx-auto mb-6">
            Add a Gemini or OpenAI API key to enable AI metadata generation.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-red-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-700 transition-all inline-flex items-center gap-2"
          >
            <Plus size={18} /> Add Your First Key
          </button>
        </div>
      )}
    </div>
  );
}
