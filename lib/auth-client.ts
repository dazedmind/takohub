export const authClient = {
  async getSession() {
    try {
      const response = await fetch("/api/auth/session");
      if (!response.ok) {
        return { data: null };
      }
      const data = await response.json();
      return { data: data.session ? { user: data.session.user } : null };
    } catch {
      return { data: null };
    }
  },
  async signOut() {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } catch (err) {
      console.error("Sign out request failed:", err);
    }
  }
};