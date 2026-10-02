import { createApp } from './app.js'

const port = Number(process.env['PORT'] ?? 3333)

createApp().listen(port, () => {
  console.log(`API Recicla+ ouvindo em http://localhost:${port}`)
})
