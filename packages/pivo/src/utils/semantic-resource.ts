import { AxiosResponse } from 'axios'

import { HypermediaData, HypermediaControl } from '../domain'
import { ExpandedOpenAPIV3Semantics } from '../open-api/open-api-types'
import DataConstraintsChecker from '../data-constraints-checker'
import Option from './option'
import OperationReader from '../open-api/readers/operation-reader'
import { handleRuntimeExpression } from '../open-api/utils'
import { flatMap } from './transformation'

export default class SemanticResourceUtils {
  public static doesSchemaMatch (
    value: HypermediaData<any>,
    schema: ExpandedOpenAPIV3Semantics.BaseSchemaObject
  ) {
    const validate = DataConstraintsChecker.compile(schema)
    return validate(value)
  }

  // Maybe the name is incorrect, it may be the higher amount. To be verified...
  static sortSchemaWithLowerAmountOfRequiredParameters (
    a: ExpandedOpenAPIV3Semantics.SchemaObject,
    b: ExpandedOpenAPIV3Semantics.SchemaObject
  ): number {
    return (
      (b.required ? b.required.length : 0) -
      (a.required ? a.required.length : 0)
    )
  }

  public static findClosestSchema (
    schemas: ExpandedOpenAPIV3Semantics.SchemaObject[],
    control: HypermediaControl
  ): ExpandedOpenAPIV3Semantics.SchemaObject {
    // TODO look deeper into the schemas, don't limit to first level
    const parameters = control instanceof Object ? control.parameters || {} : {}
    const controlProperties = Object.keys(parameters)
    const match = schemas
      .map(schema => {
        const matchingPropertiesCount = Object.keys(
          schema.properties || {}
        ).filter(p => controlProperties.includes(p)).length
        return [schema, matchingPropertiesCount] as [
          ExpandedOpenAPIV3Semantics.SchemaObject,
          number
        ]
      })
      .sort((a, b) => b[1] - a[1])
      .map(([schema]) => schema)

    return Option.ofOptional(match)
      .map(match => match[0])
      .getOrElse(schemas[0])
  }

  public static addDefaultValuesToOperationSchema (
    hypermediaControl: HypermediaControl,
    linkSchema: ExpandedOpenAPIV3Semantics.LinkObject,
    operation: ExpandedOpenAPIV3Semantics.OperationObject,
    originHttpResponse: AxiosResponse<any>
  ): ExpandedOpenAPIV3Semantics.OperationObject {
    const operationCopy = Object.assign({}, operation)

    if (operationCopy.parameters !== undefined) {
      operationCopy.parameters.forEach(param => {
        this.findDefaultParameterValue(
          param.name,
          hypermediaControl,
          linkSchema,
          originHttpResponse
        ).ifPresent(defaultValue => {
          param.schema = {
            ...param.schema,
            default: defaultValue
          } as ExpandedOpenAPIV3Semantics.SchemaObject
        })
      })
    }

    OperationReader.requestBodySchema(operationCopy)
      .map(schema => schema.properties)
      .ifPresent(props =>
        Object.entries(props).forEach(([name, prop]) => {
          this.findDefaultParameterValue(
            name,
            hypermediaControl,
            linkSchema,
            originHttpResponse
          ).ifPresent(defaultValue => {
            prop.default = defaultValue
          })
        })
      )

    return operationCopy
  }

  public static findDefaultParameterValue (
    parameterName: string,
    hypermediaControl: HypermediaControl,
    linkSchema: ExpandedOpenAPIV3Semantics.LinkObject,
    originHttpResponse: AxiosResponse<any>
  ): Option<unknown> {
    return this.findDefaultParameterValueInHypermediaControl(
      parameterName,
      hypermediaControl
    ).orElse(() =>
      this.findDefaultParameterValueWithLinkSchema(
        parameterName,
        linkSchema,
        originHttpResponse
      )
    )
  }

  public static findDefaultParameterValueInHypermediaControl (
    parameter: string,
    hypermediaControl: HypermediaControl
  ): Option<unknown> {
    if (
      hypermediaControl instanceof Object &&
      hypermediaControl?.parameters !== undefined
    ) {
      return Option.ofOptional(hypermediaControl.parameters[parameter])
    } else {
      return Option.empty()
    }
  }

  public static findDefaultParameterValueWithLinkSchema (
    parameter: string,
    linkSchema: ExpandedOpenAPIV3Semantics.LinkObject,
    originHttpResponse: AxiosResponse<any>
  ): Option<unknown> {
    if (linkSchema?.parameters?.[parameter] !== undefined) {
      return handleRuntimeExpression(
        linkSchema.parameters[parameter],
        originHttpResponse
      )
    } else {
      return Option.empty()
    }
  }

  public static flattenObjectProperties (
    properties: { [name: string]: ExpandedOpenAPIV3Semantics.SchemaObject }
  ): [string, ExpandedOpenAPIV3Semantics.SchemaObject][] {
    return flatMap(
      Object.entries(properties),
      ([name, schema]) => this.flattenObjectsSchema(name, schema)
    )
  }

  public static flattenObjectsSchema (
    name: string,
    schema: ExpandedOpenAPIV3Semantics.SchemaObject
  ): [string, ExpandedOpenAPIV3Semantics.SchemaObject][] {
    if (schema.type !== 'object') {
      return [[name, schema]]
    } else {
      const children = this.flattenObjectProperties(schema?.properties || {})

      const shouldPrefixNames = schema['x-affiliation'] === 'parent'
      const prefix = shouldPrefixNames ? `${name}.` : ''

      return children.map(([cKey, cValue]) => [`${prefix}${cKey}`, cValue])
    }
  }

  public static getNestedValue <T, A = any> (data: T, path: string): A {
    return path.split('.').reduce((d, fragment) => d[fragment], data)
  }

  // { first: { second: { third: value }}} -> path = first.second.third.value or first['second']['third']['value']
  // { second: { third: value }} -> path = second.third.value
  // { third: value } -> path = third.value
  // value -> path = value
}
