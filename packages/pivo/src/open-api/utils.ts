import { ExpandedOpenAPIV3Semantics } from './open-api-types'
import OpenApiReaders from './readers'
import Option from '../utils/option'
import { DataSemantics } from '../domain'
import { AxiosResponse } from 'axios'

export function updateRequestBodySchema<
  A extends ExpandedOpenAPIV3Semantics.OperationObject
> (operation: A, schema: ExpandedOpenAPIV3Semantics.SchemaObject): A {
  const operationCopy = Object.assign({}, operation)

  Option.ofOptional(operationCopy?.requestBody?.content)
    .map(
      contents =>
        contents['application/json'] || contents[Object.keys(contents)[0]]
    )
    .ifPresent(content => {
      content.schema = schema
    })

  return operationCopy
}

export function allRequiredParamsHaveAValue (
  operation: ExpandedOpenAPIV3Semantics.OperationObject,
  parameters: object = {},
  body: object = {}
): boolean {
  const requiredParamWithoutDefaultValue = getQueryParametersWithoutValue(
    operation,
    parameters,
    true
  )
  const foundRequiredParamWithoutDefaultValue =
    requiredParamWithoutDefaultValue.length > 0

  const maybeBodySchema = OpenApiReaders.OperationReader.requestBodySchema(
    operation
  )

  const requiredArgs = maybeBodySchema
    .map(bodySchema => bodySchema.required || [])
    .getOrElse([])

  if (requiredArgs.length === 0) {
    return !foundRequiredParamWithoutDefaultValue
  }

  const bodyParamsWithoutDefaultValue = getBodyParametersWithoutValue(
    operation,
    body,
    true
  )
  const foundRequiredBodyParamsWithoutDefaultValue: boolean =
    bodyParamsWithoutDefaultValue.length > 0

  return (
    !foundRequiredParamWithoutDefaultValue &&
    !foundRequiredBodyParamsWithoutDefaultValue
  )
}

export function getQueryParametersWithoutValue (
  operation: ExpandedOpenAPIV3Semantics.OperationObject,
  parameters: object = {},
  required: boolean = true
): ExpandedOpenAPIV3Semantics.ParameterObject[] {
  return (
    operation?.parameters?.filter(
      parameter =>
        parameter.required === required &&
        parameter?.schema?.default === undefined &&
        parameters[parameter.name] === undefined
    ) || []
  )
}

export function getBodyParametersWithoutValue (
  operation: ExpandedOpenAPIV3Semantics.OperationObject,
  body: object = {},
  required: boolean = true
): ExpandedOpenAPIV3Semantics.ParameterObject[] {
  const maybeBodySchema = OpenApiReaders.OperationReader.requestBodySchema(
    operation
  )

  const requiredArgs = maybeBodySchema
    .map(bodySchema => bodySchema.required || [])
    .getOrElse([])

  const bodyParamsWithoutDefaultValue = maybeBodySchema
    .map(bodySchema => bodySchema.properties)
    .map(properties =>
      Object.entries(properties)
        .filter(([key]) => !required || requiredArgs.includes(key))
        .filter(
          ([key, value]) =>
            value.default === undefined && body[key] === undefined
        )
        .map(([_, param]) => param)
    )
    .getOrElse([])

  return bodyParamsWithoutDefaultValue
    .map(paramSchema => schemaToParameters(paramSchema, 'body'))
    .reduce((acc, value) => acc.concat(value), [])
}

export function doesSemanticsMatchOne (
  target: DataSemantics | DataSemantics[],
  toCompare: DataSemantics | DataSemantics[] | undefined
): boolean {
  if (toCompare === undefined) {
    return false
  } else if (target instanceof Array) {
    return (
      toCompare instanceof Array &&
      target.find(semantics => toCompare.includes(semantics)) !== undefined
    )
  } else {
    return toCompare instanceof Array
      ? toCompare.includes(target)
      : toCompare === target
  }
}

export function doesSemanticsMatchAll (
  target: DataSemantics | DataSemantics[],
  toCompare: DataSemantics | DataSemantics[]
) {
  if (target instanceof Array) {
    return (
      toCompare instanceof Array &&
      target.find(semantics => !toCompare.includes(semantics)) !== undefined
    )
  } else {
    return toCompare instanceof Array
      ? toCompare.includes(target)
      : toCompare === target
  }
}

export function doesSchemaSemanticsMatch (
  target: DataSemantics | DataSemantics[],
  schema: ExpandedOpenAPIV3Semantics.SchemaObject
) {
  return (
    doesSemanticsMatchOne(target, schema['@id']) ||
    schema?.oneOf?.find(s => doesSemanticsMatchOne(target, s['@id'])) !==
      undefined
  )
}

export function doesSemanticTypeMatch (
  target: DataSemantics | DataSemantics[],
  schema: ExpandedOpenAPIV3Semantics.SchemaObject
) {
  return (
    doesSemanticsMatchOne(target, schema['@type']) ||
    schema?.oneOf?.find(s => doesSemanticsMatchOne(target, s['@type'])) !==
      undefined
  )
}

export function schemaToParameters (
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

// The OpenApi specification for runtime expressions can be found here: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#runtimeExpression
export function handleRuntimeExpression (
  expression: string,
  response: AxiosResponse
): Option<unknown> {
  if (expression === '$url') {
    return Option.ofOptional(response.request.url)
  } else if (expression === '$statusCode') {
    return Option.ofOptional(response.status.toString())
  } else if (expression === '$method') {
    return Option.ofOptional(response.request.method)
  } else if (expression.startsWith('$request.')) {
    // const source = expression.substring('$request.'.length)

    return Option.empty()
  } else if (expression.startsWith('$response.')) {
    const source = expression.substring('$response.'.length)

    if (source.startsWith('header.')) {
      const token = source.substring('header.'.length)
      return Option.ofOptional(response.headers[token])
    } else if (source.startsWith('query.')) {
      // TODO
      console.warn(
        `OpenApi runtime expressions $response.query.** are not supported yet. We were looking for ${expression} in ${JSON.stringify(
          response
        )}`
      )
      return Option.empty()
    } else if (source.startsWith('path.')) {
      // TODO
      console.warn(
        `OpenApi runtime expressions $response.path.** are not supported yet. We were looking for ${expression} in ${JSON.stringify(
          response
        )}`
      )
      return Option.empty()
    } else if (source.startsWith('body#')) {
      const jsonPointer = source.substring('body#'.length)
      return resolveJsonPointer(jsonPointer, response.data)
    } else {
      return Option.empty()
    }
  } else {
    return Option.empty()
  }
}

export function resolveJsonPointer (
  jsonPointer: string,
  data: any
): Option<unknown> {
  if (data instanceof Array) {
    return Option.empty()
  } else {
    const fragments = jsonPointer.substring(1).split('/')
    const result = fragments.reduce(
      (source, fragment) => source[fragment],
      data
    )
    return Option.ofOptional(result)
  }
}
