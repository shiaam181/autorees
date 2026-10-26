import { useCallback } from 'react';
import { signIn, signOut } from "@auth/create/react";

function isDevIframe() {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch { return true; }
}

function devSocialShim(provider, callbackUrl) {
  const params = new URLSearchParams({ provider });
  if (callbackUrl) params.set('callbackUrl', callbackUrl);
  window.location.href = '/__create/social-dev-shim?' + params;
}

async function submitCredentials(provider, payload = {}) {
  const callbackUrl = payload.callbackUrl || '/';
  const csrfRes = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  const csrfData = await csrfRes.json().catch(() => ({}));
  const csrfToken = csrfData.csrfToken || '';

  const res = await fetch(`/api/auth/callback/${provider}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({
      ...payload,
      callbackUrl,
      csrfToken,
    }),
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (data.url) {
    return { url: data.url, error: undefined };
  }

  if (data.error) {
    throw new Error(data.error);
  }

  if (!res.ok) {
    throw new Error('CredentialsSignin');
  }

  return { url: callbackUrl, error: undefined };
}

function useAuth() {
  const callbackUrl = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('callbackUrl')
    : null;

  const signInWithCredentials = useCallback(async (options = {}) => {
    try {
      const payload = {
        ...options,
        callbackUrl: callbackUrl ?? options.callbackUrl ?? '/',
      };
      const result = await submitCredentials('credentials-signin', payload);
      return result;
    } catch (error) {
      throw error;
    }
  }, [callbackUrl]);

  const signUpWithCredentials = useCallback(async (options = {}) => {
    try {
      const payload = {
        ...options,
        callbackUrl: callbackUrl ?? options.callbackUrl ?? '/',
      };
      const result = await submitCredentials('credentials-signup', payload);
      return result;
    } catch (error) {
      throw error;
    }
  }, [callbackUrl]);

  const signInWithGoogle = useCallback((options) => {
    const cb = callbackUrl ?? options?.callbackUrl;
    if (isDevIframe()) return devSocialShim("google", cb);
    return signIn("google", { ...options, callbackUrl: cb });
  }, [callbackUrl]);
  const signInWithFacebook = useCallback((options) => {
    const cb = options?.callbackUrl;
    if (isDevIframe()) return devSocialShim("facebook", cb);
    return signIn("facebook", options);
  }, []);
  const signInWithTwitter = useCallback((options) => {
    const cb = options?.callbackUrl;
    if (isDevIframe()) return devSocialShim("twitter", cb);
    return signIn("twitter", options);
  }, []);
  const signInWithApple = useCallback((options) => {
    const cb = callbackUrl ?? options?.callbackUrl;
    if (isDevIframe()) return devSocialShim("apple", cb);
    return signIn("apple", { ...options, callbackUrl: cb });
  }, [callbackUrl]);

  return {
    signInWithCredentials,
    signUpWithCredentials,
    signInWithGoogle,
    signInWithFacebook,
    signInWithTwitter,
    signInWithApple,
    signOut,
  }
}

export default useAuth;