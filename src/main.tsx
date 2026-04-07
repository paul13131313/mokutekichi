import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Cesiumの静的アセットのベースURLを設定
;(window as unknown as Record<string, string>).CESIUM_BASE_URL = '/mokutekichi/cesium/'

createRoot(document.getElementById('root')!).render(<App />)
