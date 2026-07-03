#!/usr/bin/env node
import { printAppUrls } from '../server/network.js'

const webPort = Number(process.env.WEB_PORT || 8080)
const apiPort = Number(process.env.PORT || 4000)

console.log('Management School — open in browser:\n')
printAppUrls({ apiPort, webPort, mode: 'web' })
