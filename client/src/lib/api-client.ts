import axios from "axios"

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
    headers: {
        "Content-Type": "application/json",
    },
})

// Add Auth interceptor
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("auth-storage")
    if (token) {
        try {
            const parsed = JSON.parse(token)
            if (parsed.state?.token) {
                config.headers.Authorization = `Bearer ${parsed.state.token}`
            }
        } catch (e) {
            console.error("Auth token parse error", e)
        }
    }
    return config
})

export default apiClient
