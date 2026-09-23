/**
 * DocHub API Client helper
 * Cung cấp tiện ích gọi REST API với cookie session và xử lý lỗi đồng bộ.
 */

const API_BASE = "";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let errorDetail = `Lỗi hệ thống (${response.status})`;
    let errorData = null;
    try {
      errorData = await response.json();
      if (errorData?.detail) {
        errorDetail = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
      }
    } catch (_) {}

    throw new ApiError(response.status, errorDetail, errorData);
  }

  // Nếu là response không có content (204)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
