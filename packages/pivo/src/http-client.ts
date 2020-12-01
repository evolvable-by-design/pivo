import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

import SemanticOpenApiDoc from './open-api/semantic-open-api-documentation'
import { AuthenticationRequiredError } from './errors'
import AuthenticationService from './authentication-service'
import SemanticHttpResponse from './semantic-http-response'
import OperationSchema from './operation-schema'

export default class HttpClient {
  private baseUrl: string
  constructor (private documentation: SemanticOpenApiDoc, private defaultHttpConfig?: AxiosRequestConfig) {
    this.baseUrl = documentation
      .getServerUrl()
      .getOrThrow(
        () =>
          new Error(
            'The provided OpenApiDocumentation is incorrect. No server URL found.'
          )
      )
  }

  public async call (options: AxiosRequestConfig): Promise<AxiosResponse<any>> {
    try {
      const response = await this.axiosInstance()({
        ...options,
        data: options.data || null // fix a bug that exclude the content-type if undefined
      })
      return response
    } catch (error) {
      if (error.response && error.response.status === 401) {
        AuthenticationService.currentTokenWasRefusedByApi()
        throw new AuthenticationRequiredError()
      } else {
        throw error
      }
    }
  }

  public async semanticCall (
    options: AxiosRequestConfig,
    operation: OperationSchema
    // resultMapper?: any
  ): Promise<SemanticHttpResponse> {
    try {
      const response = await this.call(options)
      return SemanticHttpResponse.fromSuccess(
        response,
        operation,
        this.documentation,
        this
      )
    } catch (error) {
      return SemanticHttpResponse.fromError(
        error,
        operation,
        this.documentation,
        this
      )
    }
  }

  async getSemantic (url: string, operation: OperationSchema) {
    return this.semanticCall({ method: 'get', url }, operation)
  }

  private axiosInstance (): AxiosInstance {
    const defaultConfig = this.defaultHttpConfig || {}

    return axios.create({
      ...defaultConfig,
      baseURL: this.baseUrl,
      headers: { 
        ...defaultConfig.headers,
        Authorization: AuthenticationService.getToken(),
      },
    })
  }

}
