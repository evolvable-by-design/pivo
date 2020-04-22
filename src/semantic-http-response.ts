import OperationSchema from './operation-schema'
import SemanticData from './semantic-data'
import Option from './utils/option'

import { AxiosError, AxiosResponse } from 'axios'
import SemanticOpenApiDoc from './open-api/semantic-open-api-documentation'
import HttpClient from './http-client'

export default class SemanticHttpResponse {
  readonly rawData: any
  constructor (
    readonly data: SemanticData,
    readonly operationSchema: OperationSchema,
    readonly request: object
  ) {
    this.rawData = data.data
  }

  static fromSuccess (
    response: AxiosResponse,
    operation: OperationSchema,
    apiDocumentation: SemanticOpenApiDoc,
    httpClient: HttpClient
  ): SemanticHttpResponse {
    return operation
      .getResponseSchema(response.status)
      .orElse(() => operation.getResponseSchema('default'))
      .map(responseSchema => {
        const resourceSchema = Option.of(response)
          .filter(
            res => res.data !== '' && res.headers['content-type'] !== undefined
          )
          .map(
            res =>
              responseSchema?.content?.[
                res.headers['content-type'].split(';')[0]
              ]?.schema
          )
          .getOrUndefined()

        // const data = resultMapper ? resultMapper(result) : result.data
        const data = response.data

        const semanticData = new SemanticData(
          data,
          apiDocumentation,
          httpClient,
          response,
          resourceSchema,
          responseSchema
        )

        return new SemanticHttpResponse(
          semanticData,
          operation,
          response.request
        )
      })
      .getOrThrow(
        () =>
          new Error(
            'Impossible to find a schema for responses with status ' +
              response.status
          )
      )
  }

  static fromError (
    error: AxiosError,
    operation: OperationSchema,
    apiDocumentation: SemanticOpenApiDoc,
    httpClient: HttpClient
  ): SemanticHttpResponse {
    return Option.ofOptional(error.response)
      .map(response =>
        this.fromSuccess(response, operation, apiDocumentation, httpClient)
      )
      .getOrThrow(
        () =>
          new Error(
            'Impossible to find a schema for responses with error ' + error.code
          )
      )
  }
}
