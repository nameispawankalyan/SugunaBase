const API_BASE_URL = 'https://api.suguna.co/v1';

export const api = {
    getHeaders: () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };
    },

    handleResponse: async (res: Response) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            // If account is deactivated or unauthorized, force logout
            if (data.code === 'ACCOUNT_DISABLED' || res.status === 401) {
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                    localStorage.clear();
                    window.location.href = '/login?error=' + (data.code || 'unauthorized');
                }
            }
            throw new Error(data.error || `API Error: ${res.statusText}`);
        }
        return data;
    },

    get: async (endpoint: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers: api.getHeaders() });
            return await api.handleResponse(res);
        } catch (error) {
            console.error("API GET Error:", error);
            throw error;
        }
    },

    post: async (endpoint: string, data: any) => {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: api.getHeaders(),
                body: JSON.stringify(data),
            });
            return await api.handleResponse(res);
        } catch (error) {
            console.error("API POST Error:", error);
            throw error;
        }
    },

    put: async (endpoint: string, data: any) => {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: api.getHeaders(),
                body: JSON.stringify(data),
            });
            return await api.handleResponse(res);
        } catch (error) {
            console.error("API PUT Error:", error);
            throw error;
        }
    },

    delete: async (endpoint: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: api.getHeaders(),
            });
            return await api.handleResponse(res);
        } catch (error) {
            console.error("API DELETE Error:", error);
            throw error;
        }
    }
};

export const castApi = {
    // Standard Cast API remains the same as it uses a different base URL usually
    getToken: async (data: any) => {
        const res = await fetch(`${API_BASE_URL}/cast/get-token`, {
            method: 'POST',
            headers: api.getHeaders(),
            body: JSON.stringify(data)
        });
        return await api.handleResponse(res);
    },
    // Adding get method for general use in cast dashboard
    get: async (endpoint: string) => {
        const res = await fetch(`${API_BASE_URL}/cast${endpoint}`, { headers: api.getHeaders() });
        return await api.handleResponse(res);
    }
};
