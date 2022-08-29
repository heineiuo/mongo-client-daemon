import { MongoSessionDaemon } from '../src/index'
import { Db } from 'mongodb'

const mongoUri = process.env.mongoUri as string
const dbName = process.env.dbName as string
const collectionName = process.env.collectionName as string

const connectDB = async (dbName: string): Promise<Db> => {
  const db = new MongoSessionDaemon(mongoUri)
  const session = await db.getSession()
  return session.db(dbName)
}

const findExample = async (): Promise<void> => {
  const collection = await (await connectDB(dbName)).collection(collectionName)
  const data = await collection.find({})
  console.log(data)
}

console.log(findExample())
