declare type RequestMethod = 'get' | 'post' | 'put' | 'delete' | 'GET' | 'POST' | 'PUT' | 'DELETE'
declare type ContentType = 'json' | 'form' | 'upload'

declare interface $ApiItem {
  /**
   * 请求的路径,相对路径会使用配置的host作为域,http/https开头的会直接使用path作为完成的url
   */
  path: string
  method: RequestMethod
  contentType?: ContentType
}

declare interface $RequestConfig {
  /**
   * 请求的主域
   */
  host: string
  /**
   * 请求超时时间 (ms)
   */
  requestTimeout: number
  /**
   * 是否拦截相同的请求 (path,method,data都相同)
   */
  interceptSameRequest: boolean
  /**
   * 拦截相同的请求的节流间隔 (ms)
   */
  interceptIntervalTime: number
}

declare interface $RequestInitOptions {
  /**
   * 请求相关基础配置信息
   */
  config: $RequestConfig
  /**
   * 用于提供请求默认请求头的函数
   */
  getHeaders?: () => HeadersInit
  /**
   * 组织好的ApiItem的二维对象结构
   */
  apis: Record<string, Record<string, $ApiItem>>

  /**
   * @param options 改写options中的值,会影响到后续请求使用的参数 (headers也可以在此处改写,会覆盖getHeaders)
   * @returns 如果请求继续进行则需要ruturn true,return false时会阻止请求发生;也可以直接throw,进入catch块
   */
  beforeRequest?: (options: { data: unknown; apiItem: $ApiItem; requestInit: RequestInit & { params?: Record<string, string | number> } }) => boolean
  /**
   * 请求完成后,对响应的处理,主要针对status的成功/失败分发处理
   * @param options 请求的基础信息以及原始Response对象
   * @returns return true时后续进入then块,return false或者throw则进入catch块
   */
  requestSuccessed?: (options: { data: unknown; apiItem: $ApiItem; response: Response }) => boolean
  /**
   * 请求失败时在此处处理相应的副作用,如,弹窗提示/退出登录/跳转登录页等操作
   */
  requestFailed?: (err: unknown) => void
  /**
   * 格式化响应的处理函数
   */
  formatResponse?: (options: { data: unknown; apiItem: $ApiItem; response: Response }) => Promise<any>
  getLoading?: () => {
    showLoading: () => void
    hideLoading: () => void
  }
}

declare interface $RequestOptions {
  /**
   * 本次请求是否强制穿透重复请求拦截
   */
  crossIntercept?: boolean
  /**
   * 本次请求所携带的请求头
   */
  headers?: HeadersInit
  /**
   * 本次请求额外附加在url上的参数
   */
  params?: Record<string, string | number>
  /**
   * 本次请求是否禁用通用配置中的loading
   */
  unloading?: boolean
  /**
   * 本次请求绕过formater,使用指定格式返回 (source则返回原始Response对象)
   */
  responseFormatType?: 'json' | 'formData' | 'blob' | 'text' | 'arrayBuffer' | 'source'
}

type $requestInitPlus = RequestInit & { params?: Record<string, string | number>; timeout?: number }
