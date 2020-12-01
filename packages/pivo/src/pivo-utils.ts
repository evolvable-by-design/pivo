import ApiOperation from "./api-operation"
import { ExpandedOpenAPIV3Semantics } from "./open-api/open-api-types"
import * as OpenApiUtils from "./open-api/utils"

function promptToGetValueOfMissingParameters (operation: ApiOperation, parameters: object | undefined): object {
  if (operation && operation.missesRequiredParameters(parameters)) {
    const missingParameters = operation.getMissingParameters(parameters, false)
    const result = {}
    alert(
      'We need a few more information before we can execute: ' +
        operation.operationSchema.schema.summary
    )
    missingParameters.forEach(parameter => {
      const value = promptForValue(parameter)
      result[parameter.name] = value
    })
    return result
  } else {
    return {}
  }
}

function promptForValue (parameterSchema: ExpandedOpenAPIV3Semantics.ParameterObject): unknown {
  const { name, schema, required } = parameterSchema
  if (schema !== undefined) {
    const { type, format } = schema
    
    const requiredMessage = required ? 'required' : 'optional'

    if (type === 'string') {
      return prompt(`Please enter a ${name} as a string (${requiredMessage})`)
    } else if (type === 'number') {
      const value = prompt(
        `Please enter a ${name} as a number (${requiredMessage})`
      ) || ''
      if (format && (format === 'float' || format === 'number')) {
        return parseFloat(value)
      } else {
        return parseInt(value, 10)
      }
    } else if (type === 'array') {
      const castedParameterSchema = parameterSchema.schema as ExpandedOpenAPIV3Semantics.ArraySchemaObject
      const valuesType = castedParameterSchema.items.type as ExpandedOpenAPIV3Semantics.NonArraySchemaObjectType
      const valuesFormat = castedParameterSchema.items.format
      const valuesSchema = { type: valuesType, format: valuesFormat } as ExpandedOpenAPIV3Semantics.NonArraySchemaObject
      const valuesParameterSchema = { name, schema: valuesSchema, in: '' } as ExpandedOpenAPIV3Semantics.ParameterObject

      const values = []
      do {
        values.push(
          promptForValue(valuesParameterSchema)
        )
      } while (window.confirm(`Do you want to input more ${name}?`))
      return values.filter(el => el !== null && el !== undefined && el !== '')
    } else if (type === 'object') {
      alert(`Next, you will input values for ${name}`)
      const parameters = OpenApiUtils.schemaPropertiesToParameters(schema, 'body')
      const values = parameters.reduce((acc, parameter) => {
        acc[parameter.name] = promptForValue(parameter)
        return acc
      }, {})
      alert(`Thank you, you have provided all values for ${name}`)
      return values
    } else {
      console.warn(
        `Unsupported type for parameter ${name}. Only string, number array and object are supported, received ${type}`
      )
      return null
    }
  } else {
    console.warn('Can not get a value for a parameter without a schema, the provided value is the following:')
    console.warn(schema)
    return null
  }
}

export default {
  promptToGetValueOfMissingParameters
}