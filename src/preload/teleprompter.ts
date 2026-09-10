import { contextBridge } from 'electron'
import { teleprompterApi } from './api'

contextBridge.exposeInMainWorld('tp', teleprompterApi)
