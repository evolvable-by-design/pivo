import { ExpandedOpenAPIV3Semantics } from './open-api/open-api-types'
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
      .map(s => this.bodySchemaToParameters(s, 'body'))
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

    return Object.keys(
      this.getRequestBodySchema()
        .map(s => s.properties)
        .getOrElse({})
    )
      .map(key => [key, parametersWithDefault[key]])
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
      .map(schema => schema.name)
      .map((name: string) => [name, parametersWithDefault[name]])
      .reduce(reduceObject, {})
  }

  public getResponseSchema (
    statusCode: number | string
  ): Option<ExpandedOpenAPIV3Semantics.ResponseObject> {
    return OperationReader.responseSchema(this.schema, statusCode)
  }

  private bodySchemaToParameters (
    schema: ExpandedOpenAPIV3Semantics.SchemaObject,
    from: 'body' | 'path' | 'query' | 'header'
  ): ExpandedOpenAPIV3Semantics.ParameterObject[] {
    return Option.ofOptional(schema.properties)
      .map(properties => Object.entries(properties))
      .map(propertiesEntries =>
        propertiesEntries.map(([key, s]) => {
          return {
            name: key,
            in: from,
            description: s.description,
            required: schema.required?.includes(key) || false,
            schema: s,
            '@id': s['@id']
          }
        })
      )
      .getOrElse([])
  }
}
