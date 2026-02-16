// src/backend/services/api.ts

// const BASE_URL =
//   __DEV__
//     ? "http://192.168.137.215:5000"
//     : "https://api.gizipoma.com";


const BASE_URL = "http://192.168.1.12:5000";
/* =====================
   AUTH TYPES
===================== */
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  pregnancyWeek: string;
}

/* =====================
   USER TYPE
===================== */
export interface User {
  full_name: string;
  pregnancy_week: number;
}

export interface NutritionUser {
  id: number;
  user_id: number;
  amount: number;
  calories: number;
  protein: number;
  calcium: number;
  iron: number;
  folate: number;
  log_time: string;
  log_date: string;
  created_at: string;
}

/* =====================
   DASHBOARD TYPE
===================== */
export interface DashboardSummary {
  total_ibu_hamil: number;
  total_makanan: number;
  jadwal_hari_ini: number;
  total_nutrisi: number;
}


/* =====================
   API SERVICE
===================== */
class ApiService {
  async request(endpoint: string, method: string, body?: any) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await response.json();

      if (!response.ok || json.status === "error") {
        throw new Error(json.message || "Permintaan gagal");
      }

      return json;
    } catch (error: any) {
      throw new Error(error.message || "Tidak bisa terhubung ke server");
    }
  }

  /* ===== AUTH ===== */
  login(data: LoginData) {
    return this.request("/api/auth/login", "POST", data);
  }

  register(data: RegisterData) {
    return this.request("/api/auth/register", "POST", data);
  }

  /* ===== USER ===== */
  getUserById(userId: string): Promise<User> {
    return this.request(`/api/user/${userId}`, "GET");
  }

  getNutritionUser(userId: string): Promise<NutritionUser> {
    return this.request(`/api/nutrition/food-logs/${userId}`, "GET");
  }


}

export const apiService = new ApiService();
export default BASE_URL;
