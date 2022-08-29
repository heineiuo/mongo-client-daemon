# mongo-client-daemon

## Install

```
npm install mongo-client-daemon
```

## Example


```ts
import { MongoSessionDaemon } from 'mongo-client-daemon'
import { Db } from 'mongodb'

const mongoUri = process.env.mongoUri as string
const dbName = process.env.dbName as string
const collectionName = process.env.collectionName as string

const daemon = new MongoSessionDaemon(mongoUri)

const main = async (): Promise<void> => {
  const client = await daemon.getSession()
  const collection = client.db(dbName).collection(collectionName)
  const data = await collection.find({})
  console.log(data)
}

main()

```

## License

MIT