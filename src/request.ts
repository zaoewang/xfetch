import qs from 'qs'

const contentTypeDic: Record<ContentType, string> = {
  json: 'application/json',
  form: 'application/x-www-form-urlencoded',
  upload: 'multipart/form-data'
}

export function init(intiOptions: $RequestInitOptions) {
  const {
    apis,
    config,
    beforeRequest = () => true,
    requestSuccessed = () => true,
    requestFailed = () => {},
    getHeaders = () => ({}),
    getLoading = () => ({
      showLoading: () => {},
      hideLoading: () => {}
    }),
    formatResponse
  } = intiOptions
  const { host, interceptIntervalTime, interceptSameRequest, requestTimeout } = config
  const { addIntercept, removeIntercept } = getIntercept()

  return makeTree()
  function wrapper(apiItem: $ApiItem) {
    /**
     * @param data 当此请求包含的数据
     * @param options 当此请求包含的请求配置 (拦截/请求头/url附参等)
     */
    return async (data: unknown = {}, options: $RequestOptions = {}) => {
      const { crossIntercept, headers, params, unloading, responseFormatType } = options
      let { path, method } = apiItem
      if (interceptSameRequest && !crossIntercept) {
        if (addIntercept(path, method, data)) {
          //该拦截不会进入下方catch块,即不会触发removeIntercept
          throw { message: `${path}被认定为重复请求已被拦截`, name: 'interceptError' }
        }
      }
      const { showLoading, hideLoading } = getLoading()
      try {
        path = path.toLowerCase().startsWith('http') ? path : host + path
        const requestInit: $requestInitPlus = {
          headers: Object.assign(getHeaders(), headers),
          timeout: requestTimeout
        }

        if (params) {
          requestInit.params = params
        }
        const beforeRequestOptions = { data, apiItem: { ...apiItem, path }, requestInit }
        if (!beforeRequest(beforeRequestOptions)) {
          throw { message: `请求[${path}]由[beforeRequest]主动取消`, name: 'beforeRequestError' }
        }
        if (!unloading) showLoading()
        const response = await $fetch(beforeRequestOptions.data, beforeRequestOptions.apiItem, beforeRequestOptions.requestInit)
        const requestSuccessedOptions = { data: beforeRequestOptions.data, apiItem: beforeRequestOptions.apiItem, response }

        if (!requestSuccessed(requestSuccessedOptions)) {
          //如果requestSuccessed 返回 false 且没有throw , 主动throw ,如果函数内throw,直接进入catch
          //不管是哪里throw出来的,都会进入下面的catch块
          throw { message: `${path}在[requestSuccessed]中被认定为错误`, name: 'requestSuccessedError' }
        }
        if (responseFormatType) {
          if (responseFormatType == 'source') return response
          else return response[responseFormatType]()
        }

        //最终输出的格式化
        if (formatResponse) {
          return formatResponse(requestSuccessedOptions)
        }

        return response
      } catch (err) {
        console.error('请求时发生错误:', err)

        requestFailed(err)
        //这里还是要throw,保证在调用时进入catch,否则会进入then
        throw err
      } finally {
        if (!unloading) hideLoading()
        if (interceptSameRequest && !crossIntercept) {
          removeIntercept(path, method, data)
        }
      }
    }
  }
  function makeTree() {
    const tar: Record<string, Record<string, ReturnType<typeof wrapper>>> = {}
    Object.keys(apis).forEach((key1) => {
      const apiObj = apis[key1]
      tar[key1] = {}
      Object.keys(apiObj).forEach((key2) => {
        const apiItem = apiObj[key2]
        tar[key1][key2] = wrapper(apiItem)
      })
    })
    return tar
  }
  //拦截相关
  function getIntercept() {
    const reqSet = new Set<string>()
    return {
      addIntercept,
      removeIntercept
    }

    function addIntercept(path: string, method: RequestMethod, data: unknown) {
      if (!data) data = {}
      let jdata = '{}'
      try {
        jdata = JSON.stringify(data)
      } catch (error) {
        console.error(error)
      }
      let hasKey = reqSet.has(`${method}:${path}${jdata}`)
      if (hasKey) {
        console.warn(`重复请求已拦截:${method}请求,URL: ${path},Data: ${jdata}`)
        return true
      }
      reqSet.add(`${method}:${path}${jdata}`)
      return false
    }

    function removeIntercept(path: string, method: RequestMethod, data: unknown) {
      if (!data) data = {}
      let jdata = '{}'
      try {
        jdata = JSON.stringify(data)
      } catch (error) {
        console.error(error)
      }
      setTimeout(() => {
        reqSet.delete(`${method}:${path}${jdata}`)
      }, interceptIntervalTime)
    }
  }
}

export async function $fetch(data: unknown, apiItem: $ApiItem, options: $requestInitPlus = {}) {
  apiItem.method = apiItem.method.toUpperCase() as RequestMethod
  let { method, path, contentType = 'json' } = apiItem
  const { data: body, contentType: contentTypeRes } = formatRequestBody(data, method, contentType)
  options.method = method
  options.headers = Object.assign(
    {
      credentials: 'include'
    },
    options?.headers || {},
    {
      'content-type': contentTypeRes
    }
  )
  if (options.params) {
    path = `${path}${path.includes('?') ? '&' : '?'}${qs.stringify(options.params)}`
  }
  if (method == 'GET') {
    path = `${path}${path.includes('?') ? '&' : '?'}${body}`
  } else {
    options.body = body as BodyInit
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeout || 30 * 1000)
  const response = await fetch(path, {
    ...options,
    signal: controller.signal
  })
  clearTimeout(timer)
  return response

  function formatRequestBody(data: unknown, method: RequestMethod, contentType: ContentType) {
    const contentTypeRes = contentTypeDic[contentType]
    if (method == 'get') {
      return {
        data: qs.stringify(data),
        contentType: contentTypeRes
      }
    }
    if (contentType == 'form') {
      return {
        data: qs.stringify(data),
        contentType: contentTypeRes
      }
    } else if (contentType == 'upload') {
      return {
        data,
        contentType: contentTypeRes
      }
    } else {
      return {
        data: JSON.stringify(data),
        contentType: contentTypeRes
      }
    }
  }
}
