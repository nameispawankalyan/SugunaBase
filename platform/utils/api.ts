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
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            // If account is deactivated, force logout
            if (errorData.code === 'ACCOUNT_DISABLED') {
                if (typeof window !== 'undefined') {
                    localStorage.clear();
                    window.location.href = '/login?error=deactivated';
                }
            }
            throw new Error(errorData.error || `API Error: ${res.statusText}`);
        }
        return await res.json();
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

export const SugunaCastAPI = {
    // Standard Cast API remains the same as it uses a different base URL usually
    getToken: async (data: any) => {
        const res = await fetch(`${API_BASE_URL}/cast/get-token`, {
            method: 'POST',
            headers: api.getHeaders(),
            body: JSON.stringify(data)
        });
        return await api.handleResponse(res);
    }
};
