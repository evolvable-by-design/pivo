import { ExpandedOpenAPIV3Semantics } from '../open-api/open-api-types'
import { DataSemantics } from '../domain'

type SchemaObject = ExpandedOpenAPIV3Semantics.SchemaObject

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