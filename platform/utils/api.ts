export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.suguna.co/v1'; // Backend API URL

export const api = {
    getHeaders: () => {
        const headers: any = { 'Content-Type': 'application/json' };
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) headers['Authorization'] = `Bearer ${token}`; // Authorization: Bearer <token>
        }
        return headers;
    },

    get: async (endpoint: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers: api.getHeaders() });
            if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
            return await res.json();
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
            if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
            return await res.json();
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
            if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
            return await res.json();
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
            if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
            return await res.json();
        } catch (error) {
            console.error("API DELETE Error:", error);
            throw error;
        }
    }
};
