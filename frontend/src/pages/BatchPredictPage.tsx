import { useMemo, useState } from 'react'
import { Users, Upload, Loader2, CheckCircle, XCircle, FileText, FileSpreadsheet, Filter, ArrowUpDown } from 'lucide-react'
import { predictApi } from '../utils/api'
import { CustomerFeatures, Prediction } from '../types/api'

const REQUIRED_FIELDS = [
  'Gender',
  'Age',
  'HasDrivingLicense',
  'RegionID',
  'Switch',
  'VehicleAge',
  'PastAccident',
  'AnnualPremium',
  'SalesChannelID',
  'DaysSinceCreated'
]

const SAMPLE_DATA = [
  {
    Gender: "Male",
    Age: 35,
    HasDrivingLicense: 1,
    RegionID: 28,
    Switch: 0,
    VehicleAge: "1-2 Year",
    PastAccident: "No",
    AnnualPremium: 2630.0,
    SalesChannelID: 152,
    DaysSinceCreated: 164
  },
  {
    Gender: "Female",
    Age: 45,
    HasDrivingLicense: 1,
    RegionID: 3,
    Switch: 1,
    VehicleAge: "> 2 Years",
    PastAccident: "Yes",
    AnnualPremium: 3849.0,
    SalesChannelID: 26,
    DaysSinceCreated: 227
  }
]

const TEMPLATE_CSV = `Gender,Age,HasDrivingLicense,RegionID,Switch,VehicleAge,PastAccident,AnnualPremium,SalesChannelID,DaysSinceCreated
Male,35,1,28,0,1-2 Year,No,2630.0,152,164
Female,45,1,3,1,> 2 Years,Yes,3849.0,26,227`

