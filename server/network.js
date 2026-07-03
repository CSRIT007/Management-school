import os from 'os'

export function getLanIp() {
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return null
}

export function getAppUrls({ apiPort = 4000, webPort = 8080 } = {}) {
  const lan = getLanIp()
  return {
    lan,
    api: {
      local: `http://localhost:${apiPort}`,
      health: `http://localhost:${apiPort}/api/health`,
      lan: lan ? `http://${lan}:${apiPort}` : null,
    },
    web: {
      local: `http://localhost:${webPort}`,
      lan: lan ? `http://${lan}:${webPort}` : null,
    },
  }
}

export function printAppUrls({ apiPort = 4000, webPort = 8080, mode = 'api' } = {}) {
  const urls = getAppUrls({ apiPort, webPort })
  const lan = urls.lan

  if (mode === 'api') {
    console.log(`API:  ${urls.api.health}`)
    if (lan) console.log(`LAN:  http://${lan}:${apiPort}/api/health  (API must be exposed on 0.0.0.0)`)
  }

  console.log(`Web:  ${urls.web.local}  (requires: docker compose up -d)`)
  if (lan) console.log(`LAN:  ${urls.web.lan}  (other devices on same Wi‑Fi)`)

  console.log('')
  console.log('Note: Public internet URL needs router port-forward for port', webPort)
  console.log('      Use localhost or LAN URL on this network.')
}
