import { ExpandedOpenAPIV3Semantics } from '../open-api-types'
import Option from '../../utils/option'

export default class SchemaReader {
  public static findTypeInSchema (
    predicate: (s: ExpandedOpenAPIV3Semantics.SchemaObject) => boolean,
    schema?: ExpandedOpenAPIV3Semantics.SchemaObject
  ): Option<ExpandedOpenAPIV3Semantics.SchemaObject> {
    if (schema === undefined) {
      return Option.ofOptional()
    } else if (predicate(schema)) {
      return Option.of(schema)
    } else if (schema.oneOf) {
      return schema.oneOf
        .map(prop => SchemaReader.findTypeInSchema(predicate, prop))
        .reduce((acc, b) => acc || b)
    } else if (schema.type === 'object') {
      if (!schema.properties) {
        return Option.ofOptional()
      }

      return Object.values(schema.properties)
        .map(prop => SchemaReader.findTypeInSchema(predicate, prop))
        .reduce((acc, b) => acc || b)
    } else if (schema.type === 'array') {
      if (!schema.items) {
        return Option.ofOptional()
      }

      return SchemaReader.findTypeInSchema(predicate, schema.items)
    } else {
      return Option.ofOptional()
    }
  }
}
