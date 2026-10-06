import { Resolver } from 'node:dns/promises'

const mongoDnsServers = (process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean)

export async function getMongoConnectionUrl() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI
  if (!mongoUrl) {
    throw new Error('MongoDB is not configured. Set MONGO_URL in the deployment environment.')
  }

  if (!mongoUrl.startsWith('mongodb+srv://')) {
    return mongoUrl
  }

  const parsedUrl = new URL(mongoUrl)
  const resolver = new Resolver()
  resolver.setServers(mongoDnsServers)
  const records = await resolver.resolveSrv(`_mongodb._tcp.${parsedUrl.hostname}`)

  if (!records.length) {
    throw new Error(`No MongoDB SRV records found for ${parsedUrl.hostname}`)
  }

  const hosts = records
    .sort((a, b) => a.priority - b.priority || b.weight - a.weight)
    .map((record) => `${record.name.replace(/\.$/, '')}:${record.port}`)

  parsedUrl.protocol = 'mongodb:'
  parsedUrl.hostname = ''
  parsedUrl.host = hosts.join(',')
  parsedUrl.searchParams.set('tls', 'true')
  return parsedUrl.toString()
}
