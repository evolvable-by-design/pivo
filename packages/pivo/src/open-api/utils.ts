import { ExpandedOpenAPIV3Semantics } from './open-api-types'
import OpenApiReaders from './readers'
import Option from '../utils/option'
import { DataSemantics } from '../domain'
import { AxiosResponse } from 'axios'

type SchemaObject = ExpandedOpenAPIV3Semantics.SchemaObject

export function updateRequestBodySchema<
  A extends ExpandedOpenAPIV3Semantics.OperationObject
> (operation: A, schema: SchemaObject): A {
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
  const requiredParamWithoutDefaultValue = getUrlParametersWithoutValue(
    operation,
    parameters
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

export function getUrlParametersWithoutValue (
  operation: ExpandedOpenAPIV3Semantics.OperationObject,
  parameters: object = {},
  requiredOnly: boolean = true
): ExpandedOpenAPIV3Semantics.ParameterObject[] {
  return (
    operation?.parameters?.filter(
      parameter => (requiredOnly ? parameter.required : true) &&
      parameter?.schema?.default === undefined &&
      parameters[parameter.name] === undefined &&
      getValueFromSemantics(parameters, parameter["@id"]) === undefined
    ) || []
  )
}

export function getValueFromSemantics(source: object, semantics: string | string[]): unknown {
  if (semantics instanceof Array) {
    return semantics.map(descriptor => source[descriptor]).find(value => value !== undefined)
  } else {
    return source[semantics]
  }
}

export function getBodyParametersWithoutValue (
  operation: ExpandedOpenAPIV3Semantics.OperationObject,
  body: object = {},
  requiredOnly: boolean = true
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
        .filter(([key]) => !requiredOnly || requiredArgs.includes(key))
        .filter(
          ([key, value]) =>
            value.default === undefined && body[key] === undefined
        )
    )
    .getOrElse([])

  return bodyParamsWithoutDefaultValue
    .map(([key, schema]) => schemaToParameters(key, schema, 'body', requiredArgs.includes(key)))
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
  schema: SchemaObject
) {
  return (
    doesSemanticsMatchOne(target, schema['@id']) ||
    schema?.oneOf?.find(s => doesSemanticsMatchOne(target, s['@id'])) !==
      undefined
  )
}

export function doesSemanticTypeMatch (
  target: DataSemantics | DataSemantics[],
  schema: SchemaObject
) {
  return (
    doesSemanticsMatchOne(target, schema['@type']) ||
    schema?.oneOf?.find(s => doesSemanticsMatchOne(target, s['@type'])) !==
      undefined
  )
}

export function schemaToParameters (
  name: string,
  schema: SchemaObject,
  from: 'body' | 'path' | 'query' | 'header',
  required: boolean = false
): ExpandedOpenAPIV3Semantics.ParameterObject {
  return {
    name,
    in: from,
    description: schema.description,
    required: required,
    schema,
    '@id': schema['@id']
  }
}

export function schemaPropertiesToParameters (
  schema: SchemaObject,
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

export function mergeSchema (
  s1: SchemaObject,
  s2: SchemaObject
): SchemaObject {
  const semanticsAsArray: (s: SchemaObject, kind: '@id' | '@type') => string[] =
    (s, kind) => {
      const sValue: string | string[] = s[kind] || [] as string[]
      return sValue instanceof Array ? sValue : [s[kind] as string]
    }
  const mergedSemantics = semanticsAsArray(s1, '@id').concat(semanticsAsArray(s2, '@id'))
  const mergedSemanticType = semanticsAsArray(s1, '@type').concat(semanticsAsArray(s2, '@type'))

  if (Object.keys(s1).length === 0) {
    return s2
  } else if (s1.type === 'object' && s1.type === s2.type) {
    const mergedProperties = [
      ...Object.entries(s2.properties || {}),
      ...Object.entries(s1.properties || {}),
    ].reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})

    return {
      type: 'object',
      '@id': mergedSemantics,
      '@type': mergedSemanticType,
      required: (s1.required || []).concat(s2.required || []),
      properties: mergedProperties
    }
  } else if (s1.type === 'array' && s1.type === s2.type) {
    return {
      type: 'array',
      '@id': mergedSemantics,
      '@type': mergedSemanticType,
      items: {
        allOf: [
          s1.items,
          s2.items
        ]
      } as SchemaObject
    }
  } else {
    return s1
  }
}
