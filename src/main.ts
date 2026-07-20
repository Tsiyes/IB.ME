import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { bootStage } from './lib/boot'

// Stage 1 was painted by the inline HTML shell; re-assert + click as modules start.
bootStage('shell')

createApp(App).mount('#app')

// Vue shell is up; Three.js still loading under the splash. Keep #ib-boot until scene.
bootStage('app')
