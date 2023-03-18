import { config } from './baseConfig'
import { init } from './request'
import example from './api/example'
function getApis() {
  return {
    example: example
  }

  //在打包工具环境下可以使用元数据直接解析api配置文件
  // const modules = import.meta.glob('./api/*.ts', { eager: true })
  // const apis: Record<string, Record<string, $ApiItem>> = {}

  // Object.keys(modules).forEach((fileName) => {
  //   const name = fileName.match(/([^\/]+)(?=(.ts$))/g)?.[0]

  //   if (name) {
  //     apis[name] = (modules[fileName] as Record<string, Record<string, $ApiItem>>).default
  //   }
  // })
  // return apis
}
//根据实际情况持续扩充
const typeDic: Record<string, string[]> = {
  json: ['application/json'],
  formData: ['multipart/form-data'],
  blob: ['application/octet-stream', 'multipart/form-data', 'application/vnd.ms-excel', 'text/csv', 'application/pdf'],
  text: ['text/plain ', 'text/html', 'application/xml', 'text/xml'],
  arrayBuffer: []
}
const initOptions: $RequestInitOptions = {
  config,
  apis: getApis(),
  getHeaders: () => {
    return {}
  },

  beforeRequest: (options) => {
    options.data = {
      platform: '122003'
    }
    return true
  },
  requestSuccessed: (options) => {
    return true
  },
  formatResponse: (options) => {
    const { response } = options
    const contentType: any = response.headers.get('content-type')

    for (let key in typeDic) {
      const arr = typeDic[key]
      if (arr.includes(contentType)) return (<any>response)[key]()
    }
    return response
  }
}

export default init(initOptions)
