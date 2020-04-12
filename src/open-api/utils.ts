import { ExpandedOpenAPIV3Semantics } from './open-api-types'
import OpenApiReaders from './readers'
import Option from '../utils/option'

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
