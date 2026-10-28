import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import { CustomerFeatures, Prediction, BatchRequest, BatchPrediction, ModelInfo, Health } from '../types/api'

// Get API base URL from environment variable, fallback to /api
const getBaseURL = (): string => {
  const envBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL
  if (envBaseUrl) {
    return envBaseUrl
  }
  // In development with Vite proxy, use /api; in production, might need full URL
  return '/api'
}

// Create axios instance with better configuration
const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for logging and adding auth headers if needed
api.interceptors.request.use(
  (config) => {
    // Add timestamp for debugging
    if ((import.meta as any).env?.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
    }
    return config
  },
  (error) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    if ((import.meta as any).env?.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`)
    }
    return response
  },
  (error: AxiosError) => {
    // Enhanced error handling
    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const data = error.response.data as any
      
      console.error(`[API Error] Status: ${status}`, data)
      
      // Create a more descriptive error message
      let errorMessage = data?.detail || data?.message || `Request failed with status ${status}`
      
      if (status === 401) {
        errorMessage = 'Unauthorized. Please check your credentials.'
      } else if (status === 403) {
        errorMessage = 'Forbidden. You do not have permission to access this resource.'
      } else if (status === 404) {
        errorMessage = 'Resource not found.'
      } else if (status === 422) {
        errorMessage = data?.detail || 'Validation error. Please check your input.'
      } else if (status === 500) {
        errorMessage = 'Internal server error. Please try again later.'
      } else if (status === 503) {
        errorMessage = 'Service unavailable. Please try again later.'
      }
      
      const enhancedError = new Error(errorMessage)
      ;(enhancedError as any).status = status
      ;(enhancedError as any).data = data
      return Promise.reject(enhancedError)
    } else if (error.request) {
      // Request was made but no response received
      console.error('[API Error] No response received:', error.request)
      const enhancedError = new Error('Network error. Please check your connection and try again.')
      ;(enhancedError as any).isNetworkError = true
      return Promise.reject(enhancedError)
    } else {
      // Something happened in setting up the request
      console.error('[API Error]', error.message)
      return Promise.reject(error)
    }
  }
)

// Retry logic for failed requests
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any
  
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFn()
    } catch (error: any) {
      lastError = error
      // Don't retry on client errors (4xx except maybe 408, 429)
      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
        throw error
      }
      
      if (i < retries - 1) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)))
        console.log(`[API Retry] Attempt ${i + 2} of ${retries}`)
      }
    }
  }
  
  throw lastError
}

export const healthApi = {
  getHealth: async (): Promise<Health> => {
    try {
      const response = await retryRequest(() => api.get('/health'))
      return response.data
    } catch (error) {
      throw error
    }
  },
}

export const modelApi = {
  getInfo: async (): Promise<ModelInfo> => {
    try {
      const response = await retryRequest(() => api.get('/model/info'))
      return response.data
    } catch (error) {
      throw error
    }
  },
}

export const predictApi = {
  predict: async (customer: CustomerFeatures): Promise<Prediction> => {
    try {
      const response = await retryRequest(() => api.post('/predict', customer))
      return response.data
    } catch (error) {
      throw error
    }
  },
  predictBatch: async (batch: BatchRequest): Promise<BatchPrediction> => {
    try {
      const response = await retryRequest(() => api.post('/predict/batch', batch))
      return response.data
    } catch (error) {
      throw error
    }
  },
}

export default api
