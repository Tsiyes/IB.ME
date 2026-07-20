import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { bootStage } from './lib/boot'

createApp(App).mount('#app')

// Kick the even-paced ring (App → Engine → Scene → Shell). Shell waits on the scene.
bootStage('app')
