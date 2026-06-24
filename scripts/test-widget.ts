import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

const { default: handler } = await import('../api/widget-data')

const mockReq = {
  method: 'GET',
  url: `https://localhost/api/widget-data?email=anujparashar07@gmail.com`,
  headers: { authorization: `Bearer ${process.env.WIDGET_SECRET}` },
}
const mockRes = {
  setHeader() {},
  status(code: number) {
    return {
      json(body: unknown) {
        console.log(`Status: ${code}`)
        console.log(JSON.stringify(body, null, 2))
      },
    }
  },
}

console.log('Fetching widget data...\n')
await handler(mockReq, mockRes)
