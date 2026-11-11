import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

const emptyForm = { name: "", email: "", password: "", interests: "" };

export default function AdminPanel({ token }) {
  const [users, setUsers] = useState([]);
  const [userCursor, setUserCursor] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteCursor, setNoteCursor] = useState(null);
  const [groups, setGroups] = useState([]);
  const [interestUsersLoading, setInterestUsersLoading] = useState(null);
  const [interestPage, setInterestPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async (reset = true, after = null) => {
    const suffix = after ? `&after=${encodeURIComponent(after)}` : "";
    const data = await api(`/api/admin/users?limit=10${suffix}`, { token });
    setUsers((old) => reset ? data.users : [...old, ...data.users]);
    setUserCursor(data.pagination.nextCursor);
  }, [token]);

  const loadNotes = useCallback(async (reset = true, after = null) => {
    const suffix = after ? `&after=${encodeURIComponent(after)}` : "";
    const data = await api(`/api/admin/notes?limit=10${suffix}`, { token });
    setNotes((old) => reset ? data.notes : [...old, ...data.notes]);
    setNoteCursor(data.pagination.nextCursor);
  }, [token]);

  const loadInterests = useCallback(async (page = 1) => {
    const data = await api(`/api/admin/interests?page=${page}&limit=10`, { token });
    setGroups(data.groups);
    setInterestPage(data.pagination.page);
    setTotalPages(data.pagination.totalPages);
  }, [token]);

  async function loadMoreInterestUsers(group) {
    if (interestUsersLoading !== null || !group.usersPagination.nextCursor) return;
    setError("");
    setInterestUsersLoading(group.interest);
    try {
      const data = await api(`/api/admin/interests?interest=${encodeURIComponent(group.interest)}&usersAfter=${encodeURIComponent(group.usersPagination.nextCursor)}&usersLimit=10`, { token });
      const nextGroup = data.groups.find((item) => item.interest === group.interest);
      setGroups((old) => old.map((item) => (
        item.interest === group.interest && item.usersPagination.nextCursor === group.usersPagination.nextCursor
          ? {
              ...item,
              users: [...item.users, ...(nextGroup?.users ?? [])],
              usersPagination: nextGroup?.usersPagination ?? { ...item.usersPagination, hasMore: false, nextCursor: null },
            }
          : item
      )));
    } catch (err) {
      setError(err.message);
    } finally {
      setInterestUsersLoading(null);
    }
  }

  useEffect(() => {
    Promise.all([loadUsers(), loadNotes(), loadInterests()])
      .catch((err) => setError(err.message));
  }, [loadUsers, loadNotes, loadInterests]);

  const update = (field, value) => setForm((old) => ({ ...old, [field]: value }));

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveUser(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const body = {
        name: form.name,
        email: form.email,
        interests: form.interests.split(",").map((x) => x.trim()).filter(Boolean),
        ...(!editingId ? { password: form.password } : {}),
      };
      await api(editingId ? `/api/admin/users/${editingId}` : "/api/admin/users", {
        method: editingId ? "PUT" : "POST",
        token,
        body,
      });
      setMessage(editingId ? "User updated" : "User created");
      resetForm();
      await Promise.all([loadUsers(), loadInterests()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function editUser(user) {
    setEditingId(user._id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      interests: (user.interests || []).join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.name} and their notes/posts?`)) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${user._id}`, { method: "DELETE", token });
      setMessage("User and related records deleted");
      await Promise.all([loadUsers(), loadNotes(), loadInterests()]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <h2>Admin Dashboard</h2>
      <p className="muted">Admin-only operations. Permissions are enforced by Express, not by this screen.</p>
      <div className="card">
        <h3>{editingId ? "Edit normal user" : "Create a normal user"}</h3>
        <form onSubmit={saveUser}>
          <label>Name<input required minLength={2} maxLength={80} value={form.name} onChange={(e) => update("name", e.target.value)} /></label>
          <label>Email<input required type="email" maxLength={254} value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
          {!editingId && <label>Initial password<input required type="password" minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} /></label>}
          <label>Interests (comma-separated)<input value={form.interests} onChange={(e) => update("interests", e.target.value)} placeholder="coding, reading" /></label>
          <div className="actions">
            <button disabled={busy} type="submit">{editingId ? "Update user" : "Create user"}</button>
            {editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {message && <p role="status" className="success">{message}</p>}

      <div className="card">
        <h3>Registered users</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>{users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td><td>{user.email}</td><td>{user.role}</td>
                <td>{user.role === "user" ? (
                  <div className="actions">
                    <button className="secondary" onClick={() => editUser(user)}>Edit</button>
                    <button className="danger" onClick={() => deleteUser(user)}>Delete</button>
                  </div>
                ) : "Protected"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {userCursor && <button className="secondary" onClick={() => loadUsers(false, userCursor).catch((err) => setError(err.message))}>Load more users</button>}
      </div>

      <div className="card">
        <h3>All users' notes (Admin only)</h3>
        {notes.map((note) => (
          <div className="list-row" key={note._id}>
            <strong>{note.title}</strong>
            <p className="pre-wrap">{note.content}</p>
            <small className="muted">Owner ID: {note.owner}</small>
          </div>
        ))}
        {notes.length === 0 && <p className="muted">No notes found.</p>}
        {noteCursor && <button className="secondary" onClick={() => loadNotes(false, noteCursor).catch((err) => setError(err.message))}>Load more notes</button>}
      </div>

      <div className="card">
        <h3>Grouped interests — one aggregation call</h3>
        {groups.map((group) => (
          <div className="list-row" key={group.interest}>
            <strong>{group.interest} ({group.userCount})</strong>
            <p>{group.users.map((user) => user.name).join(", ")}</p>
            {group.usersPagination?.nextCursor && <button className="secondary" disabled={interestUsersLoading !== null} onClick={() => loadMoreInterestUsers(group)}>Load more users</button>}
          </div>
        ))}
        {groups.length === 0 && <p className="muted">No interests found.</p>}
        <div className="actions">
          <button className="secondary" disabled={interestPage <= 1} onClick={() => loadInterests(interestPage - 1).catch((err) => setError(err.message))}>Previous</button>
          <span>Page {interestPage} / {Math.max(totalPages, 1)}</span>
          <button className="secondary" disabled={interestPage >= totalPages} onClick={() => loadInterests(interestPage + 1).catch((err) => setError(err.message))}>Next</button>
        </div>
      </div>
    </section>
  );
}
