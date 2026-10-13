import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Dev-only: POST a canvas data URL to /__snap?name=x and it is written to $SNAP_DIR/x.png.
// Lets an agent verify renders when the preview pane is hidden. Inert unless SNAP_DIR is set.
function snapPlugin(): Plugin {
  return {
    name: 'snap',
    apply: 'serve',
    configureServer(server) {
      const dir = process.env.SNAP_DIR
      if (!dir) return
      server.middlewares.use('/__snap', (req, res) => {
        const name = (new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? 'snap').replace(/[^\w-]/g, '')
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', () => {
          writeFileSync(`${dir}/${name}.png`, Buffer.from(body.replace(/^data:image\/png;base64,/, ''), 'base64'))
          res.end('ok')
        })
      })
    },
  }
}

// Dev-only: the Generator panel's "Save as project default" POSTs here; the JSON becomes
// public/settings.json, which every build loads as its starting look.
function settingsPlugin(): Plugin {
  return {
    name: 'settings',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__settings', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', () => {
          try {
            JSON.parse(body)
            writeFileSync(resolve(server.config.root, 'public/settings.json'), body)
            res.end('ok')
          } catch {
            res.statusCode = 400
            res.end('bad json')
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), snapPlugin(), settingsPlugin()],
})
