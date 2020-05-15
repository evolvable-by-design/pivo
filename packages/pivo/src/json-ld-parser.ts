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
  return replaceIdInObject(documentCopy, replacements)
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

// function findSemanticElWithKeyMappings (
function getSemanticMappings (
  document: OpenAPIV3Semantics.Document,
  semanticSelector: (el: any) => string
): Map<string> {
  if (document['@context'] === undefined) {
    return {}
  }

  const context = document['@context']
  const vocabulariesUrl = getNamespacesUrl(context)

  const alias = mapObject(context, (key, value) => {
    const strToCompare = semanticSelector(value)
    if (strToCompare === undefined) {
      return undefined
    }

    const vocabName = strToCompare.split(':')[0]
    const vocabUrl = vocabulariesUrl[vocabName]
    if (vocabUrl === undefined) {
      return undefined
    }

    return [key, strToCompare.replace(`${vocabName}:`, vocabUrl)]
  })

  return Object.entries({ ...alias, ...vocabulariesUrl }).reduce(
    (acc, [key, value]) => {
      if (acc[key] !== undefined) {
        console.warn(
          'More than one semantic identifier found for property ' + key
        )
      }

      acc[key] = value
      return acc
    },
    {}
  )
}

//export function findSemanticWithKeyMappings (
export function getAllSemanticIdentifiers (
  document: OpenAPIV3Semantics.Document
): Map<string> {
  return getSemanticMappings(document, value =>
    value instanceof Object ? value['@id'] : value
  )
}

// export function findSemanticTypeWithKeyMappings (
export function getAllSemanticTypes (
  document: OpenAPIV3Semantics.Document
): Map<string> {
  return getSemanticMappings(document, value =>
    value instanceof Object ? value['@type'] : undefined
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

function replaceId (value: any, replacements: Map<string>): any {
  if (value instanceof Array) {
    return replaceIdInArray(value, replacements)
  } else if (typeof value === 'string') {
    return replaceInString(value, replacements)
  } else {
    return value
  }
}

function searchForReplacement (value: any, replacements: Map<string>): any {
  if (value instanceof Object && !(value instanceof Array)) {
    return replaceIdInObject(value, replacements)
  } else {
    return value
  }
}

function replaceIdInObject<A extends Map<any> | object> (
  object: A,
  replacements: Map<string>
): A {
  return mapObject(object, (key, value) =>
    key === '@id' || key === '@type' || key === '@relation'
      ? [key, replaceId(value, replacements)]
      : [key, searchForReplacement(value, replacements)]
  ) as A
}

function replaceIdInArray (array: any[], replacements: Map<string>) {
  return array.map(value => replaceId(value, replacements))
}

function replace<A> (value: A, replacements: Map<string>): A {
  if (value instanceof Object) {
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
