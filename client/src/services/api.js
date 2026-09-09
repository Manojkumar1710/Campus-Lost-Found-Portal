import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

export function getAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getApiMessage(error, fallback) {
  if (!error.response) {
    return "We could not reach the portal. Check that the server is running and try again.";
  }

  return error.response.data?.message || fallback;
}

export default api;
