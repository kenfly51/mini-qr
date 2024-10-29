import { MiniApp, MiniAppFactory } from '@kenfly51/atomkit'
import { createApp } from 'vue'
import { i18n } from './utils/i18n'
import App from './App.vue'
import './index.css'
import './style.css'

class MyMiniApp extends MiniApp {
  initialize() {
    console.log('MyMiniApp Initialized')
    this.listen('miniapp-message', (data) => {
      console.log('Received in MyMiniApp:', data)
    })
  }

  render(container) {
    createApp(App).use(i18n).mount(container)
  }
}

// Register the Web Component
MiniAppFactory.register('mini-qr', MyMiniApp)
