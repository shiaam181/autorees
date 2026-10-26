"use client";

import { useState } from "react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const token = new URLSearchParams(window.location.search).get("token") || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!token) {
      setError("Missing reset token.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Unable to reset password.");
      }

      setDone(true);
    } catch (err) {
      setError(err.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] p-4 text-white">
        <div className="w-full max-w-md rounded-2xl bg-[#1a1a1a] p-8 shadow-2xl border border-white/5 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 mb-4">✅</div>
          <h1 className="text-3xl font-bold mb-3">Password reset</h1>
          <p className="text-gray-300 mb-5">Your password was updated successfully.</p>
          <a href="/account/signin" className="inline-block text-red-500 hover:text-red-400 font-medium">
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] p-4 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-[#1a1a1a] p-8 shadow-2xl border border-white/5">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 mb-4">🔒</div>
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="text-gray-400 mt-2">Choose a new password.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-[#2a2a2a] border border-white/10 px-4 py-3 text-white outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg bg-[#2a2a2a] border border-white/10 px-4 py-3 text-white outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-red-600 px-4 py-3 text-base font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Reset password"}
          </button>
        </div>
      </form>
    </div>
  );
}
