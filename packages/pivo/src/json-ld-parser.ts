import { cast, mapObject, Map } from './utils/transformation'
import { OpenAPIV3Semantics } from './open-api/open-api-types'
import { JsonLD } from './domain'

export function replaceCuriesWithExpandedUrl (
  document: OpenAPIV3Semantics.Document
): OpenAPIV3Semantics.Document {
  if (document['@context'] === undefined) {
    return document
  }

  const replacements = getNamespacesUrl(document['@context'])
  const documentCopy: OpenAPIV3Semantics.Document = Object.assign({}, document)
  return replace(documentCopy, replacements)
}

export function getNamespacesUrl (context: JsonLD.Context): Map<string> {
  const vocabularies = Object.entries(context)
    .filter(
      ([_, value]) =>
        typeof value === 'string' &&
        (value.startsWith('http://') || value.startsWith('https://'))
    )
    .reduce((res, [key, value]) => {
      res[key] = value
      return res
    }, {})

  return vocabularies
}

function getSemanticMappings (
  document: OpenAPIV3Semantics.Document,
  semanticSelector: (key: string, el: any) => string
): Map<string> {
  if (document['@context'] === undefined) {
    return {}
  }

  const context = document['@context']
  // const vocabulariesUrl = getNamespacesUrl(context)

  const alias = mapObject(context, (key, value) => {
    const strToCompare = semanticSelector(key, value)
    console.log(`semanticSelector(${key}, ${value}) = ${strToCompare}`)
    if (strToCompare === undefined) {
      return undefined
    }

    return [key, strToCompare]
  })

  return mapObject(alias, (key, value) => {
    const valueToKeep: string = value instanceof Array ? value[0] : value
    return [key, valueToKeep]
  }) as Map<string>

  // return Object.entries({ ...alias, ...vocabulariesUrl }).reduce(
  //   (acc, [key, value]) => {
  //     if (acc[key] !== undefined) {
  //       console.warn(
  //         'More than one semantic identifier found for property ' + key
  //       )
  //     }

  //     acc[key] = value
  //     return acc
  //   },
  //   {}
  // )
}

export function getAllSemanticIdentifiers (
  document: OpenAPIV3Semantics.Document
): Map<string> {
  return getSemanticMappings(document, (_, value) =>
    value instanceof Object ? value['@id'] : value
  )
}

export function getAllSemanticTypes (
  document: OpenAPIV3Semantics.Document
): Map<string> {
  return getSemanticMappings(document, (key, value) =>
    value instanceof Object ? value['@type'] : startsWithUppercase(key) ? value : undefined
  )
}

export const replaceAllVocab: (
  document: OpenAPIV3Semantics.Document
) => object = document => {
  const replacements = document['@context']
    ? getNamespacesUrl(document['@context'])
    : {}

  return replaceInObject(Object.assign({}, document), replacements)
}

function replace<A> (value: A, replacements: Map<string>): A {
  if (value instanceof Object && !(value instanceof Array)) {
    return replaceInObject(value, replacements) as A
  } else if (value instanceof Array) {
    return cast<A>(
      replaceInArray(value, replacements),
      value.constructor as { new (): A }
    )
  } else if (typeof value === 'string') {
    return cast<A>(
      replaceInString(value, replacements),
      value.constructor as { new (): A }
    )
  } else {
    return value
  }
}

function replaceInObject (object: Object, replacements: Map<string>): Object {
  return mapObject(object, (key, value) => [key, replace(value, replacements)])
}

function replaceInArray (array: unknown[], replacements: Map<string>): any[] {
  return array.map((value: any) => replace(value, replacements))
}

function replaceInString (value: string, replacements: Map<string>): string {
  const eventualVocabName = value.split(':')[0]
  const eventualVocabFound = replacements[eventualVocabName]
  if (eventualVocabFound) {
    return value.replace(`${eventualVocabName}:`, eventualVocabFound)
  }

  // no replacement found
  return value
}

function startsWithUppercase(s: string) {
  return s.charAt(0).toUpperCase() === s.charAt(0)
}
