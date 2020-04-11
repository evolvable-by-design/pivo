import AuthService from '../authentication-service'
import { DataSemantics } from '../domain'
import {
  ExpandedOpenAPIV3Semantics,
  OpenAPIV3Semantics
} from './open-api-types'
import { OpenAPIV3 } from 'openapi-types'
import * as JsonLDParser from '../json-ld-parser'
import {
  matchUrlPattern,
  mapFind,
  mergeOptionalArrays
} from '../utils/transformation'
import DocumentExpander from './readers/document-expander'
import OperationReader from './readers/operation-reader'
import Option from '../utils/option'

export default class SemanticOpenApiDoc {
  private documentation: ExpandedOpenAPIV3Semantics.Document

  constructor (documentation: OpenAPIV3.Document) {
    const refinedDoc: OpenAPIV3Semantics.Document = JSON.parse(
      JSON.stringify(documentation)
        .replace(new RegExp('x-@id', 'g'), '@id')
        .replace(new RegExp('x-@type', 'g'), '@type')
        .replace(new RegExp('x-@context', 'g'), '@context')
        .replace(new RegExp('x-@relation', 'g'), '@relation')
    )

    const documentationWithoutCuries = JsonLDParser.replaceCuriesWithExpandedUrl(
      refinedDoc
    )
    this.documentation = DocumentExpander.expandDocumentation(
      documentationWithoutCuries
    )
  }

  public getServerUrl (): Option<string> {
    return Option.ofOptional(this.documentation?.servers?.[0]?.url)
  }

  public hasOperation = (target: string) =>
    this.findOperation(target).nonEmpty()

  public findOperation (
    identifier: string
  ): Option<ExpandedOpenAPIV3Semantics.OperationObject> {
    return this._findOperation(
      operation =>
        operation['@id'] === identifier || operation.operationId === identifier
    )
  }

  public findOperationThatReturns (
    target: DataSemantics
  ): Option<ExpandedOpenAPIV3Semantics.OperationObject> {
    return this._findOperation(operation => {
      return OperationReader.responseBodySchema(operation)
        .map(
          schema =>
            schema['@id'] === target ||
            schema?.oneOf?.find(s => s['@id'] === target) !== undefined
        )
        .getOrElse(false)
    })
  }

  public findOperationListing (
    target: DataSemantics
  ): Option<ExpandedOpenAPIV3Semantics.OperationObject> {
    return this._findOperation(operation => {
      return OperationReader.responseBodySchema(operation)
        .map(
          schema =>
            schema.type === 'array' &&
            (schema.items['@id'] === target ||
              schema.items.oneOf?.find(s => s['@id'] === target) !== undefined)
        )
        .getOrElse(false)
    })
  }

  public findGetOperationWithPathMatching (
    url: string
  ): Option<ExpandedOpenAPIV3Semantics.OperationObject> {
    return this._findOperation(
      (_, verb: string, path: string) =>
        matchUrlPattern(url, path) && verb === 'get'
    )
  }

  responseBodySchema (
    operation: string | ExpandedOpenAPIV3Semantics.OperationObject
  ): Option<ExpandedOpenAPIV3Semantics.SchemaObject> {
    const actualOperation = Option.ofOptional(
      typeof operation === 'string'
        ? this.findOperation(operation)
        : (operation as ExpandedOpenAPIV3Semantics.OperationObject)
    )

    return actualOperation.flatMap(OperationReader.responseBodySchema)
  }

  private _findOperation (
    predicate: (
      operation: ExpandedOpenAPIV3Semantics.OperationObject,
      verb?: string,
      path?: string
    ) => boolean
  ): Option<ExpandedOpenAPIV3Semantics.OperationObject> {
    return Option.ofOptional(
      mapFind(
        Object.entries(this.documentation.paths),
        ([path, operations]) => {
          return Option.ofOptional(
            Object.entries(operations).find(([verb, operation]) =>
              predicate(operation, verb, path)
            )
          )
            .map(([verb, operation]) => {
              const parametersOfPath = operations['parameters']
              let parameters = mergeOptionalArrays(
                parametersOfPath,
                operation.parameters
              )

              const userShouldAuthenticate =
                operation.security !== undefined &&
                !AuthService.isAuthenticated()

              return {
                ...operation,
                verb,
                url: path,
                parameters: parameters,
                userShouldAuthenticate
              }
            })
            .getOrUndefined()
        }
      )
    )
  }
}
