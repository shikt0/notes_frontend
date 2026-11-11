import { useEffect, useState } from "react";
import { api } from "./api";
import AuthForm from "./components/AuthForm";
import NotesPanel from "./components/NotesPanel";
import AdminPanel from "./components/AdminPanel";
import PostsPanel from "./components/PostsPanel";
import ProfilePanel from "./components/ProfilePanel";

const TOKEN_KEY = "secure-notes-token";

function getSavedToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {

  }
}

export default function App() {
  const [token, setToken] = useState(getSavedToken);
  const [session, setSession] = useState(null);
  const [restoreError, setRestoreError] = useState("");
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [tab, setTab] = useState("notes");

  useEffect(() => {
    if (!token || session) return;
    let active = true;

    api("/api/auth/me", { token })
      .then(({ user }) => {
        if (active) {
          setSession({ token, user: { ...user, id: user.id ?? user._id } });
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) {
          saveToken(null);
          setToken(null);
        } else {
          setRestoreError(error.message);
        }
      });

    return () => { active = false; };
  }, [token, session, restoreAttempt]);

  function logOut() {
    saveToken(null);
    setToken(null);
    setSession(null);
    setRestoreError("");
    setTab("notes");
  }

  if (token && !session) {
    return (
      <main className="container">
        {restoreError ? (
          <section className="card">
            <p className="error" role="alert">Unable to restore your session: {restoreError}</p>
            <div className="actions">
              <button onClick={() => {
                setRestoreError("");
                setRestoreAttempt((attempt) => attempt + 1);
              }}>Retry</button>
              <button className="secondary" onClick={logOut}>Back to login</button>
            </div>
          </section>
        ) : <p role="status">Restoring your session...</p>}
      </main>
    );
  }

  if (!session) {
    return (
      <main className="container">
        <AuthForm onLogin={(data) => {
          saveToken(data.token);
          setToken(data.token);
          setSession(data);
          setRestoreError("");
          setTab("notes");
        }} />
        <PostsPanel />
      </main>
    );
  }

  const { user } = session;

  return (
    <div className="container">
      <header className="topbar">
        <div><h1>Secure Notes</h1><p className="muted">Logged in as {user.name} ({user.role})</p></div>
        <button className="secondary" onClick={logOut}>Log out</button>
      </header>
      <nav className="tabs" aria-label="Main navigation">
        <button className={tab === "notes" ? "active" : "secondary"} onClick={() => setTab("notes")}>My Notes</button>
        <button className={tab === "profile" ? "active" : "secondary"} onClick={() => setTab("profile")}>My Profile</button>
        <button className={tab === "posts" ? "active" : "secondary"} onClick={() => setTab("posts")}>Public Posts</button>
        {user.role === "admin" && <button className={tab === "admin" ? "active" : "secondary"} onClick={() => setTab("admin")}>Admin</button>}
      </nav>
      {tab === "notes" && <NotesPanel token={token} />}
      {tab === "profile" && (
        <ProfilePanel
          token={token}
          user={user}
          onProfileUpdated={(updatedUser) => setSession((old) => ({ ...old, user: updatedUser }))}
        />
      )}
      {tab === "posts" && <PostsPanel token={token} user={user} />}
      {tab === "admin" && user.role === "admin" && <AdminPanel token={token} />}
      <footer><p className="muted">Assessment demo</p></footer>
    </div>
  );
}
