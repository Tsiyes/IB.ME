import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
// Boot ring stays indeterminate until the multitool fast path finishes;
// App.vue then runs playShellAndDwell() for an even specialist-area click sequence.
