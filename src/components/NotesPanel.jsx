import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export default function NotesPanel({ token }) {
  const [notes, setNotes] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadNotes = useCallback(async (reset = true, next = null) => {
    const query = next ? `&after=${encodeURIComponent(next)}` : "";
    const data = await api(`/api/notes?limit=10${query}`, { token });
    setNotes((old) => reset ? data.notes : [...old, ...data.notes]);
    setCursor(data.pagination.nextCursor);
  }, [token]);

  useEffect(() => {
    loadNotes().catch((err) => setError(err.message));
  }, [loadNotes]);

  function clearForm() {
    setTitle("");
    setContent("");
    setEditingId(null);
  }

  async function saveNote(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api(editingId ? `/api/notes/${editingId}` : "/api/notes", {
        method: editingId ? "PUT" : "POST",
        token,
        body: { title, content },
      });
      clearForm();
      await loadNotes();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeNote(id) {
    if (!window.confirm("Delete this note permanently?")) return;
    setError("");
    try {
      await api(`/api/notes/${id}`, { method: "DELETE", token });
      if (editingId === id) clearForm();
      await loadNotes();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <h2>My Private Notes</h2>
      <div className="card">
        <h3>{editingId ? "Edit note" : "New note"}</h3>
        <form onSubmit={saveNote}>
          <label>Title
            <input required maxLength={120} value={title}
              onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>Content
            <textarea required maxLength={5000} rows={4} value={content}
              onChange={(e) => setContent(e.target.value)} />
          </label>
          <div className="actions">
            <button disabled={busy} type="submit">{editingId ? "Save changes" : "Create note"}</button>
            {editingId && <button type="button" className="secondary" onClick={clearForm}>Cancel</button>}
          </div>
        </form>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="cards">
        {notes.map((note) => (
          <article className="card" key={note._id}>
            <h3>{note.title}</h3>
            <p className="pre-wrap">{note.content}</p>
            <div className="actions">
              <button className="secondary" onClick={() => {
                setEditingId(note._id);
                setTitle(note.title);
                setContent(note.content);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}>Edit</button>
              <button className="danger" onClick={() => removeNote(note._id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
      {notes.length === 0 && <p className="muted">No notes yet. Create your first note above.</p>}
      {cursor && <button className="secondary" onClick={() => {
        loadNotes(false, cursor).catch((err) => setError(err.message));
      }}>Load more notes</button>}
    </section>
  );
}
