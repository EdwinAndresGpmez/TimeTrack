import axios from 'axios';

// Apuntamos al Nginx Gateway
const api = axios.create({
    baseURL: 'http://localhost:8080/api/v1', 
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;