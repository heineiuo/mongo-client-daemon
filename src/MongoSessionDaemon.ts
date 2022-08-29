import Mongodb from 'mongodb'
import { GenericListener } from 'mongodb'

type MongoSessionDaemonOptions = {
  debug?: boolean
  reconnectInterval?: number
}

export class MongoSessionDaemon {
  constructor(url: string, options: MongoSessionDaemonOptions = {}) {
    this.url = url
    this.destroyed = false
    this.connected = false
    this.createSession()
    this.options = { ...options, debug: false, reconnectInterval: 5000 }
  }

  url: string
  destroyed: boolean
  connected: boolean
  connectingPromise?: Promise<void>
  session: Mongodb.MongoClient
  connectError?: Error
  options: Required<MongoSessionDaemonOptions>

  createSession(): void {
    if (this.destroyed) {
      return
    }

    this.connectingPromise = new Promise(async (resolve) => {
      let handled = false
      let errListener: GenericListener | null = null
      let connectListener: GenericListener | null = null

      connectListener = (): void => {
        if (!handled) {
          if (errListener) {
            this.session.removeListener('error', errListener)
          }
          handled = true
          this.connected = true
          delete this.connectingPromise
          delete this.connectError
          this.keepSession()
          if (this.options.debug) {
            console.log('[mongo client] connected.')
          }
          resolve()
        }
      }

      // Only listen connection fail
      errListener = (err: Error): void => {
        if (!handled) {
          if (this.session && connectListener) {
            this.session.removeListener('connect', connectListener)
          }
          handled = true
          this.connected = false
          delete this.connectingPromise
          this.connectError = err
          setTimeout(() => {
            if (this.options.debug) {
              console.log('Connect failed, reconnect after 5 seconds.')
            }
            this.createSession()
          }, this.options.reconnectInterval)
          // Do not call reject() here to avoid unhandled rejection error
          resolve()
        }
      }

      try {
        const client = new Mongodb.MongoClient(this.url)
        this.session = await client.connect()
        connectListener()
      } catch (e) {
        errListener(e)
        return
      }

      // this.session.once('connect', connectListener)
      // this.session.once('error', errListener)
    })
  }

  keepSession(): void {
    const timer = setInterval(() => {
      // ping server
    }, this.options.reconnectInterval - 10)

    this.session.once('close', () => {
      clearInterval(timer)
      if (this.options.debug && !this.destroyed) {
        console.log('[mongo client] lost connection, reconnect immeditly')
      }
      this.session.removeAllListeners()
      this.createSession()
    })
    this.session.once('error', () => {
      if (this.options.debug) {
        console.log(`[mongodb client] session received an error event`)
      }
      this.session.close()
    })
  }

  // a safe way to get session.
  async getSession(): Promise<Mongodb.MongoClient> {
    await this.ok()
    return this.session
  }

  async ok(): Promise<void> {
    if (this.connectingPromise) {
      await this.connectingPromise
    }
    if (this.connectError) {
      throw this.connectError
    }
  }

  async destroy(): Promise<void> {
    this.destroyed = true
    await new Promise<void>((resolve) => {
      let resolved = false
      this.session.close(() => {
        if (!resolved) {
          resolved = true
          resolve()
        }
      })
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          resolve()
        }
      }, 1000)
    })
  }
}
