import { DataSemantics } from '../domain'
import { ExpandedOpenAPIV3Semantics } from '../open-api/open-api-types'
import SemanticResourceUtils from './semantic-resource'
import { doesSchemaSemanticsMatch, doesSemanticTypeMatch } from './semantics'
import Option from './option'

type Schema = ExpandedOpenAPIV3Semantics.SchemaObject

export function findPathsToValueAndSchema (
  semanticKey: DataSemantics | DataSemantics[],
  schema: Schema | undefined
): Option<[string, Schema]> {
  const result:
    | [string, Schema]
    | undefined = SemanticResourceUtils.flattenObjectProperties(schema?.properties || {})
    .find(
      ([_, value]: [string, Schema]) =>
        doesSchemaSemanticsMatch(semanticKey, value) ||
        doesSemanticTypeMatch(semanticKey, value)
    )

  return Option.ofOptional(result)
}