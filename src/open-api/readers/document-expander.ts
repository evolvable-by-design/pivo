import {
  ExpandedOpenAPIV3Semantics,
  OpenAPIV3Semantics
} from '../open-api-types'
import * as JsonLDParser from '../../json-ld-parser'
import { mapObject, Map } from '../../utils/transformation'

export default class DocumentExpander {
  private semanticIdentifiers: Map<string>
  private semanticTypes: Map<string>

  private constructor (private documentation: OpenAPIV3Semantics.Document) {
    this.semanticIdentifiers = JsonLDParser.getAllSemanticIdentifiers(
      documentation
    )
    this.semanticTypes = JsonLDParser.getAllSemanticTypes(documentation)
  }

  public static expandDocumentation (
    documentation: OpenAPIV3Semantics.Document
  ): ExpandedOpenAPIV3Semantics.Document {
    return new DocumentExpander(documentation).expand(documentation)
  }

  /**
   * Expand a given element of the documentation by resolving
   * all references and semantics of the element and its children
   *
   * @param {*} value an element of the documentation
   */
  private expand (value: any): any {
    if (value instanceof Array) {
      return value.map(this.expand.bind(this))
    } else if (value instanceof Object) {
      if (value['$ref']) {
        return this.expand(this.resolveReference(value['$ref']))
      } else {
        return mapObject(value, (key, v) => {
          const refinedEl = this.expand(v)
          if (
            (key === 'parameters' || key === 'properties') &&
            v instanceof Object &&
            !(v instanceof Array)
          ) {
            return [key, this.withSemanticsToProperties(refinedEl)]
          } else {
            return [key, refinedEl]
          }
        })
      }
    } else {
      return value
    }
  }

  private resolveReference (ref: string) {
    if (!ref.startsWith('#')) {
      throw new Error('Unhandled kind of reference:' + ref)
    }

    const fragments = ref.substring(2).split('/')
    const object = fragments.reduce(
      (res, fragment) => res[fragment],
      this.documentation
    )
    if (!object['@id']) {
      object['@id'] = this.semanticIdentifiers[fragments[fragments.length - 1]]
    }
    return object
  }

  private withSemanticsToProperties (properties: Map<any>) {
    return mapObject(properties, (key, value) => {
      if (value instanceof Object && value['@id'] === undefined) {
        const semantic = this.semanticIdentifiers[key]
        if (semantic) {
          value['@id'] = semantic
        }
      }

      if (value instanceof Object && value['@type'] === undefined) {
        const type = this.semanticTypes[key]
        if (type) {
          value['@type'] = type
        }
      }
      return [key, value]
    })
  }
}
