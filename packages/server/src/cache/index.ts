import Redis from 'ioredis';

const creds = process.env.REDIS_URL

const client = new Redis(creds);
const subClient = client.duplicate();

export { subClient };
export default client;