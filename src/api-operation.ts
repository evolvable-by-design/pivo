import SemanticOpenApiDoc from './open-api/semantic-open-api-documentation'
import { PivoApiOperationSchema } from './domain'
import { allRequiredParamsHaveAValue } from './open-api/utils'
import OperationSchema from './operation-schema'
import * as RequestBuilder from './request-builder'

export default class ApiOperation {
  private operationSchema: OperationSchema
  public readonly userShouldAuthenticate: boolean

  constructor (
    private operation: PivoApiOperationSchema,
    private apiDocumentation: SemanticOpenApiDoc
  ) {
    this.operationSchema = new OperationSchema(operation)
    this.userShouldAuthenticate = operation.userShouldAuthenticate
  }

  public hasParameters = () => this.operationSchema.hasParameters()

  /*async call (values, parameters) {
    if (this.userShouldAuthenticate) {
      throw new AuthenticationRequiredError()
    }

    return this.httpCaller.semanticCall(
      this.buildRequest(values, parameters),
      this.operation
    )
  }*/

  public missesRequiredParameters (): boolean {
    const { params, body } = this.computeParamsAndBody()
    return !allRequiredParamsHaveAValue(this.operation, params, body)
  }

  public buildDefaultRequest () {
    return this.operation.verb === 'get' ? this.buildRequest({}) : undefined
  }

  public buildRequest (parameters: object) {
    // TODO: return details about missing params
    const { params, body } = this.computeParamsAndBody(parameters)

    if (this.missesRequiredParameters()) {
      throw new Error('Required parameters are missing')
    }

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
