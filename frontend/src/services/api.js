import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401 responses globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Don't redirect if we're already on the login endpoint
            const isLoginRequest = error.config?.url?.includes('/auth/login');
            if (!isLoginRequest) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        console.error('API Error:', error.response || error.message);
        return Promise.reject(error);
    }
);

export default api;
