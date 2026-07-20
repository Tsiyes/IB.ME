import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { bootStage } from './lib/boot'

createApp(App).mount('#app')

// Kick / continue the paced ring (App → Engine → Loading → Shell).
bootStage('app')
