import { ExpandedOpenAPIV3Semantics } from './open-api/open-api-types'
import { schemaPropertiesToParameters } from './open-api/utils'
import OperationReader from './open-api/readers/operation-reader'
import Option from './utils/option'
import { Map, reduceObject } from './utils/transformation'

export default class OperationSchema {
  constructor (readonly schema: ExpandedOpenAPIV3Semantics.OperationObject) {}

  public hasParameters (): boolean {
    return this.getParameters().length !== 0
  }

  public getParameters (): ExpandedOpenAPIV3Semantics.ParameterObject[] {
    const parametersFromSchema = this.getRequestBodySchema()
      .map(s => schemaPropertiesToParameters(s, 'body'))
      .getOrElse([])

    return [...this.getParametersSchema(), ...parametersFromSchema]
  }

  public getDefaultParametersValue (): Map<unknown> {
    return {
      ...this.getBodyDefaultValue(),
      ...this.getParametersDefaultValue()
    }
  }

  public getRequestBodySchema (): Option<
    ExpandedOpenAPIV3Semantics.SchemaObject
  > {
    return OperationReader.requestBodySchema(this.schema)
  }

  /**
   * Computes an object with the default value of each
   * parameter of the request body.
   *
   * @returns the default value of the request body
   */
  public getBodyDefaultValue (): object {
    return this.getRequestBodySchema()
      .map(schema => schema.properties)
      .map(properties =>
        Object.entries(properties)
          .filter(([_, value]) => value.default !== undefined)
          .reduce((acc, [name, value]) => {
            acc[name] = value.default
            return acc
          }, {})
      )
      .getOrElse({})
  }

  public computeBody (parameters?: object): object {
    const parametersWithDefault = {
      ...this.getParametersDefaultValue(),
      ...parameters
    }

    return Object.entries(
      this.getRequestBodySchema()
        .map(s => s.properties)
        .getOrElse({})
    )
      .map(([key, schema]) => [
        key,
        this.findValue(parametersWithDefault, key, schema['@id'])
      ])
      .reduce(reduceObject, {})
  }

  public getParametersSchema (
    type?: string
  ): ExpandedOpenAPIV3Semantics.ParameterObject[] {
    return (this.schema.parameters || []).filter(
      param => type === undefined || param.in === type
    )
  }

  /**
   * Computes an object with the default value of each
   * parameter of the path, query string and headers
   *
   * @returns the default value of the path, query string and headers parameters
   */
  public getParametersDefaultValue (): Map<unknown> {
    const defaultParameters = this.getParametersSchema()
      .filter(param => param?.schema?.default !== undefined)
      .reduce((acc, param) => {
        acc[param.name] = param?.schema?.default
        return acc
      }, {})

    return defaultParameters
  }

  public computeParams (parameters?: object): object {
    const parametersWithDefault = {
      ...this.getParametersDefaultValue(),
      ...parameters
    }

    return this.getParametersSchema()
      .map(schema => {
        return { name: schema.name, semantics: schema['@id'] }
      })
      .map(({ name, semantics }) => [
        name,
        this.findValue(parametersWithDefault, name, semantics)
      ])
      .reduce(reduceObject, {})
  }

  public getResponseSchema (
    statusCode: number | string
  ): Option<ExpandedOpenAPIV3Semantics.ResponseObject> {
    return OperationReader.responseSchema(this.schema, statusCode)
  }

  private findValue (
    parameters: object,
    parameterName: string,
    parameterSemantics: string | string[]
  ): unknown {
    const maybeValueFromSemantics: unknown | undefined =
      parameterSemantics instanceof Array
        ? parameterSemantics
            .map(s => parameters[s])
            .find(el => el !== undefined)
        : parameters[parameterSemantics]

    return maybeValueFromSemantics !== undefined
      ? maybeValueFromSemantics
      : parameters[parameterName]
  }
}
