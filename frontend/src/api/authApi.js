import axios from 'axios';

const API_URL = 'http://localhost:8080/auth';

export const login = (data) => {
  return axios.post(`${API_URL}/login`, data);
};


export const register = (data) =>{
    return axios.post(`${API_URL}/register`, data);
}