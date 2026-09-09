import { useEffect, useMemo, useState } from "react";
import api, { getApiMessage, getAuthHeaders } from "./services/api";
import "./App.css";

const categories = ["Electronics", "Documents", "Clothing", "Accessories", "Other"];
const emptyListing = { type: "LOST", title: "", description: "", category: "Electronics", location: "", imageUrl: "", date: "" };
const emptyAuth = { name: "", email: "", password: "" };

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Date not set";
}

function initials(name = "") {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function EmptyState({ title, text, action }) {
  return <div className="empty-state"><span className="empty-icon">+</span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function ListingCard({ listing, onOpen }) {
  return <button type="button" className="listing-card" onClick={() => onOpen(listing)}>
    <div className="card-image">{listing.imageUrl ? <img src={listing.imageUrl} alt="" /> : <span>{listing.type === "LOST" ? "?" : "✓"}</span>}</div>
    <div className="card-copy"><div className="card-badges"><Badge tone={listing.type === "FOUND" ? "found" : "lost"}>{listing.type === "FOUND" ? "Found" : "Lost"}</Badge><Badge tone={listing.status === "Returned" ? "returned" : "pending"}>{listing.status}</Badge></div><h3>{listing.title}</h3><p>{listing.description}</p><div className="card-meta"><span>{listing.category}</span><span>{listing.location}</span><span>{formatDate(listing.date)}</span></div></div><span className="card-arrow" aria-hidden="true">↗</span>
  </button>;
}

function Field({ label, required = false, hint, children }) {
  return <label className="field"><span>{label}{required ? <em> *</em> : null}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

function App() {
  const [view, setView] = useState("home");
  const [authMode, setAuthMode] = useState(null);
  const [authForm, setAuthForm] = useState(emptyAuth);
  const [listingForm, setListingForm] = useState(emptyListing);
  const [editingId, setEditingId] = useState("");
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [filters, setFilters] = useState({ search: "", category: "", status: "", type: "" });
  const [token, setToken] = useState(localStorage.getItem("finditToken") || "");
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("finditUser") || "null"));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const headers = useMemo(() => getAuthHeaders(token), [token]);
  const stats = useMemo(() => ({
    lost: listings.filter((item) => item.type === "LOST").length,
    found: listings.filter((item) => item.type === "FOUND").length,
    returned: listings.filter((item) => item.status === "Returned").length,
    active: listings.filter((item) => item.status !== "Returned").length,
  }), [listings]);

  useEffect(() => {
    let active = true;
    const loadListings = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
        const response = await api.get(`/listings?${params.toString()}`);
        if (active) setListings(response.data);
      } catch (error) {
        if (active) setMessage({ type: "error", text: getApiMessage(error, "Unable to load reports.") });
      } finally { if (active) setLoading(false); }
    };
    loadListings();
    return () => { active = false; };
  }, [filters]);

  useEffect(() => {
    if (!token) return;
    api.get("/users/me/listings", { headers }).then((response) => setMyListings(response.data)).catch((error) => setMessage({ type: "error", text: getApiMessage(error, "Unable to load your reports.") }));
  }, [token, headers]);

  const go = (nextView) => { setView(nextView); setSelectedListing(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const requireAuth = (nextView) => { if (!token) setAuthMode("login"); else go(nextView); };
  const updateFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateListing = (event) => setListingForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submitAuth = async (event) => {
    event.preventDefault();
    if (authMode === "register" && authForm.name.trim().length < 2) { setMessage({ type: "error", text: "Please enter your full name." }); return; }
    if (authForm.password.length < 6) { setMessage({ type: "error", text: "Password must be at least 6 characters." }); return; }
    setSubmitting(true);
    try {
      const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
      const payload = authMode === "register" ? authForm : { email: authForm.email, password: authForm.password };
      const response = await api.post(endpoint, payload);
      setToken(response.data.token); setUser(response.data.user); localStorage.setItem("finditToken", response.data.token); localStorage.setItem("finditUser", JSON.stringify(response.data.user)); setAuthForm(emptyAuth); setAuthMode(null); setMessage({ type: "success", text: authMode === "register" ? "Your account is ready." : "Welcome back." });
    } catch (error) { setMessage({ type: "error", text: getApiMessage(error, "Authentication failed.") }); } finally { setSubmitting(false); }
  };

  const submitListing = async (event) => {
    event.preventDefault();
    if ([listingForm.title, listingForm.description, listingForm.location, listingForm.date].some((value) => !value.trim())) { setMessage({ type: "error", text: "Complete all required fields before submitting." }); return; }
    setSubmitting(true);
    try {
      const response = editingId ? await api.patch(`/listings/${editingId}`, listingForm, { headers }) : await api.post("/listings", listingForm, { headers });
      const update = (items) => editingId ? items.map((item) => item._id === editingId ? response.data : item) : [response.data, ...items];
      setListings(update); setMyListings(update); setListingForm(emptyListing); setEditingId(""); setMessage({ type: "success", text: editingId ? "Report updated." : "Report published to campus." }); go("activity");
    } catch (error) { setMessage({ type: "error", text: getApiMessage(error, "Unable to submit your report.") }); } finally { setSubmitting(false); }
  };

  const editListing = (listing) => { setListingForm({ type: listing.type, title: listing.title, description: listing.description, category: listing.category, location: listing.location, imageUrl: listing.imageUrl || "", date: listing.date ? new Date(listing.date).toISOString().slice(0, 10) : "" }); setEditingId(listing._id); go("report"); };
  const deleteListing = async (id) => { if (!window.confirm("Delete this report? This cannot be undone.")) return; try { await api.delete(`/listings/${id}`, { headers }); setListings((items) => items.filter((item) => item._id !== id)); setMyListings((items) => items.filter((item) => item._id !== id)); setMessage({ type: "success", text: "Report deleted." }); } catch (error) { setMessage({ type: "error", text: getApiMessage(error, "Unable to delete report.") }); } };
  const markReturned = async (id) => { try { const response = await api.patch(`/listings/${id}/status`, {}, { headers }); setListings((items) => items.map((item) => item._id === id ? response.data : item)); setMyListings((items) => items.map((item) => item._id === id ? response.data : item)); setMessage({ type: "success", text: "Report marked as returned." }); } catch (error) { setMessage({ type: "error", text: getApiMessage(error, "Unable to update report status.") }); } };
  const logout = () => { setToken(""); setUser(null); setMyListings([]); localStorage.removeItem("finditToken"); localStorage.removeItem("finditUser"); go("home"); setMessage({ type: "success", text: "You are signed out." }); };

  return <div className="app-shell">
    <header className="topbar"><button className="brand" type="button" onClick={() => go("home")}><span className="brand-mark">LF</span><span><strong>CampusFind</strong><small>Lost & found, together</small></span></button><nav aria-label="Primary navigation"><button className={view === "home" || view === "browse" ? "active" : ""} type="button" onClick={() => go("home")}>Discover</button><button className={view === "report" ? "active" : ""} type="button" onClick={() => requireAuth("report")}>Report an item</button><button className={view === "activity" ? "active" : ""} type="button" onClick={() => requireAuth("activity")}>My reports</button></nav><button className="account-button" type="button" onClick={() => token ? go("account") : setAuthMode("login")}>{token ? <span className="avatar">{initials(user?.name)}</span> : null}<span>{token ? user?.name?.split(" ")[0] : "Sign in"}</span></button></header>
    <main>
      {message ? <div className={`toast toast-${message.type}`} role="status"><span>{message.type === "error" ? "!" : "✓"}</span>{message.text}<button type="button" aria-label="Dismiss" onClick={() => setMessage(null)}>×</button></div> : null}
      {view === "home" || view === "browse" ? <>
        <section className="hero"><div className="hero-copy"><span className="eyebrow">A better way back to you</span><h1>Lost something<br /><mark>on campus?</mark></h1><p>Report it, find it, and help return it to its owner. Your campus community is looking out.</p><div className="hero-actions"><button className="button button-dark" type="button" onClick={() => { setListingForm({ ...emptyListing, type: "LOST" }); requireAuth("report"); }}>Report lost item <span>↗</span></button><button className="button button-light" type="button" onClick={() => { setListingForm({ ...emptyListing, type: "FOUND" }); requireAuth("report"); }}>Report found item</button></div></div><div className="hero-art" aria-hidden="true"><div className="sun"></div><div className="art-card art-card-back"></div><div className="art-card art-card-front"><span className="art-pin">✦</span><strong>Good things<br />find their way<br /><i>home.</i></strong><small>CampusFind community</small></div><span className="art-star star-one">✦</span><span className="art-star star-two">✦</span></div></section>
        <section className="stats-strip" aria-label="Portal statistics"><div><strong>{stats.active}</strong><span>Active reports</span></div><div><strong>{stats.lost}</strong><span>Lost items</span></div><div><strong>{stats.found}</strong><span>Found items</span></div><div><strong>{stats.returned}</strong><span>Returned</span></div></section>
        <section className="content-section"><div className="section-heading"><div><span className="eyebrow">Community board</span><h2>Find what matters.</h2><p>Search recent reports from around campus.</p></div><button className="text-button" type="button" onClick={() => go("browse")}>View all reports <span>→</span></button></div><div className="search-panel"><label className="search-field"><span>⌕</span><input name="search" type="search" placeholder="Search by item, place, or detail..." value={filters.search} onChange={updateFilter} /></label><select name="type" value={filters.type} onChange={updateFilter}><option value="">All reports</option><option value="LOST">Lost items</option><option value="FOUND">Found items</option></select><select name="category" value={filters.category} onChange={updateFilter}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><select name="status" value={filters.status} onChange={updateFilter}><option value="">Any status</option><option value="Pending">Active</option><option value="Returned">Returned</option></select></div>{loading ? <div className="card-grid">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item}></div>)}</div> : listings.length ? <div className="card-grid">{listings.slice(0, view === "home" ? 6 : listings.length).map((listing) => <ListingCard key={listing._id} listing={listing} onOpen={setSelectedListing} />)}</div> : <EmptyState title="No reports found" text="Try another search or be the first to report this item." action={<button className="button button-dark" type="button" onClick={() => requireAuth("report")}>Create a report</button>} />}</section>
        <section className="how-section"><div><span className="eyebrow">Simple by design</span><h2>From missing to<br /><em>reunited.</em></h2></div><div className="steps"><div><b>01</b><span className="step-icon">↗</span><h3>Report</h3><p>Share the details while they are fresh.</p></div><div><b>02</b><span className="step-icon">⌕</span><h3>Search</h3><p>Browse the community board with ease.</p></div><div><b>03</b><span className="step-icon">♡</span><h3>Connect</h3><p>Spot a match and reach the right person.</p></div><div><b>04</b><span className="step-icon">✦</span><h3>Reunite</h3><p>Mark it returned and close the loop.</p></div></div></section>
      </> : null}
      {view === "report" ? <section className="page-wrap narrow"><div className="page-intro"><span className="eyebrow">Make a difference</span><h1>{editingId ? "Update your report" : "Report an item"}</h1><p>Good details help good things find their way home.</p></div><form className="form-panel" onSubmit={submitListing}><div className="type-switch"><button type="button" className={listingForm.type === "LOST" ? "selected lost-select" : ""} onClick={() => setListingForm((current) => ({ ...current, type: "LOST" }))}>I lost something</button><button type="button" className={listingForm.type === "FOUND" ? "selected found-select" : ""} onClick={() => setListingForm((current) => ({ ...current, type: "FOUND" }))}>I found something</button></div><div className="form-grid"><Field label="Item name" required><input name="title" value={listingForm.title} onChange={updateListing} placeholder="e.g. Blue water bottle" /></Field><Field label="Category" required><select name="category" value={listingForm.category} onChange={updateListing}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field><Field label="Where did it happen?" required><input name="location" value={listingForm.location} onChange={updateListing} placeholder="e.g. Library, first floor" /></Field><Field label="When?" required><input name="date" type="date" value={listingForm.date} onChange={updateListing} /></Field></div><Field label="Description" required hint="Include color, brand, identifying marks, or anything else useful."><textarea name="description" value={listingForm.description} onChange={updateListing} placeholder="Tell the campus community what they should look for..." /></Field><Field label="Image URL" hint="Optional. Use a publicly accessible image link."><input name="imageUrl" type="url" value={listingForm.imageUrl} onChange={updateListing} placeholder="https://..." /></Field>{listingForm.imageUrl ? <img className="form-preview" src={listingForm.imageUrl} alt="Preview of your listing" /> : null}<div className="form-actions"><button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Publishing..." : editingId ? "Save changes" : "Publish report"} <span>↗</span></button><button className="button button-ghost" type="button" onClick={() => { setListingForm(emptyListing); setEditingId(""); go("home"); }}>Cancel</button></div></form></section> : null}
      {view === "activity" ? <section className="page-wrap"><div className="page-intro inline-intro"><div><span className="eyebrow">Your contribution</span><h1>My reports</h1><p>Keep track of the items you have shared with campus.</p></div><button className="button button-dark" type="button" onClick={() => { setListingForm(emptyListing); go("report"); }}>New report <span>↗</span></button></div>{myListings.length ? <div className="activity-list">{myListings.map((listing) => <article className="activity-item" key={listing._id}><div className="activity-thumb">{listing.imageUrl ? <img src={listing.imageUrl} alt="" /> : listing.type === "LOST" ? "?" : "✓"}</div><div className="activity-copy"><div className="card-badges"><Badge tone={listing.type === "FOUND" ? "found" : "lost"}>{listing.type === "FOUND" ? "Found" : "Lost"}</Badge><Badge tone={listing.status === "Returned" ? "returned" : "pending"}>{listing.status}</Badge></div><h2>{listing.title}</h2><p>{listing.location} · {formatDate(listing.date)}</p></div><div className="activity-actions"><button type="button" onClick={() => setSelectedListing(listing)}>View</button><button type="button" onClick={() => editListing(listing)}>Edit</button>{listing.status !== "Returned" ? <button type="button" onClick={() => markReturned(listing._id)}>Resolve</button> : null}<button className="delete-action" type="button" onClick={() => deleteListing(listing._id)}>Delete</button></div></article>)}</div> : <EmptyState title="No reports yet" text="Your lost and found reports will appear here." action={<button className="button button-dark" type="button" onClick={() => go("report")}>Create your first report</button>} />}</section> : null}
      {view === "account" ? <section className="page-wrap narrow"><div className="page-intro"><span className="eyebrow">Your account</span><h1>Profile & settings</h1><p>Your campus identity, all in one place.</p></div><section className="profile-panel"><div className="profile-heading"><span className="profile-avatar-large">{initials(user?.name)}</span><div><h2>{user?.name}</h2><p>{user?.email}</p></div></div><div className="profile-stats"><div><strong>{myListings.length}</strong><span>Reports shared</span></div><div><strong>{myListings.filter((item) => item.status === "Returned").length}</strong><span>Items returned</span></div></div><button className="button button-ghost" type="button" onClick={logout}>Sign out</button></section></section> : null}
    </main>
    <footer><span>CampusFind</span><p>Small acts of attention make a kinder campus.</p><span>© 2026</span></footer>
    {selectedListing ? <div className="modal-backdrop" onClick={() => setSelectedListing(null)}><article className="detail-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setSelectedListing(null)} aria-label="Close details">×</button><div className="detail-media">{selectedListing.imageUrl ? <img src={selectedListing.imageUrl} alt={selectedListing.title} /> : <span>{selectedListing.type === "LOST" ? "?" : "✓"}</span>}</div><div className="detail-content"><div className="card-badges"><Badge tone={selectedListing.type === "FOUND" ? "found" : "lost"}>{selectedListing.type === "FOUND" ? "Found" : "Lost"}</Badge><Badge tone={selectedListing.status === "Returned" ? "returned" : "pending"}>{selectedListing.status}</Badge></div><h2>{selectedListing.title}</h2><p className="detail-description">{selectedListing.description}</p><dl><div><dt>Category</dt><dd>{selectedListing.category}</dd></div><div><dt>Location</dt><dd>{selectedListing.location}</dd></div><div><dt>Date reported</dt><dd>{formatDate(selectedListing.date)}</dd></div><div><dt>Posted by</dt><dd>{selectedListing.userId?.name || "Campus member"}</dd></div></dl>{selectedListing.userId?.email ? <a className="button button-dark contact-button" href={`mailto:${selectedListing.userId.email}`}>Contact reporter <span>↗</span></a> : null}</div></article></div> : null}
    {authMode ? <div className="modal-backdrop" onClick={() => setAuthMode(null)}><div className="auth-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setAuthMode(null)} aria-label="Close sign in">×</button><span className="eyebrow">Welcome to CampusFind</span><h2>{authMode === "register" ? "Join your campus community." : "Welcome back."}</h2><div className="auth-tabs"><button className={authMode === "login" ? "selected" : ""} type="button" onClick={() => setAuthMode("login")}>Sign in</button><button className={authMode === "register" ? "selected" : ""} type="button" onClick={() => setAuthMode("register")}>Create account</button></div><form className="stack-form" onSubmit={submitAuth}>{authMode === "register" ? <Field label="Full name" required><input name="name" value={authForm.name} onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))} autoComplete="name" /></Field> : null}<Field label="Email address" required><input name="email" type="email" value={authForm.email} onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} autoComplete="email" /></Field><Field label="Password" required hint="At least 6 characters."><input name="password" type="password" value={authForm.password} onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} autoComplete={authMode === "login" ? "current-password" : "new-password"} /></Field><button className="button button-dark full-button" type="submit" disabled={submitting}>{submitting ? "Please wait..." : authMode === "register" ? "Create account" : "Sign in"} <span>↗</span></button></form></div></div> : null}
  </div>;
}

export default App;