const jsonServer = require('json-server')
const path = require('path')
const { ensureDemoUser, getDemoCredentials } = require('./demoUser.cjs')

const dbPath = path.join(__dirname, '..', 'src', 'data', 'db.json')
const router = jsonServer.router(dbPath)
const user = ensureDemoUser(router)
const { password } = getDemoCredentials()

console.log(`Demo account ready: ${user.email}`)
console.log(`Password source: ${process.env.DEMO_PASSWORD ? 'DEMO_PASSWORD environment variable' : 'default backend seed value'}`)
console.log(`Password length: ${password.length}`)
