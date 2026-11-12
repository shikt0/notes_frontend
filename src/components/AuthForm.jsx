import { useState } from "react";
import { api } from "../api";

const testAdminEmail = import.meta.env.VITE_TEST_ADMIN_EMAIL;
const testAdminPassword = import.meta.env.VITE_TEST_ADMIN_PASSWORD;

export default function AuthForm({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", interests: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (field, value) => setForm((old) => ({ ...old, [field]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (mode === "register") {
        const interests = [...new Set(form.interests.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))];
        if (interests.length > 20 || interests.some((item) => item.length > 40)) {
          throw new Error("Enter up to 20 interests, each at most 40 characters.");
        }
        await api("/api/auth/register", {
          method: "POST",
          body: {
            name: form.name,
            email: form.email,
            password: form.password,
            interests,
          },
        });
        setMode("login");
        setForm((old) => ({ ...old, password: "" }));
        setMessage("Account created. Please log in.");
      } else {
        const data = await api("/api/auth/login", {
          method: "POST",
          body: { email: form.email, password: form.password },
        });
        onLogin({ token: data.token, user: data.user });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth card">
      <h1>{mode === "login" ? "Log in" : "Create account"}</h1>
      <p className="muted">Secure Notes — Care Guide BD assessment</p>
      {mode === "login" && testAdminEmail && testAdminPassword && (
        <aside className="test-admin" aria-label="Test admin credentials">
          <h2>Test admin</h2>
          <p>Email: <code>{testAdminEmail}</code></p>
          <p>Password: <code>{testAdminPassword}</code></p>
          <button type="button" className="secondary" disabled={busy} onClick={() => {
            setForm((old) => ({ ...old, email: testAdminEmail, password: testAdminPassword }));
            setError("");
            setMessage("");
          }}>
            Use test admin
          </button>
        </aside>
      )}
      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <label>Name
            <input required minLength={2} maxLength={80} value={form.name}
              onChange={(e) => update("name", e.target.value)} />
          </label>
        )}
        <label>Email
          <input required type="email" maxLength={254} autoComplete="email" value={form.email}
            onChange={(e) => update("email", e.target.value)} />
        </label>
        <label>Password
          <input required type="password" minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={form.password} onChange={(e) => update("password", e.target.value)} />
        </label>
        {mode === "register" && (
          <label>Interests (optional, comma-separated)
            <input value={form.interests}
              onChange={(e) => update("interests", e.target.value)}
              placeholder="coding, chess, robotics" />
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        {message && <p className="success" role="status">{message}</p>}
        <button disabled={busy} type="submit">
          {busy ? "Please wait..." : mode === "login" ? "Log in" : "Register"}
        </button>
      </form>
      <button type="button" className="link-button" onClick={() => {
        setMode(mode === "login" ? "register" : "login");
        setError("");
        setMessage("");
        setForm((old) => ({ ...old, password: "" }));
      }}>
        {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
      </button>
    </section>
  );
}
