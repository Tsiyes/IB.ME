import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { bootDone, bootStage } from './lib/boot'

bootStage('shell')

const app = createApp(App)
app.mount('#app')

// Vue + BotCheck are interactive; dismiss the splash so the gate can take over.
// Three.js continues loading under the gate (engine → scene stages).
bootStage('app')
bootDone()
