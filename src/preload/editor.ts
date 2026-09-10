import { contextBridge } from 'electron'
import { editorApi } from './api'

contextBridge.exposeInMainWorld('tp', editorApi)
