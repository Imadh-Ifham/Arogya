import axios from "axios";

const telemedicineBaseUrl =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_TELEMEDICINE_API_URL ?? "http://localhost:8086/api/v1";

const telemedicineApi = axios.create({
  baseURL: telemedicineBaseUrl,
  headers: { "Content-Type": "application/json" },
});

export default telemedicineApi;
