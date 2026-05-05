import axios from "axios";

export const api = axios.create({
  baseURL: "https://backend-crm-production-157b.up.railway.app",
});