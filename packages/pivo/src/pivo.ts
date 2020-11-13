import { ActionSemantics, DataSemantics } from './domain'
import SemanticOpenApiDoc from './open-api/semantic-open-api-documentation'
import AuthenticationService from './authentication-service'
import ApiOperation from './api-operation'
import HttpClient from './http-client'
import { OpenAPIV3 } from 'openapi-types'
import Option from './utils/option'
import { ExpandedOpenAPIV3Semantics } from './open-api/open-api-types'
import Axios, { AxiosRequestConfig, Method } from 'axios'

export default class Pivo {
  private httpClient: HttpClient
  private documentation: SemanticOpenApiDoc

  public constructor (documentation: OpenAPIV3.Document, defaultHttpConfig?: AxiosRequestConfig) {
    this.documentation = new SemanticOpenApiDoc(documentation)
    console.log('Created documentation')
    console.log(this.documentation)
    this.httpClient = new HttpClient(this.documentation, defaultHttpConfig)
  }

  static async fetchDocumentationAndCreate (baseApiUrl: string, method: Method = 'options', defaultHttpConfig?: AxiosRequestConfig): Promise<Pivo | undefined> {
    try {
      const response = await Axios({
        method,
        url: baseApiUrl,
        headers: { Authorization: AuthenticationService.getToken() }
      })

      const documentation = response.data
      console.log(new Pivo(documentation, defaultHttpConfig))
      console.log('Created pivo instance')
      return new Pivo(documentation, defaultHttpConfig)
    } catch (error) {
      // TODO handle error
      return undefined
    }
  }

  public does (action: ActionSemantics): Option<ApiOperation> {
    return this.documentation
      .findOperation(action)
      .map(operation => new ApiOperation(operation, this.httpClient))
  }

  public get (data: DataSemantics): Option<ApiOperation> {
    return this.documentation
      .findOperationThatReturns(data)
      .map(operation => new ApiOperation(operation, this.httpClient))
  }

  public list (data: DataSemantics): Option<ApiOperation> {
    return this.documentation
      .findOperationListing(data)
      .map(operation => new ApiOperation(operation, this.httpClient))
  }

  public fromUrl (url: string): Option<ApiOperation> {
    return this.documentation
      .findGetOperationWithPathMatching(url)
      .map(operation => new ApiOperation(operation, this.httpClient))
  }

  public fromOperation (
    operation: ExpandedOpenAPIV3Semantics.OperationObject
  ): ApiOperation {
    return new ApiOperation(operation, this.httpClient)
  }

  /*
  fromId(id) {
    const operation = this.apiDocumentation.findGetOperationWithPathMatching(id)

    return {
      operation: new GenericOperation(operation, this.apiDocumentation, this.httpCaller),
      parameters: extractPathParameters(id, operation.url) // TODO: remake this possible
    }
  }
  */
}
