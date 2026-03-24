import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Initialiser les CSS variables (font-size, accent, compact) depuis localStorage
import { useSettingsStore } from './store/settingsStore'
useSettingsStore().init()

app.mount('#app')
