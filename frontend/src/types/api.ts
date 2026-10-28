export interface CustomerFeatures {
  Gender: 'Male' | 'Female'
  Age: number
  HasDrivingLicense: number
  RegionID: number
  Switch: number
  VehicleAge: '< 1 Year' | '1-2 Year' | '> 2 Years'
  PastAccident: 'Yes' | 'No' | 'Unknown'
  AnnualPremium: number
  SalesChannelID: number
  DaysSinceCreated: number
}

export interface Prediction {
  will_cross_sell: boolean
  probability: number
  threshold: number
  model_version: string
}

export interface BatchRequest {
  customers: CustomerFeatures[]
}

export interface BatchPrediction {
  predictions: Prediction[]
  count: number
}

export interface ModelInfo {
  project: string
  model_version: string
  trained_at: string
  threshold: number
  features: string[]
  metrics: Record<string, number>
}

export interface Health {
  status: 'ok' | 'degraded'
  model_loaded: boolean
  detail?: string
}