const BatchPredictPage = () => {
  const [jsonInput, setJsonInput] = useState('')
  const [predictions, setPredictions] = useState<Prediction[] | null>(null)
  const [customersForPred, setCustomersForPred] = useState<CustomerFeatures[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({})
  const [inputMode, setInputMode] = useState<'json' | 'csv'>('json')
  const [csvInput, setCsvInput] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: 'index' | 'probability' | 'will_cross_sell'; direction: 'asc' | 'desc' }>({ key: 'index', direction: 'asc' })
  const [filterInterested, setFilterInterested] = useState<'all' | 'yes' | 'no'>('all')
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  const handleLoadSample = () => {
    setInputMode('json')
    setJsonInput(JSON.stringify(SAMPLE_DATA, null, 2))
    setError(null)
    setRowErrors({})
  }

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'batch_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const parseCSV = (csvText: string): { customers: CustomerFeatures[]; errors: Record<number, string[]> } => {
    const errors: Record<number, string[]> = {}
    const lines = csvText.trim().split(/\r?\n/)
    if (lines.length === 0) {
      throw new Error('CSV is empty')
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const missingHeaders = REQUIRED_FIELDS.filter(f => !headers.includes(f))
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
    }
    
    const customers: CustomerFeatures[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const rowErrors: string[] = []
      const customer: any = {}
      
      headers.forEach((header, idx) => {
        if (REQUIRED_FIELDS.includes(header)) {
          customer[header] = values[idx] !== undefined ? values[idx] : ''
        }
      })
      
      // Validate Gender
      if (customer.Gender !== 'Male' && customer.Gender !== 'Female') {
        rowErrors.push('Gender must be Male or Female')
      }
      // Validate Age
      const age = Number(customer.Age)
      if (isNaN(age) || age < 18 || age > 100) {
        rowErrors.push('Age must be between 18 and 100')
      } else {
        customer.Age = age
      }
      // Validate HasDrivingLicense
      const license = Number(customer.HasDrivingLicense)
      if (isNaN(license) || (license !== 0 && license !== 1)) {
        rowErrors.push('HasDrivingLicense must be 0 or 1')
      } else {
        customer.HasDrivingLicense = license
      }
      // Validate RegionID
      const region = Number(customer.RegionID)
      if (isNaN(region) || region < 0) {
        rowErrors.push('RegionID must be a non-negative number')
      } else {
        customer.RegionID = region
      }
      // Validate Switch
      const sw = Number(customer.Switch)
      if (isNaN(sw) || (sw !== -1 && sw !== 0 && sw !== 1)) {
        rowErrors.push('Switch must be -1, 0, or 1')
      } else {
        customer.Switch = sw
      }
      // Validate VehicleAge
      if (customer.VehicleAge !== '< 1 Year' && customer.VehicleAge !== '1-2 Year' && customer.VehicleAge !== '> 2 Years') {
        rowErrors.push('VehicleAge must be < 1 Year, 1-2 Year, or > 2 Years')
      }
      // Validate PastAccident
      if (customer.PastAccident !== 'Yes' && customer.PastAccident !== 'No' && customer.PastAccident !== 'Unknown') {
        rowErrors.push('PastAccident must be Yes, No, or Unknown')
      }
      // Validate AnnualPremium
      const premium = Number(customer.AnnualPremium)
      if (isNaN(premium) || premium <= 0) {
        rowErrors.push('AnnualPremium must be a positive number')
      } else {
        customer.AnnualPremium = premium
      }
      // Validate SalesChannelID
      const channel = Number(customer.SalesChannelID)
      if (isNaN(channel) || channel < 0) {
        rowErrors.push('SalesChannelID must be a non-negative number')
      } else {
        customer.SalesChannelID = channel
      }
      // Validate DaysSinceCreated
      const days = Number(customer.DaysSinceCreated)
      if (isNaN(days) || days < 0) {
        rowErrors.push('DaysSinceCreated must be a non-negative number')
      } else {
        customer.DaysSinceCreated = days
      }
      
      if (rowErrors.length > 0) {
        errors[i - 1] = rowErrors // 0-based index for customers array
      }
      customers.push(customer as CustomerFeatures)
    }
    
    return { customers, errors }
  }

  const handleCSVFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvInput(text)
      setInputMode('csv')
      setError(null)
      setRowErrors({})
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setRowErrors({})
    setPredictions(null)
    setCustomersForPred(null)
    setProgress(null)

    try {
      let customers: CustomerFeatures[] = []
      
      if (inputMode === 'json') {
        if (!jsonInput.trim()) {
          throw new Error('Please provide JSON input')
        }
        const parsed = JSON.parse(jsonInput)
        if (!Array.isArray(parsed)) {
          throw new Error('Input must be an array of customers')
        }
        customers = parsed
      } else {
        if (!csvInput.trim()) {
          throw new Error('Please provide CSV input or upload a file')
        }
        const { customers: parsedCustomers, errors } = parseCSV(csvInput)
        if (Object.keys(errors).length > 0) {
          setRowErrors(errors)
          throw new Error(`Validation errors found in ${Object.keys(errors).length} row(s). Please fix and try again.`)
        }
        customers = parsedCustomers
      }
      
      if (customers.length === 0) {
        throw new Error('At least one customer is required')
      }
      if (customers.length > 500) {
        throw new Error('Maximum 500 customers allowed')
      }
      
      setCustomersForPred(customers)
      setProgress({ current: 0, total: customers.length })
      
      const result = await predictApi.predictBatch({ customers })
      setPredictions(result.predictions)
      setProgress({ current: customers.length, total: customers.length })
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format')
      } else {
        setError(err.response?.data?.detail || err.message || 'An error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const downloadResultsJSON = () => {
    if (!predictions) return
    const dataStr = JSON.stringify(predictions, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = 'predictions.json'
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const downloadResultsCSV = () => {
    if (!predictions || !customersForPred) return
    const headers = ['Index', 'Gender', 'Age', 'HasDrivingLicense', 'RegionID', 'Switch', 'VehicleAge', 'PastAccident', 'AnnualPremium', 'SalesChannelID', 'DaysSinceCreated', 'WillCrossSell', 'Probability']
    const rows = predictions.map((pred, idx) => {
      const cust = customersForPred[idx]
      return [
        idx + 1,
        cust.Gender,
        cust.Age,
        cust.HasDrivingLicense,
        cust.RegionID,
        cust.Switch,
        cust.VehicleAge,
        cust.PastAccident,
        cust.AnnualPremium,
        cust.SalesChannelID,
        cust.DaysSinceCreated,
        pred.will_cross_sell ? 'Yes' : 'No',
        (pred.probability * 100).toFixed(4) + '%'
      ].join(',')
    })
    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'predictions_with_customers.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const summaryStats = useMemo(() => {
    if (!predictions) return null
    const total = predictions.length
    const interested = predictions.filter(p => p.will_cross_sell).length
    const notInterested = total - interested
    const avgProb = predictions.reduce((sum, p) => sum + p.probability, 0) / total
    return { total, interested, notInterested, avgProb }
  }, [predictions])

  const filteredAndSortedPredictions = useMemo(() => {
    if (!predictions) return null
    let items = predictions.map((pred, idx) => ({ pred, idx, customer: customersForPred?.[idx] }))
    
    if (filterInterested === 'yes') {
      items = items.filter(item => item.pred.will_cross_sell)
    } else if (filterInterested === 'no') {
      items = items.filter(item => !item.pred.will_cross_sell)
    }
    
    items.sort((a, b) => {
      if (sortConfig.key === 'index') {
        return sortConfig.direction === 'asc' ? a.idx - b.idx : b.idx - a.idx
      } else if (sortConfig.key === 'probability') {
        return sortConfig.direction === 'asc' ? a.pred.probability - b.pred.probability : b.pred.probability - a.pred.probability
      } else if (sortConfig.key === 'will_cross_sell') {
        const aVal = a.pred.will_cross_sell ? 1 : 0
        const bVal = b.pred.will_cross_sell ? 1 : 0
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
      }
      return 0
    })
    
    return items
  }, [predictions, customersForPred, filterInterested, sortConfig])

  const handleSort = (key: 'index' | 'probability' | 'will_cross_sell') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Users size={32} style={{ color: 'var(--accent)' }} />
          Batch Prediction
        </h1>
        <p className="text-secondary">Process multiple customers at once (max 500 per request)</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="flex-between mb-4">
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Input Data</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleLoadSample} className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                <FileText size={14} />
                Load Sample
              </button>
              <button onClick={downloadTemplate} className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                <FileSpreadsheet size={14} />
                Download Template
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.25rem' }}>
            <button 
              type="button"
              onClick={() => setInputMode('json')} 
              className={inputMode === 'json' ? 'btn' : 'btn-secondary'} 
              style={{ flex: 1, padding: '0.5rem', justifyContent: 'center' }}
            >
              JSON Input
            </button>
            <button 
              type="button"
              onClick={() => setInputMode('csv')} 
              className={inputMode === 'csv' ? 'btn' : 'btn-secondary'} 
              style={{ flex: 1, padding: '0.5rem', justifyContent: 'center' }}
            >
              CSV Input
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            {inputMode === 'json' ? (
              <div className="form-group">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='[{"Gender": "Male", "Age": 35, ...}, ...]'
                  className="form-input"
                  style={{ minHeight: '300px', fontFamily: 'monospace', fontSize: '0.8125rem', resize: 'vertical' }}
                />
              </div>
            ) : (
              <div className="form-group">
                <div className="mb-3">
                  <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
                    <Upload size={18} />
                    Upload CSV File
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCSVFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                <textarea
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  placeholder='Gender,Age,HasDrivingLicense,...\nMale,35,1,...'
                  className="form-input"
                  style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '0.8125rem', resize: 'vertical' }}
                />
              </div>
            )}
            
            <button type="submit" className="btn" disabled={loading || (inputMode === 'json' ? !jsonInput.trim() : !csvInput.trim())} style={{ width: '100%' }}>
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Predict Batch (max 500)
                </>
              )}
            </button>
          </form>

          {progress && loading && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                <span>Processing...</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.3s' }}></div>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: 'var(--error-light)',
              border: '1px solid var(--error)',
              borderRadius: 'var(--radius)',
              color: 'var(--error)',
            }}>
              <p className="text-sm" style={{ fontWeight: '500', marginBottom: '0.5rem' }}>{error}</p>
              {Object.keys(rowErrors).length > 0 && (
                <div style={{ marginTop: '0.75rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {Object.entries(rowErrors).map(([rowIdx, errs]) => (
                    <div key={rowIdx} style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                      <div style={{ fontWeight: '500', fontSize: '0.75rem' }}>Row {parseInt(rowIdx) + 1}:</div>
                      <ul style={{ marginLeft: '1rem', fontSize: '0.75rem' }}>
                        {errs.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex-between mb-4">
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Results</h2>
            {predictions && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={downloadResultsCSV} className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                  <FileSpreadsheet size={16} />
                  CSV
                </button>
                <button onClick={downloadResultsJSON} className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                  <FileText size={16} />
                  JSON
                </button>
              </div>
            )}
          </div>

          {!predictions && !error && !loading && (
            <div className="text-center text-secondary" style={{ padding: '3rem 1rem' }}>
              <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>Submit batch data to see predictions</p>
            </div>
          )}

          {loading && (
            <div className="text-center" style={{ padding: '3rem 1rem' }}>
              <Loader2 size={48} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
              <p className="text-secondary">Processing batch...</p>
            </div>
          )}

          {predictions && summaryStats && filteredAndSortedPredictions && (
            <div>
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--accent-light)',
                borderRadius: 'var(--radius)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <CheckCircle size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: '500' }}>{predictions.length} predictions processed</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{summaryStats.total}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--success)' }}>{summaryStats.interested}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Interested</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{summaryStats.notInterested}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Not Interested</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{(summaryStats.avgProb * 100).toFixed(1)}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avg Probability</div>
                </div>
              </div>

              <div className="flex-between mb-3" style={{ alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
                  <select 
                    value={filterInterested} 
                    onChange={(e) => setFilterInterested(e.target.value as 'all' | 'yes' | 'no')}
                    className="form-input"
                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', maxWidth: '150px' }}
                  >
                    <option value="all">All</option>
                    <option value="yes">Interested Only</option>
                    <option value="no">Not Interested Only</option>
                  </select>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Showing {filteredAndSortedPredictions.length} of {predictions.length}
                </div>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: 'var(--bg-tertiary)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th onClick={() => handleSort('index')} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', borderBottom: '1px solid var(--border)', cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          # <ArrowUpDown size={12} />
                        </div>
                      </th>
                      <th onClick={() => handleSort('will_cross_sell')} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', borderBottom: '1px solid var(--border)', cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          Prediction <ArrowUpDown size={12} />
                        </div>
                      </th>
                      <th onClick={() => handleSort('probability')} style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', borderBottom: '1px solid var(--border)', cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'flex-end' }}>
                          Probability <ArrowUpDown size={12} />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedPredictions.map((item, idx) => (
                      <tr key={item.idx} style={{ borderBottom: idx < filteredAndSortedPredictions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{item.idx + 1}</td>
                        <td style={{ padding: '0.625rem 0.75rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.25rem 0.625rem',
                            backgroundColor: item.pred.will_cross_sell ? 'var(--success-light)' : 'var(--bg-tertiary)',
                            color: item.pred.will_cross_sell ? 'var(--success)' : 'var(--text-secondary)',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                          }}>
                            {item.pred.will_cross_sell ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {item.pred.will_cross_sell ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontSize: '0.8125rem', fontWeight: '500' }}>
                          {(item.pred.probability * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

export default BatchPredictPage
