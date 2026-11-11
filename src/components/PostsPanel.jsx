import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export default function PostsPanel({ token, user }) {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [myPosts, setMyPosts] = useState(null);
  const [myPostsCursor, setMyPostsCursor] = useState(null);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPosts = useCallback(async (reset = true, after = null) => {
    const suffix = after ? `&after=${encodeURIComponent(after)}` : "";
    const data = await api(`/api/posts?limit=10${suffix}`);
    setPosts((old) => reset ? data.posts : [...old, ...data.posts]);
    setCursor(data.pagination.nextCursor);
  }, []);

  useEffect(() => {
    loadPosts().catch((err) => setError(err.message));
  }, [loadPosts]);

  async function createPost(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/posts", { method: "POST", token, body: { title, content } });
      setTitle("");
      setContent("");
      setMyPosts(null);
      setMyPostsCursor(null);
      await loadPosts();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function viewMyPosts(reset = true, after = null) {
    if (myPostsLoading) return;
    setError("");
    setMyPostsLoading(true);
    try {
      const suffix = after ? `&after=${encodeURIComponent(after)}` : "";
      const result = await api(`/api/users/${user.id}/posts?limit=10${suffix}`);
      setMyPosts((old) => reset ? result.posts : [...(old ?? []), ...result.posts]);
      setMyPostsCursor(result.pagination.nextCursor);
    } catch (err) {
      setError(err.message);
    } finally {
      setMyPostsLoading(false);
    }
  }

  return (
    <section>
      <h2>Public Posts</h2>
      {token && <div className="card">
        <h3>Create a public post</h3>
        <form onSubmit={createPost}>
          <label>Title<input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label>Content<textarea required maxLength={5000} rows={3} value={content} onChange={(e) => setContent(e.target.value)} /></label>
          <button disabled={busy} type="submit">Publish post</button>
        </form>
      </div>}
      {error && <p className="error" role="alert">{error}</p>}
      {user && <div className="actions"><button className="secondary" disabled={myPostsLoading} onClick={() => viewMyPosts()}>View my posts via $lookup</button></div>}
      {myPosts && (
        <div className="card">
          <h3>My posts from the aggregation endpoint</h3>
          {myPosts.length ? myPosts.map((p) => <p key={p._id}>{p.title}</p>) : <p>No posts found.</p>}
          {myPostsCursor && <button className="secondary" disabled={myPostsLoading} onClick={() => viewMyPosts(false, myPostsCursor)}>Load more of my posts</button>}
        </div>
      )}
      <h3>Latest public posts</h3>
      <div className="cards">
        {posts.map((post) => (
          <article className="card" key={post._id}>
            <h3>{post.title}</h3>
            <p className="pre-wrap">{post.content}</p>
          </article>
        ))}
      </div>
      {posts.length === 0 && <p className="muted">No public posts yet.</p>}
      {cursor && <button className="secondary" onClick={() => loadPosts(false, cursor).catch((e) => setError(e.message))}>Load more posts</button>}
    </section>
  );
}
