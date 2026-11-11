import { useState } from "react";
import { api } from "../api";

export default function ProfilePanel({ token, user, onProfileUpdated }) {
  const [interests, setInterests] = useState(user.interests || []);
  const [newInterest, setNewInterest] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function addInterest() {
    setError("");
    setMessage("");
    const interest = newInterest.trim().toLowerCase();
    if (!interest) return;
    if (interest.length > 40) {
      setError("Each interest must be 40 characters or less.");
      return;
    }
    if (interests.includes(interest)) {
      setError("That interest is already in your profile.");
      return;
    }
    if (interests.length >= 20) {
      setError("You can add up to 20 interests.");
      return;
    }
    setInterests((previous) => [...previous, interest]);
    setNewInterest("");
  }

  function removeInterest(interest) {
    setInterests((previous) => previous.filter((value) => value !== interest));
    setError("");
    setMessage("");
  }

  async function saveInterests(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/api/auth/me/interests", {
        method: "PATCH",
        token,
        body: { interests },
      });
      setInterests(result.user.interests);
      onProfileUpdated(result.user);
      setMessage("Your interests have been saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>My Profile</h2>
      <div className="card">
        <h3>Account information</h3>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p className="muted">You can manage your own interests below. Your role and other account details cannot be changed here.</p>
      </div>
      <div className="card">
        <h3>My interests</h3>
        <p className="muted">Add up to 20 interests, maximum 40 characters each. These values are used by the Admin interests aggregation.</p>
        <form onSubmit={saveInterests}>
          <div className="actions">
            <input
              aria-label="New interest"
              placeholder="e.g. coding, chess, robotics"
              maxLength={40}
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addInterest();
                }
              }}
              style={{ flex: "1 1 220px", width: "auto" }}
            />
            <button type="button" className="secondary" onClick={addInterest}>Add interest</button>
          </div>
          <div className="interest-tags" aria-label="Current interests">
            {interests.map((interest) => (
              <span className="interest-tag" key={interest}>
                {interest}
                <button
                  type="button"
                  className="remove-interest"
                  aria-label={`Remove ${interest}`}
                  onClick={() => removeInterest(interest)}
                >×</button>
              </span>
            ))}
          </div>
          {interests.length === 0 && <p className="muted">No interests added yet.</p>}
          {error && <p className="error" role="alert">{error}</p>}
          {message && <p className="success" role="status">{message}</p>}
          <button type="submit" disabled={busy}>{busy ? "Saving..." : "Save interests"}</button>
        </form>
      </div>
    </section>
  );
}
