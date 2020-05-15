import { ExpandedOpenAPIV3Semantics } from '../open-api-types'
import Option from '../../utils/option'

import SchemaReader from './schema-reader'

export default class OperationReader {
  static requestBodySchema (
    operation: ExpandedOpenAPIV3Semantics.OperationObject
  ): Option<ExpandedOpenAPIV3Semantics.SchemaObject> {
    return Option.ofOptional(operation.requestBody).map(requestBody => {
      const contents = requestBody.content
      const content =
        contents['application/json'] || contents[Object.keys(contents)[0]]
      return content.schema
    })
  }

  static responseBodySchema (
    operation: ExpandedOpenAPIV3Semantics.OperationObject
  ): Option<ExpandedOpenAPIV3Semantics.SchemaObject> {
    return this.responseSchema(operation)
      .map(response => response?.content)
      .map(contents => _selectContent(contents).schema)
  }

  static responseSchema (
    operation: ExpandedOpenAPIV3Semantics.OperationObject,
    statusCode?: number | string
  ): Option<ExpandedOpenAPIV3Semantics.ResponseObject> {
    return Option.ofOptional(operation.responses).map(responses =>
      statusCode !== undefined ? responses[statusCode.toString()] : responses[0]
    )
  }

  static findTypeInResponse (
    predicate: (s: ExpandedOpenAPIV3Semantics.SchemaObject) => boolean,
    operation: ExpandedOpenAPIV3Semantics.OperationObject
  ): Option<ExpandedOpenAPIV3Semantics.SchemaObject> {
    return OperationReader.responseBodySchema(operation).flatMap(schema =>
      SchemaReader.findTypeInSchema(predicate, schema)
    )
  }
}

function _selectContent (
  contents: ExpandedOpenAPIV3Semantics.ContentsObject
): ExpandedOpenAPIV3Semantics.MediaTypeObject {
  return contents['application/json'] || contents[Object.keys(contents)[0]]
}
