import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// Configure axios globally BEFORE rendering App
let refreshRequest = null;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = localStorage.getItem('refreshToken');
    const isUnauthorized = error.response?.status === 401;
    const isRefreshCall = originalRequest?.url?.includes('/api/auth/refresh');

    if (!isUnauthorized || !refreshToken || isRefreshCall || originalRequest?._retry) {
      if (isUnauthorized && !isRefreshCall && !originalRequest?._retry) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshRequest) {
        refreshRequest = axios.post('/api/auth/refresh', { refreshToken });
      }
      const { data } = await refreshRequest;
      refreshRequest = null;

      localStorage.setItem('token', data.accessToken || data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
      return axios(originalRequest);
    } catch (refreshError) {
      refreshRequest = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
