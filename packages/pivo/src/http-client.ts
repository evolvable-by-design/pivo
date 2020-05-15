import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

import SemanticOpenApiDoc from './open-api/semantic-open-api-documentation'
import { AuthenticationRequiredError } from './errors'
import AuthenticationService from './authentication-service'
import SemanticHttpResponse from './semantic-http-response'
import OperationSchema from './operation-schema'

export default class HttpClient {
  private baseUrl: string
  constructor (private documentation: SemanticOpenApiDoc) {
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
      return await this.axiosInstance()(options)
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
    return this.call(options)
      .then(response =>
        SemanticHttpResponse.fromSuccess(
          response,
          operation,
          this.documentation,
          this
        )
      )
      .catch(error =>
        SemanticHttpResponse.fromError(
          error,
          operation,
          this.documentation,
          this
        )
      )
  }

  async getSemantic (url: string, operation: OperationSchema) {
    return this.semanticCall({ method: 'get', url }, operation)
  }

  private axiosInstance (): AxiosInstance {
    return axios.create(this.getDefaultOptions())
  }

  private getDefaultOptions () {
    return {
      baseURL: this.baseUrl,
      headers: { Authorization: AuthenticationService.getToken() }
    }
  }
}
