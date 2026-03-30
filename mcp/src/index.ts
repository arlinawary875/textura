#!/usr/bin/env node

// Canvas polyfill MUST be imported before textura/pretext
import './canvas-polyfill.js'

import { init } from 'textura'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server.js'

async function main() {
  // Initialize Yoga WASM
  await init()

  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('textura-mcp: failed to start', err)
  process.exit(1)
})
