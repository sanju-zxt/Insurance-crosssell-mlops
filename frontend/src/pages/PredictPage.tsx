import { useState } from 'react'
import { Target, CheckCircle, XCircle, Loader2, FileText, Info, AlertCircle } from 'lucide-react'
import { predictApi } from '../utils/api'
import { CustomerFeatures, Prediction } from '../types/api'

const PredictPage = () => {
  const [formData, setFormData] = useState<CustomerFeatures>({
    Gender: 'Male',
    Age: 35,
    HasDrivingLicense: 1,
    RegionID: 28,
    Switch: 0,
    VehicleAge: '1-2 Year',
    PastAccident: 'No',
    AnnualPremium: 2630.0,
    SalesChannelID: 152,
    DaysSinceCreated: 164,
  })
  
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const sampleData: CustomerFeatures = {
    Gender: 'Female',
    Age: 42,
    HasDrivingLicense: 1,
    RegionID: 15,
    Switch: 1,
    VehicleAge: '< 1 Year',
    PastAccident: 'Yes',
    AnnualPremium: 5800.0,
    SalesChannelID: 26,
    DaysSinceCreated: 45,
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (formData.Age < 18 || formData.Age > 100) {
      errors.Age = 'Age must be between 18 and 100'
    }
    if (![0, 1].includes(formData.HasDrivingLicense)) {
      errors.HasDrivingLicense = 'HasDrivingLicense must be 0 or 1'
    }
    if (formData.RegionID < 0) {
      errors.RegionID = 'RegionID must be >= 0'
    }
    if (![-1, 0, 1].includes(formData.Switch)) {
      errors.Switch = 'Switch must be -1, 0, or 1'
    }
    if (formData.AnnualPremium <= 0) {
      errors.AnnualPremium = 'AnnualPremium must be greater than 0'
    }
    if (formData.SalesChannelID < 0) {
      errors.SalesChannelID = 'SalesChannelID must be >= 0'
    }
    if (formData.DaysSinceCreated < 0) {
      errors.DaysSinceCreated = 'DaysSinceCreated must be >= 0'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'Age' || name === 'RegionID' || name === 'AnnualPremium' || name === 'SalesChannelID' || name === 'DaysSinceCreated' 
        ? parseFloat(value) 
        : name === 'HasDrivingLicense' || name === 'Switch'
        ? parseInt(value)
        : value
    }))
    // Clear field error when user changes the field
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const loadSampleData = () => {
    setFormData(sampleData)
    setFieldErrors({})
    setError(null)
    setPrediction(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPrediction(null)
    
    if (!validateForm()) {
      setError('Please fix the validation errors below')
      return
    }
    
    setLoading(true)

    try {
      const result = await predictApi.predict(formData)
      setPrediction(result)
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail
      if (typeof errorDetail === 'string') {
        setError(errorDetail)
      } else if (Array.isArray(errorDetail)) {
        // Handle Pydantic validation errors
        const messages = errorDetail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join('; ')
        setError(messages)
      } else {
        setError('An error occurred while predicting. Please check your inputs.')
      }
    } finally {
      setLoading(false)
    }
  }

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.7) return 'var(--error)'
    if (prob >= 0.5) return 'var(--warning)'
    return 'var(--success)'
  }

  return (
    <div>
      <div className="mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Target size={32} style={{ color: 'var(--accent)' }} />
          Single Prediction
        </h1>
        <p className="text-secondary">Enter customer details to predict cross-sell propensity</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Customer Features</h2>
            <button 
              type="button" 
              onClick={loadSampleData} 
              className="btn btn-secondary"
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
            >
              <FileText size={16} />
              Load Sample Data
            </button>
          </div>
          
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select name="Gender" value={formData.Gender} onChange={handleChange} className="form-select">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Age *
                  <Info size={14} className="text-secondary" aria-label="Age must be between 18 and 100" />
                </label>
                <input
                  type="number"
                  name="Age"
                  value={formData.Age}
                  onChange={handleChange}
                  min="18"
                  max="100"
                  className="form-input"
                  style={fieldErrors.Age ? { borderColor: 'var(--error)' } : {}}
                  required
                />
                {fieldErrors.Age && <p className="text-xs text-error mt-1">{fieldErrors.Age}</p>}
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Has Driving License *
                  <Info size={14} className="text-secondary" />
                </label>
                <select name="HasDrivingLicense" value={formData.HasDrivingLicense} onChange={handleChange} className="form-select" style={fieldErrors.HasDrivingLicense ? { borderColor: 'var(--error)' } : {}}>
                  <option value={1}>Yes (1)</option>
                  <option value={0}>No (0)</option>
                </select>
                {fieldErrors.HasDrivingLicense && <p className="text-xs text-error mt-1">{fieldErrors.HasDrivingLicense}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Region ID *
                  <Info size={14} className="text-secondary" />
                </label>
                <input
                  type="number"
                  name="RegionID"
                  value={formData.RegionID}
                  onChange={handleChange}
                  min="0"
                  className="form-input"
                  style={fieldErrors.RegionID ? { borderColor: 'var(--error)' } : {}}
                  required
                />
                {fieldErrors.RegionID && <p className="text-xs text-error mt-1">{fieldErrors.RegionID}</p>}
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Switch (Prior Insurer) *
                  <Info size={14} className="text-secondary" />
                </label>
                <select name="Switch" value={formData.Switch} onChange={handleChange} className="form-select" style={fieldErrors.Switch ? { borderColor: 'var(--error)' } : {}}>
                  <option value={1}>Yes (1)</option>
                  <option value={0}>No (0)</option>
                  <option value={-1}>Unknown (-1)</option>
                </select>
                {fieldErrors.Switch && <p className="text-xs text-error mt-1">{fieldErrors.Switch}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Age *</label>
                <select name="VehicleAge" value={formData.VehicleAge} onChange={handleChange} className="form-select">
                  <option value="< 1 Year">&lt; 1 Year</option>
                  <option value="1-2 Year">1-2 Year</option>
                  <option value="> 2 Years">&gt; 2 Years</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Past Accident *</label>
              <select name="PastAccident" value={formData.PastAccident} onChange={handleChange} className="form-select">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Annual Premium *
                  <Info size={14} className="text-secondary" />
                </label>
                <input
                  type="number"
                  name="AnnualPremium"
                  value={formData.AnnualPremium}
                  onChange={handleChange}
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  style={fieldErrors.AnnualPremium ? { borderColor: 'var(--error)' } : {}}
                  required
                />
                {fieldErrors.AnnualPremium && <p className="text-xs text-error mt-1">{fieldErrors.AnnualPremium}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Sales Channel ID *
                  <Info size={14} className="text-secondary" />
                </label>
                <input
                  type="number"
                  name="SalesChannelID"
                  value={formData.SalesChannelID}
                  onChange={handleChange}
                  min="0"
                  className="form-input"
                  style={fieldErrors.SalesChannelID ? { borderColor: 'var(--error)' } : {}}
                  required
                />
                {fieldErrors.SalesChannelID && <p className="text-xs text-error mt-1">{fieldErrors.SalesChannelID}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                Days Since Created *
                <Info size={14} className="text-secondary" />
              </label>
              <input
                type="number"
                name="DaysSinceCreated"
                value={formData.DaysSinceCreated}
                onChange={handleChange}
                min="0"
                className="form-input"
                style={fieldErrors.DaysSinceCreated ? { borderColor: 'var(--error)' } : {}}
                required
              />
              {fieldErrors.DaysSinceCreated && <p className="text-xs text-error mt-1">{fieldErrors.DaysSinceCreated}</p>}
            </div>

            <button type="submit" className="btn" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Predicting...
                </>
              ) : (
                <>
                  <Target size={18} />
                  Predict Cross-Sell Propensity
                </>
              )}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Prediction Result</h2>
          
          {!prediction && !error && !loading && (
            <div className="text-center text-secondary" style={{ padding: '3rem 1rem' }}>
              <Target size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>Fill in the customer details and click Predict to get results</p>
              <p className="text-xs mt-2" style={{ opacity: 0.7 }}>Use "Load Sample Data" to try with example values</p>
            </div>
          )}

          {loading && (
            <div className="text-center" style={{ padding: '3rem 1rem' }}>
              <Loader2 size={48} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
              <p className="text-secondary">Analyzing customer data...</p>
              <p className="text-xs mt-1" style={{ opacity: 0.7 }}>This may take a few seconds</p>
            </div>
          )}

          {error && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--error-light)',
              border: '1px solid var(--error)',
              borderRadius: 'var(--radius)',
              color: 'var(--error)',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
            }}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              <div style={{ flex: 1 }}>
                <p className="text-sm" style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Error</p>
                <p className="text-sm" style={{ wordBreak: 'break-word' }}>{error}</p>
              </div>
            </div>
          )}

          {prediction && (
            <div>
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                backgroundColor: prediction.will_cross_sell ? 'var(--success-light)' : 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1.5rem',
                border: `2px solid ${prediction.will_cross_sell ? 'var(--success)' : 'var(--border)'}`,
              }}>
                {prediction.will_cross_sell ? (
                  <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
                ) : (
                  <XCircle size={64} style={{ color: 'var(--text-tertiary)', margin: '0 auto 1rem' }} />
                )}
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {prediction.will_cross_sell ? '✓ Interested - Likely to Cross-Sell' : '✗ Not Interested - Unlikely to Cross-Sell'}
                </h3>
                <p className="text-secondary">
                  {prediction.will_cross_sell 
                    ? 'High propensity for additional insurance product' 
                    : 'Low propensity for additional insurance product'}
                </p>
              </div>

              <div className="grid grid-2 mb-4">
                <div className="card" style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem' }}>
                  <p className="text-xs text-secondary mb-1">Cross-Sell Probability</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: '600', color: getProbabilityColor(prediction.probability) }}>
                    {(prediction.probability * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="card" style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem' }}>
                  <p className="text-xs text-secondary mb-1">Decision Threshold</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: '600' }}>
                    {(prediction.threshold * 100).toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="card" style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', marginBottom: '1rem' }}>
                <p className="text-xs text-secondary mb-2">Probability vs Threshold</p>
                <div style={{ 
                  width: '100%', 
                  height: '12px', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  borderRadius: '6px',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    width: `${Math.min(prediction.probability * 100, 100)}%`,
                    height: '100%',
                    backgroundColor: getProbabilityColor(prediction.probability),
                    transition: 'width 0.3s ease'
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: `${prediction.threshold * 100}%`,
                    top: 0,
                    width: '2px',
                    height: '100%',
                    backgroundColor: 'var(--text-primary)',
                    opacity: 0.7
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span className="text-secondary">0%</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                    Threshold: {(prediction.threshold * 100).toFixed(1)}%
                  </span>
                  <span className="text-secondary">100%</span>
                </div>
                <p className="text-xs text-secondary mt-2">
                  {prediction.probability >= prediction.threshold 
                    ? '✓ Probability meets or exceeds threshold - classified as interested' 
                    : '✗ Probability below threshold - classified as not interested'}
                </p>
              </div>

              <div className="card" style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem' }}>
                <p className="text-xs text-secondary mb-1">Model Version</p>
                <p style={{ fontWeight: '500', fontFamily: 'monospace' }}>{prediction.model_version}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default PredictPage
