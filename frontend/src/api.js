// Centralized axios client. The auth context injects the bearer token
// via an interceptor (see auth.jsx) so individual calls stay clean.

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ---------- Auth ----------
export const apiLogin = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const apiRegister = (data) =>
  api.post('/auth/register', { ...data, role_name: 'Customer' }).then((r) => r.data);

export const apiMe = () => api.get('/auth/me').then((r) => r.data);

// ---------- Categories ----------
export const listCategories = () => api.get('/categories').then((r) => r.data);
export const createCategory = (name) =>
  api.post('/categories', { category_name: name }).then((r) => r.data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// ---------- Users ----------
export const listUsers = (role) =>
  api.get('/users', { params: role ? { role } : {} }).then((r) => r.data);
export const listAgents = () => api.get('/users/agents').then((r) => r.data);
export const createUser = (data) => api.post('/users', data).then((r) => r.data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// ---------- Complaints ----------
export const listComplaints = (params = {}) =>
  api.get('/complaints', { params }).then((r) => r.data);
export const getComplaint = (id) => api.get(`/complaints/${id}`).then((r) => r.data);
export const createComplaint = (data) =>
  api.post('/complaints', data).then((r) => r.data);
export const assignComplaint = (id, agentId) =>
  api.post(`/complaints/${id}/assign`, { agent_id: agentId }).then((r) => r.data);
export const updateComplaintStatus = (id, payload) =>
  api.post(`/complaints/${id}/status`, payload).then((r) => r.data);
export const submitFeedback = (id, payload) =>
  api.post(`/complaints/${id}/feedback`, payload).then((r) => r.data);

// ---------- Dashboard ----------
export const dashboardStats = () => api.get('/dashboard/stats').then((r) => r.data);

// ---------- Helpers ----------
export function errorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join('; ');
  return detail || err?.message || 'Something went wrong';
}

export default api;
