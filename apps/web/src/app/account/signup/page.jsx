import { useState } from "react";
import useAuth from "@/utils/useAuth";

function MainComponent() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const { signUpWithCredentials, signInWithCredentials } = useAuth();

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const result = await signUpWithCredentials({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        callbackUrl: "/",
        redirect: false,
      });

      if (result?.url) {
        // Auto sign-in after successful account creation
        try {
          await signInWithCredentials({
            email: formData.email,
            password: formData.password,
            callbackUrl: "/",
            redirect: false,
          });
        } catch {
          // If auto sign-in fails, redirect anyway — user can sign in manually
        }
        window.location.href = result.url;
        return;
      }

      if (!result || result.error) {
        throw new Error(result?.error || "CredentialsSignin");
      }
    } catch (err) {
      const msg = err?.message || "";
      const errorMessages = {
        CredentialsSignin:
          "That email is already taken or the account could not be created. Please try again.",
        UserExists:
          "An account already exists with this email. Please sign in instead.",
        InvalidEmail: "Please enter a valid email address.",
        PasswordTooShort: "Password must be at least 8 characters long.",
        Configuration:
          "Account creation isn't working right now. Please try again later.",
        DatabaseUnavailable:
          "Our service is temporarily unavailable. Please try again in a moment.",
      };

      setError(
        errorMessages[msg] ||
          "Something went wrong while creating your account. Please try again."
      );
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] p-4 text-white">
      <form
        noValidate
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-[#1a1a1a] p-8 shadow-2xl border border-white/5"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 mb-4">
            <svg
              className="h-6 w-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-gray-400 mt-2">Join and start creating</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">
              Full Name
            </label>
            <input
              required
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg bg-[#2a2a2a] border border-white/10 px-4 py-3 text-white outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">
              Email
            </label>
            <input
              required
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg bg-[#2a2a2a] border border-white/10 px-4 py-3 text-white outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">
              Password
            </label>
            <div className="relative">
              <input
                required
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-[#2a2a2a] border border-white/10 px-4 py-3 pr-12 text-white outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-red-600 px-4 py-3 text-base font-semibold text-white transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <a
              href="/account/signin"
              className="text-red-500 hover:text-red-400 font-medium"
            >
              Sign in
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}

export default MainComponent;
