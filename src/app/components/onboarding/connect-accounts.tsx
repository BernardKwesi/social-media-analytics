import { useState, useEffect } from "react";
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Music,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { projectId, publicAnonKey } from "@utils/supabase/info";
import { useAuth } from "../../context/auth-context";
import { supabase } from "@utils/supabase/client";

interface ConnectAccountsProps {
  onComplete: (connectedAccounts: string[]) => void;
}

interface SocialAccount {
  id: string;
  name: string;
  icon: typeof Instagram;
  color: string;
  connected: boolean;
  loading: boolean;
  username?: string;
}

export function ConnectAccounts({ onComplete }: ConnectAccountsProps) {
  const { accessToken, logout } = useAuth();
  const [accounts, setAccounts] = useState<SocialAccount[]>([
    {
      id: "instagram",
      name: "Instagram",
      icon: Instagram,
      color: "#E4405F",
      connected: false,
      loading: false,
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: Facebook,
      color: "#1877F2",
      connected: false,
      loading: false,
    },
    {
      id: "twitter",
      name: "X (Twitter)",
      icon: Twitter,
      color: "#000000",
      connected: false,
      loading: false,
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: Linkedin,
      color: "#0A66C2",
      connected: false,
      loading: false,
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: Music,
      color: "#000000",
      connected: false,
      loading: false,
    },
  ]);

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Load current OAuth status when accessToken is available
    if (accessToken) {
      // Test auth first to verify JWT
      testAuth(accessToken);
      loadOAuthStatus(accessToken);
    }
  }, [accessToken]);

  const testAuth = async (token: string) => {
    try {
      console.log("=== Testing Auth ===");
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/test-auth`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: publicAnonKey,
          },
        },
      );

      console.log("Test auth response status:", response.status);
      const data = await response.json();
      console.log("Test auth response:", data);

      // If test auth fails, try to refresh the session
      if (!response.ok) {
        console.warn("⚠️ Test auth failed, attempting to refresh session...");
        await refreshSession();
      }
    } catch (error) {
      console.error("Test auth error:", error);
    }
  };

  const refreshSession = async () => {
    try {
      console.log("🔄 Refreshing Supabase session...");
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error("❌ Session refresh failed:", error);
        return;
      }

      if (session?.access_token) {
        console.log("✅ Session refreshed successfully!");
        localStorage.setItem("access_token", session.access_token);
        window.location.reload(); // Reload to update the auth context
      }
    } catch (err) {
      console.error("❌ Failed to refresh session:", err);
    }
  };

  const loadOAuthStatus = async (token: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/oauth/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: publicAnonKey,
          },
        },
      );

      if (response.ok) {
        const { status } = await response.json();
        setAccounts((prev) =>
          prev.map((acc) => ({
            ...acc,
            connected: status[acc.id]?.connected || false,
            username: status[acc.id]?.username,
          })),
        );
      } else {
        console.log("OAuth status endpoint returned:", response.status);
      }
    } catch (error) {
      console.log(
        "OAuth status fetch failed (backend may not be ready):",
        error,
      );
      // Don't fail the UI if backend isn't ready yet
    }
  };

  const handleConnect = async (accountId: string) => {
    if (!accessToken) {
      alert("Please log in first");
      return;
    }

    console.log("=== OAuth Initiation Debug ===");
    console.log("Account ID:", accountId);
    console.log("Access Token length:", accessToken.length);
    console.log("Access Token preview:", accessToken.substring(0, 30) + "...");

    // Verify token is still valid before attempting OAuth
    console.log("🔍 Verifying token is still valid...");
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(accessToken);
      if (error || !user) {
        console.error("❌ Token is invalid or expired:", error);
        alert(
          "Your session has expired. Please refresh the page and log in again.",
        );
        return;
      }
      console.log("✅ Token is valid for user:", user.email);
    } catch (err) {
      console.error("❌ Token validation failed:", err);
      alert(
        "Your session has expired. Please refresh the page and log in again.",
      );
      return;
    }

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, loading: true } : acc,
      ),
    );

    try {
      // Request OAuth URL from backend
      const url = `https://${projectId}.supabase.co/functions/v1/server/oauth/${accountId}/initiate`;
      console.log("OAuth initiation URL:", url);
      console.log("Sending request with Authorization header...");

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: publicAnonKey,
        },
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OAuth initiation failed for ${accountId}:`, errorText);

        let error;
        try {
          error = JSON.parse(errorText);
        } catch (e) {
          error = { error: errorText };
        }

        console.error("Parsed error:", error);
        throw new Error(error.error || "Failed to initiate OAuth");
      }

      const { authUrl, state } = await response.json();
      console.log("Received authUrl and state from backend");

      if (!authUrl) {
        throw new Error("No auth URL returned from server");
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        `${accountId}_oauth`,
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        if (
          event.data.type === "oauth-success" &&
          event.data.platform === accountId
        ) {
          setAccounts((prev) =>
            prev.map((acc) =>
              acc.id === accountId
                ? {
                    ...acc,
                    loading: false,
                    connected: true,
                    username: event.data.username,
                  }
                : acc,
            ),
          );
          window.removeEventListener("message", handleMessage);
        } else if (
          event.data.type === "oauth-error" &&
          event.data.platform === accountId
        ) {
          console.error(`OAuth error for ${accountId}:`, event.data.error);
          alert(`Failed to connect ${accountId}: ${event.data.error}`);
          setAccounts((prev) =>
            prev.map((acc) =>
              acc.id === accountId ? { ...acc, loading: false } : acc,
            ),
          );
          window.removeEventListener("message", handleMessage);
        }
      };

      window.addEventListener("message", handleMessage);

      // Check if popup was blocked
      if (!popup || popup.closed) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Poll for popup close (in case user closes it)
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setAccounts((prev) =>
            prev.map((acc) =>
              acc.id === accountId ? { ...acc, loading: false } : acc,
            ),
          );
          window.removeEventListener("message", handleMessage);
        }
      }, 500);
    } catch (error: any) {
      console.error("OAuth error:", error);

      // Show more specific error messages
      let errorMessage = error.message || `Failed to connect ${accountId}`;

      // Check if it's a configuration error
      if (errorMessage.includes("not configured")) {
        errorMessage = `${accountId.charAt(0).toUpperCase() + accountId.slice(1)} OAuth is not configured yet. Please set up the API credentials in the Supabase dashboard.`;
      }

      alert(errorMessage);
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === accountId ? { ...acc, loading: false } : acc,
        ),
      );
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/oauth/disconnect`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: publicAnonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ platform: accountId }),
        },
      );

      if (response.ok) {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === accountId
              ? {
                  ...acc,
                  connected: false,
                  username: undefined,
                }
              : acc,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
      alert(`Failed to disconnect ${accountId}`);
    }
  };

  const handleContinue = () => {
    const connectedAccountIds = accounts
      .filter((acc) => acc.connected)
      .map((acc) => acc.id);
    onComplete(connectedAccountIds);
  };

  const handleSkip = () => {
    onComplete([]);
  };

  const connectedCount = accounts.filter((acc) => acc.connected).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <Instagram className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Connect Your Social Accounts
          </h1>
          <p className="text-gray-600">
            Link your social media accounts to start tracking analytics
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Connected Accounts
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {connectedCount} / {accounts.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                At least 1 account required
              </p>
            </div>
          </div>

          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{
                width: `${(connectedCount / accounts.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Account Cards */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-4">
            {accounts.map((account) => {
              const Icon = account.icon;

              return (
                <div
                  key={account.id}
                  className={`border-2 rounded-xl p-6 transition-all ${
                    account.connected
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${account.color}15`,
                        }}
                      >
                        <Icon
                          className="w-6 h-6"
                          style={{ color: account.color }}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {account.name}
                        </h3>
                        {account.connected && account.username ? (
                          <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                            <Check className="w-4 h-4" />
                            Connected as {account.username}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">Not connected</p>
                        )}
                      </div>
                    </div>

                    <div>
                      {account.connected ? (
                        <button
                          onClick={() => handleDisconnect(account.id)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnect(account.id)}
                          disabled={account.loading}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                        >
                          {account.loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            "Connect"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Real OAuth Authentication
              </p>
              <p className="text-sm text-blue-700">
                Click "Connect" to authenticate with each platform. You'll be
                redirected to securely authorize access to your social media
                data.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={handleSkip}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Skip for Now
            </button>
            <button
              onClick={handleContinue}
              disabled={connectedCount === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
