import { HypermediaData, HypermediaControl } from '../domain'
import { ExpandedOpenAPIV3Semantics } from '../open-api/open-api-types'
import DataConstraintsChecker from '../data-constraints-checker'
import Option from './option'
import OperationReader from '../open-api/readers/operation-reader'

export default class SemanticDataUtils {
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
    operation: ExpandedOpenAPIV3Semantics.OperationObject
  ): ExpandedOpenAPIV3Semantics.OperationObject {
    if (
      hypermediaControl instanceof Object &&
      hypermediaControl?.parameters !== undefined
    ) {
      const operationCopy = Object.assign({}, operation)

      if (operationCopy.parameters !== undefined)
        operationCopy.parameters.forEach(param => {
          if (hypermediaControl.parameters[param.name] !== undefined) {
            param.schema = {
              ...param.schema,
              default: hypermediaControl.parameters[param.name] as any
            } as ExpandedOpenAPIV3Semantics.SchemaObject
          }
        })

      OperationReader.requestBodySchema(operationCopy)
        .map(schema => schema.properties)
        .ifPresent(props =>
          Object.entries(props).forEach(([name, prop]) => {
            prop.default = hypermediaControl.parameters[name]
          })
        )

      return operationCopy
    } else {
      return operation
    }
  }
}
