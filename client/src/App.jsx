import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

const initialAuthForm = {
  name: "",
  email: "",
  password: "",
};

const initialListingForm = {
  type: "LOST",
  title: "",
  description: "",
  category: "Electronics",
  location: "",
  imageUrl: "",
  date: "",
};

function formatDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  return new Date(dateValue).toLocaleDateString();
}

function App() {
  const [mode, setMode] = useState("register");
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [listingForm, setListingForm] = useState(initialListingForm);
  const [editingListingId, setEditingListingId] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState(localStorage.getItem("finditToken") || "");
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("finditUser") || "null")
  );

  const authHeaders = useMemo(() => {
    if (!token) {
      return {};
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  useEffect(() => {
    const loadListings = async () => {
      try {
        const params = new URLSearchParams();

        if (search) params.set("search", search);
        if (category) params.set("category", category);
        if (status) params.set("status", status);

        const res = await api.get(`/listings?${params.toString()}`);
        setListings(res.data);
      } catch {
        setMessage("Unable to load listings");
      }
    };

    loadListings();
  }, [search, category, status]);

  useEffect(() => {
    const loadMyListings = async () => {
      if (!token) {
        setMyListings([]);
        return;
      }

      try {
        const res = await api.get("/users/me/listings", {
          headers: authHeaders,
        });

        setMyListings(res.data);
      } catch (err) {
        setMessage(err.response?.data?.message || "Unable to load your listings");
      }
    };

    loadMyListings();
  }, [token, authHeaders]);

  const handleAuthChange = (event) => {
    setAuthForm({
      ...authForm,
      [event.target.name]: event.target.value,
    });
  };

  const handleListingChange = (event) => {
    setListingForm({
      ...listingForm,
      [event.target.name]: event.target.value,
    });
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const payload =
        mode === "register"
          ? authForm
          : {
              email: authForm.email,
              password: authForm.password,
            };

      const res = await api.post(endpoint, payload);

      setToken(res.data.token);
      setCurrentUser(res.data.user);
      localStorage.setItem("finditToken", res.data.token);
      localStorage.setItem("finditUser", JSON.stringify(res.data.user));
      setAuthForm(initialAuthForm);
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Authentication failed");
    }
  };

  const submitListing = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const request = editingListingId
        ? api.patch(`/listings/${editingListingId}`, listingForm, {
            headers: authHeaders,
          })
        : api.post("/listings", listingForm, {
            headers: authHeaders,
          });

      const res = await request;

      setListings((currentListings) =>
        editingListingId
          ? currentListings.map((item) => (item._id === editingListingId ? res.data : item))
          : [res.data, ...currentListings]
      );
      setMyListings((currentListings) =>
        editingListingId
          ? currentListings.map((item) => (item._id === editingListingId ? res.data : item))
          : [res.data, ...currentListings]
      );
      setListingForm(initialListingForm);
      setEditingListingId("");
      setMessage(editingListingId ? "Listing updated" : "Listing created");
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to create listing");
    }
  };

  const handleDelete = async (listingId) => {
    try {
      await api.delete(`/listings/${listingId}`, { headers: authHeaders });
      setListings((currentListings) => currentListings.filter((item) => item._id !== listingId));
      setMyListings((currentListings) => currentListings.filter((item) => item._id !== listingId));
      setMessage("Listing deleted");
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to delete listing");
    }
  };

  const handleEdit = (listing) => {
    setEditingListingId(listing._id);
    setListingForm({
      type: listing.type,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      location: listing.location,
      imageUrl: listing.imageUrl || "",
      date: listing.date ? new Date(listing.date).toISOString().slice(0, 10) : "",
    });
  };

  const handleCancelEdit = () => {
    setEditingListingId("");
    setListingForm(initialListingForm);
  };

  const handleMarkReturned = async (listingId) => {
    try {
      const res = await api.patch(`/listings/${listingId}/status`, {}, { headers: authHeaders });

      setListings((currentListings) =>
        currentListings.map((item) => (item._id === listingId ? res.data : item))
      );
      setMyListings((currentListings) =>
        currentListings.map((item) => (item._id === listingId ? res.data : item))
      );
      setMessage("Listing marked returned");
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to update status");
    }
  };

  const handleLogout = () => {
    setToken("");
    setCurrentUser(null);
    setMyListings([]);
    localStorage.removeItem("finditToken");
    localStorage.removeItem("finditUser");
    setMessage("Logged out");
  };

  const openDetail = async (listing) => {
    try {
      const res = await api.get(`/listings/${listing._id}`);
      setSelectedListing(res.data);
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to load listing details");
    }
  };

  return (
    <div className="shell">
      <div className="backdrop" />
      <main className="app-frame">
        <header className="hero">
          <div>
            <p className="eyebrow">Campus Lost & Found Portal</p>
            <h1>Find items fast, post responsibly, and close the loop.</h1>
            <p className="hero-copy">
              Search listings by keyword, category, and status. Post lost or found items,
              manage your own listings, and mark items returned when they are reunited.
            </p>
          </div>

          <div className="hero-card">
            <span>{currentUser ? `Signed in as ${currentUser.name}` : "Guest session"}</span>
            <strong>{listings.length} active listings</strong>
            <button type="button" className="ghost-button" onClick={handleLogout} disabled={!token}>
              Sign out
            </button>
          </div>
        </header>

        {message ? <div className="banner">{message}</div> : null}

        <section className="auth-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>{mode === "register" ? "Create account" : "Welcome back"}</h2>
              <div className="segment">
                <button
                  type="button"
                  className={mode === "register" ? "segment-active" : ""}
                  onClick={() => setMode("register")}
                >
                  Register
                </button>
                <button
                  type="button"
                  className={mode === "login" ? "segment-active" : ""}
                  onClick={() => setMode("login")}
                >
                  Login
                </button>
              </div>
            </div>

            <form className="stack" onSubmit={submitAuth}>
              {mode === "register" ? (
                <input
                  type="text"
                  name="name"
                  placeholder="Full name"
                  value={authForm.name}
                  onChange={handleAuthChange}
                />
              ) : null}
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={authForm.email}
                onChange={handleAuthChange}
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={authForm.password}
                onChange={handleAuthChange}
              />
              <button type="submit">{mode === "register" ? "Register" : "Login"}</button>
            </form>
          </article>

          <article className="panel accent-panel">
            <h2>{editingListingId ? "Edit listing" : "Post an item"}</h2>
            <p>Create a lost or found listing with an image URL and campus location.</p>

            <form className="stack" onSubmit={submitListing}>
              <div className="row">
                <select name="type" value={listingForm.type} onChange={handleListingChange} disabled={!token}>
                  <option value="LOST">Lost</option>
                  <option value="FOUND">Found</option>
                </select>
                <select name="category" value={listingForm.category} onChange={handleListingChange} disabled={!token}>
                  <option value="Electronics">Electronics</option>
                  <option value="Documents">Documents</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <input
                type="text"
                name="title"
                placeholder="Title"
                value={listingForm.title}
                onChange={handleListingChange}
                disabled={!token}
              />
              <textarea
                name="description"
                placeholder="Describe the item"
                value={listingForm.description}
                onChange={handleListingChange}
                disabled={!token}
              />
              <input
                type="text"
                name="location"
                placeholder="Location on campus"
                value={listingForm.location}
                onChange={handleListingChange}
                disabled={!token}
              />
              <input
                type="url"
                name="imageUrl"
                placeholder="Image URL"
                value={listingForm.imageUrl}
                onChange={handleListingChange}
                disabled={!token}
              />
              <input
                type="date"
                name="date"
                value={listingForm.date}
                onChange={handleListingChange}
                disabled={!token}
              />
              <button type="submit" disabled={!token}>
                {editingListingId ? "Save changes" : "Create listing"}
              </button>
              {editingListingId ? (
                <button type="button" className="ghost-button" onClick={handleCancelEdit}>
                  Cancel edit
                </button>
              ) : null}
            </form>
          </article>
        </section>

        <section className="filters panel">
          <div className="row">
            <input
              type="search"
              placeholder="Search by keyword"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Documents">Documents</option>
              <option value="Clothing">Clothing</option>
              <option value="Accessories">Accessories</option>
              <option value="Other">Other</option>
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
        </section>

        <section className="content-grid">
          <article className="panel list-panel">
            <div className="panel-header">
              <h2>Browse listings</h2>
              <span>{listings.length} result(s)</span>
            </div>
            <div className="cards">
              {listings.map((listing) => (
                <button key={listing._id} type="button" className="listing-card" onClick={() => openDetail(listing)}>
                  <div className="listing-topline">
                    <span className={`badge ${listing.type === "FOUND" ? "found" : "lost"}`}>
                      {listing.type}
                    </span>
                    <span className={`badge ${listing.status === "Returned" ? "returned" : "pending"}`}>
                      {listing.status}
                    </span>
                  </div>
                  <h3>{listing.title}</h3>
                  <p>{listing.description}</p>
                  <div className="meta">
                    <span>{listing.category}</span>
                    <span>{listing.location}</span>
                    <span>{formatDate(listing.date)}</span>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="panel list-panel">
            <div className="panel-header">
              <h2>My listings</h2>
              <span>{myListings.length} owned item(s)</span>
            </div>
            <div className="cards">
              {myListings.map((listing) => (
                <div key={listing._id} className="listing-card owned-card">
                  <div className="listing-topline">
                    <span className={`badge ${listing.type === "FOUND" ? "found" : "lost"}`}>
                      {listing.type}
                    </span>
                    <span className={`badge ${listing.status === "Returned" ? "returned" : "pending"}`}>
                      {listing.status}
                    </span>
                  </div>
                  <h3>{listing.title}</h3>
                  <p>{listing.description}</p>
                  <div className="actions">
                    <button type="button" onClick={() => handleEdit(listing)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleMarkReturned(listing._id)} disabled={listing.status === "Returned"}>
                      Mark returned
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(listing._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {selectedListing ? (
          <section className="detail panel">
            <div className="panel-header">
              <h2>Listing details</h2>
              <button type="button" className="ghost-button" onClick={() => setSelectedListing(null)}>
                Close
              </button>
            </div>
            <div className="detail-grid">
              <div>
                <div className="listing-topline">
                  <span className={`badge ${selectedListing.type === "FOUND" ? "found" : "lost"}`}>
                    {selectedListing.type}
                  </span>
                  <span className={`badge ${selectedListing.status === "Returned" ? "returned" : "pending"}`}>
                    {selectedListing.status}
                  </span>
                </div>
                <h3>{selectedListing.title}</h3>
                <p>{selectedListing.description}</p>
                <div className="meta stack-meta">
                  <span>Category: {selectedListing.category}</span>
                  <span>Location: {selectedListing.location}</span>
                  <span>Date: {formatDate(selectedListing.date)}</span>
                  <span>Poster: {selectedListing.userId?.name}</span>
                  <span>Contact: {selectedListing.userId?.email}</span>
                </div>
              </div>
              {selectedListing.imageUrl ? (
                <img src={selectedListing.imageUrl} alt={selectedListing.title} className="detail-image" />
              ) : (
                <div className="detail-image placeholder">No image provided</div>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;