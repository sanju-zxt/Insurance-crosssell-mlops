import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import PredictPage from './pages/PredictPage'
import BatchPredictPage from './pages/BatchPredictPage'
import ModelPage from './pages/ModelPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="predict" element={<PredictPage />} />
        <Route path="batch" element={<BatchPredictPage />} />
        <Route path="model" element={<ModelPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
