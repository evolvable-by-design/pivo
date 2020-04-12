import { ExpandedOpenAPIV3Semantics } from './open-api-types'
import OpenApiReaders from './readers'

export function updateRequestBodySchema (
  operation: ExpandedOpenAPIV3Semantics.OperationObject,
  schema: ExpandedOpenAPIV3Semantics.SchemaObject
): ExpandedOpenAPIV3Semantics.OperationObject {
  const operationCopy = Object.assign({}, operation)

  if (operationCopy?.requestBody) {
    const contents = operationCopy?.requestBody?.content
    const content =
      contents['application/json'] || contents[Object.keys(contents)[0]]
    content.schema = schema
  }

  return operationCopy
}

export function allRequiredParamsHaveAValue (
  operation: ExpandedOpenAPIV3Semantics.OperationObject,
  parameters: object = {},
  body: object = {}
): boolean {
  const foundRequiredParamWithoutDefaultValue =
    operation?.parameters?.find(
      parameter =>
        parameter.required &&
        parameter?.schema?.default === undefined &&
        parameters[parameter.name] === undefined
    ) !== undefined

  const maybeBodySchema = OpenApiReaders.OperationReader.requestBodySchema(
    operation
  )

  const requiredArgs = maybeBodySchema
    .map(bodySchema => bodySchema.required || [])
    .getOrElse([])

  if (requiredArgs.length === 0) {
    return !foundRequiredParamWithoutDefaultValue
  }

  const foundRequiredBodyParamsWithoutDefaultValue: boolean = maybeBodySchema
    .map(bodySchema => bodySchema.properties)
    .map(
      properties =>
        Object.entries(properties)
          .filter(([key]) => requiredArgs.includes(key))
          .find(
            ([key, value]) =>
              value.default === undefined && body[key] === undefined
          ) !== undefined
    )
    .getOrElse(false)

  return (
    !foundRequiredParamWithoutDefaultValue &&
    !foundRequiredBodyParamsWithoutDefaultValue
  )
}
