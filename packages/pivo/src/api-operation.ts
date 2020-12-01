import { AxiosRequestConfig } from 'axios'

import {
  allRequiredParamsHaveAValue,
  getBodyParametersWithoutValue,
  getUrlParametersWithoutValue
} from './open-api/utils'
import OperationSchema from './operation-schema'
import * as RequestBuilder from './request-builder'
import SemanticHttpResponse from './semantic-http-response'
import { ExpandedOpenAPIV3Semantics } from './open-api/open-api-types'
import HttpClient from './http-client'
import { AuthenticationRequiredError } from './errors'
import PivoUtils from './pivo-utils'

export default class ApiOperation {
  public readonly operationSchema: OperationSchema
  public readonly userShouldAuthenticate: boolean

  constructor (
    private operation: ExpandedOpenAPIV3Semantics.OperationObject,
    private httpClient: HttpClient
  ) {
    this.operationSchema = new OperationSchema(operation)
    this.userShouldAuthenticate = operation.userShouldAuthenticate || false
  }

  public hasParameters = () => this.operationSchema.hasParameters()

  public async invoke (parameters?: object, promptForMissingParameters: boolean = true): Promise<SemanticHttpResponse> {
    if (this.operationSchema.schema.userShouldAuthenticate) {
      throw new AuthenticationRequiredError()
    } else {
      // TODO: First, check that parameters are valid
      let params = parameters || {}
      const valuesOfMissingParams = promptForMissingParameters ? PivoUtils.promptToGetValueOfMissingParameters(this, parameters) : {}
      params = { ...parameters, ...valuesOfMissingParams }
      const request = this.buildRequest(params)
      return await this.httpClient.semanticCall(request, this.operationSchema)
    }
  }

  public missesRequiredParameters (parameters?: object): boolean {
    const { params, body } = this.computeParamsAndBody(parameters)
    return !allRequiredParamsHaveAValue(this.operation, params, body)
  }

  public getMissingParameters (
    parameters?: object,
    requiredOnly: boolean = true
  ): ExpandedOpenAPIV3Semantics.ParameterObject[] {
    if (parameters === undefined) {
      return this.operationSchema
        .getParameters()
        .filter(
          parameter =>
            (requiredOnly ? parameter.required : true) &&
            parameter.schema?.default === undefined
        )
    } else {
      const { params, body } = this.computeParamsAndBody(parameters)
      const missingUrlParams = getUrlParametersWithoutValue(
        this.operation,
        params,
        requiredOnly
      )

      const missingBodyParams = getBodyParametersWithoutValue(
        this.operation,
        body,
        requiredOnly
      )

      return missingUrlParams.concat(missingBodyParams)
    }
  }

  public buildDefaultRequest () {
    return this.operation.verb === 'get' ? this.buildRequest({}) : undefined
  }

  public buildRequest (parameters: object): AxiosRequestConfig {
    // TODO: return details about missing params
    if (this.missesRequiredParameters(parameters)) {
      throw new Error('Required parameters are missing')
    }

    const { params, body } = this.computeParamsAndBody(parameters)
    return RequestBuilder.buildRequest(this.operationSchema, params, body)
  }

  private computeParamsAndBody (
    parameters?: object
  ): { params: object; body: object } {
    return {
      params: this.operationSchema.computeParams(parameters),
      body: this.operationSchema.computeBody(parameters)
    }
  }
}
