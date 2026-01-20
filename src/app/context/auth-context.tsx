import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@utils/supabase/client";
import { projectId, publicAnonKey } from "@utils/supabase/info";

interface User {
  id: string;
  email: string;
  name: string;
}

interface Session {
  access_token: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  session: Session | null;
  connectedAccounts: string[];
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  setConnectedAccounts: (accounts: string[]) => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        console.log("🔍 Checking for session...");
        console.log("Current URL:", window.location.href);
        console.log("URL Hash:", window.location.hash);
        console.log("URL Search params:", window.location.search);

        // Check if we have error or access_token in URL
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1),
        );
        const searchParams = new URLSearchParams(window.location.search);

        console.log("Hash params:", {
          access_token: hashParams.get("access_token") ? "Present" : "None",
          error: hashParams.get("error"),
          error_description: hashParams.get("error_description"),
        });

        console.log("Search params:", {
          code: searchParams.get("code") ? "Present" : "None",
          error: searchParams.get("error"),
          error_description: searchParams.get("error_description"),
        });

        // First, let Supabase handle any OAuth callback in the URL
        const {
          data: { session: urlSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log(
          "📡 Supabase getSession result:",
          urlSession ? "Session found!" : "No session",
        );
        if (sessionError) {
          console.error("❌ Session error:", sessionError);
        }

        if (urlSession) {
          console.log("✅ Found session from URL/OAuth callback");
          console.log("User:", urlSession.user.email);
          console.log(
            "Name:",
            urlSession.user.user_metadata?.name,
            urlSession.user.user_metadata?.full_name,
          );

          // IMPORTANT: Use the Supabase access_token, NOT the provider_token
          // The provider_token is from Google and won't work with our backend
          const token = urlSession.access_token;
          console.log("💾 Storing Supabase session token (not provider token)");
          localStorage.setItem("access_token", token);

          setUser({
            id: urlSession.user.id,
            email: urlSession.user.email ?? "",
            name:
              urlSession.user.user_metadata?.name ??
              urlSession.user.user_metadata?.full_name ??
              "",
          });
          setAccessToken(token);
          setSession({ access_token: token });

          // Fetch connected accounts
          try {
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/server/make-server-a8139b1c/connected-accounts`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (response.ok) {
              const data = await response.json();
              setConnectedAccounts(data.connectedAccounts || []);
            }
          } catch (err) {
            console.log("Failed to fetch connected accounts:", err);
          }

          // Clean up URL hash
          if (window.location.hash) {
            console.log("🧹 Cleaning up URL hash");
            window.history.replaceState(null, "", window.location.pathname);
          }

          setLoading(false);
          return;
        }

        // If no URL session, check localStorage
        const token = localStorage.getItem("access_token");
        console.log("=== Auth Context Session Check ===");
        console.log(
          "Token from localStorage:",
          token ? "Found (length: " + token.length + ")" : "Not found",
        );

        if (token) {
          // Validate token with Supabase
          console.log("Validating token with Supabase...");
          const { data, error } = await supabase.auth.getUser(token);

          if (data.user && !error) {
            console.log("Token validated successfully for user:", data.user.id);
            setUser({
              id: data.user.id,
              email: data.user.email ?? "",
              name: data.user.user_metadata?.name ?? "",
            });
            setAccessToken(token);
            setSession({ access_token: token });

            // Fetch connected accounts (don't fail if backend is unavailable)
            try {
              const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/server/make-server-a8139b1c/connected-accounts`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );

              if (response.ok) {
                const data = await response.json();
                setConnectedAccounts(data.connectedAccounts || []);
              } else {
                console.log(
                  "Connected accounts endpoint returned:",
                  response.status,
                );
              }
            } catch (err) {
              console.log(
                "Connected accounts fetch failed (backend may not be ready):",
                err,
              );
              // Don't fail authentication if backend isn't ready
            }
          } else {
            console.log("Token validation failed:", error?.message);
            localStorage.removeItem("access_token");
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for OAuth callback
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔔 Auth state change:", event);
        console.log("Session:", session ? "Present" : "None");

        if (event === "SIGNED_IN" && session) {
          console.log("✅ User signed in via OAuth!");
          const token = session.access_token;
          localStorage.setItem("access_token", token);

          setUser({
            id: session.user.id,
            email: session.user.email ?? "",
            name:
              session.user.user_metadata?.name ??
              session.user.user_metadata?.full_name ??
              "",
          });
          setAccessToken(token);
          setSession({ access_token: token });

          // Fetch connected accounts
          try {
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/server/make-server-a8139b1c/connected-accounts`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (response.ok) {
              const data = await response.json();
              setConnectedAccounts(data.connectedAccounts || []);
            }
          } catch (err) {
            console.log("Failed to fetch connected accounts:", err);
          }

          setLoading(false);

          // Clean up URL hash
          if (window.location.hash) {
            console.log("🧹 Cleaning up URL hash");
            window.history.replaceState(null, "", window.location.pathname);
          }
        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem("access_token");
          setUser(null);
          setAccessToken(null);
          setSession(null);
          setConnectedAccounts([]);
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session && data.user) {
        const token = data.session.access_token;
        localStorage.setItem("access_token", token);

        setUser({
          id: data.user.id,
          email: data.user.email ?? "",
          name: data.user.user_metadata?.name ?? "",
        });
        setAccessToken(token);
        setSession({ access_token: token });

        // Fetch connected accounts
        try {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/server/make-server-a8139b1c/connected-accounts`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (response.ok) {
            const data = await response.json();
            setConnectedAccounts(data.connectedAccounts || []);
          }
        } catch (err) {
          console.error("Failed to fetch connected accounts:", err);
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/make-server-a8139b1c/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ name, email, password }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Signup failed");
      }

      const data = await response.json();

      // Check if we got a session from the signup
      if (data.session) {
        const token = data.session.access_token;
        localStorage.setItem("access_token", token);

        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name ?? name,
        });
        setAccessToken(token);
        setSession({ access_token: token });
        setConnectedAccounts([]);
      } else {
        // Fallback: sign in manually if session wasn't returned
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) {
          throw new Error(
            "User created but sign-in failed. Please log in manually.",
          );
        }

        if (signInData.session && signInData.user) {
          const token = signInData.session.access_token;
          localStorage.setItem("access_token", token);

          setUser({
            id: signInData.user.id,
            email: signInData.user.email ?? "",
            name: signInData.user.user_metadata?.name ?? name,
          });
          setAccessToken(token);
          setSession({ access_token: token });
          setConnectedAccounts([]);
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("access_token");
      localStorage.removeItem("onboarding_completed"); // Clear onboarding flag on logout
      setUser(null);
      setAccessToken(null);
      setSession(null);
      setConnectedAccounts([]);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log("🔐 Initiating Google OAuth...");
      console.log("Current origin:", window.location.origin);
      console.log("Full URL:", window.location.href);

      // signInWithOAuth redirects to Google and back
      // The session will be handled by onAuthStateChange listener
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error("❌ OAuth initiation error:", error);
        throw new Error(error.message);
      }

      console.log("✅ OAuth redirect initiated");

      // Don't set user/session here - it will be set by onAuthStateChange after redirect
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      throw error;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      return { ...prevUser, ...userData };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessToken,
        session,
        connectedAccounts,
        login,
        signup,
        logout,
        signInWithGoogle,
        setConnectedAccounts,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  // Return null during hot reload instead of throwing
  // The component will handle the null case
  return context;
}
