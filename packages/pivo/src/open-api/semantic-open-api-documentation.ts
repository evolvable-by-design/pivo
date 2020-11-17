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
  mergeOptionalArrays,
  flatMap
} from '../utils/transformation'
import DocumentExpander from './readers/document-expander'
import OperationReader from './readers/operation-reader'
import Option from '../utils/option'
import {
  doesSemanticsMatchOne,
  doesSchemaSemanticsMatch,
  doesSemanticTypeMatch,
  countParamsWithSemantics
} from './utils'

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
    console.log(this.documentation)
  }

  public getServerUrl (): Option<string> {
    return Option.ofOptional(this.documentation?.servers?.[0]?.url)
  }

  public hasOperation = (target: string) =>
    this.findOperation(target).nonEmpty()

  public findOperation (
    identifier?: string,
    withParameters?: DataSemantics[]
  ): Option<ExpandedOpenAPIV3Semantics.OperationObject> {
    if (identifier !== undefined) {
      return this._findOperation(
        operation =>
          doesSemanticsMatchOne(identifier, operation['@id']) ||
          operation.operationId === identifier,
        withParameters
      )
    } else {
      return Option.empty()
    }
  }

  public findOperationThatReturns (
    target?: DataSemantics | DataSemantics[],
    withParameters?: DataSemantics[]
  ): Option<ExpandedOpenAPIV3Semantics.OperationObject> {
    if (target == null) {
      return Option.empty()
    } else {
      return this._findOperation((operation, verb) => {
        return verb === 'get' && OperationReader.responseBodySchema(operation)
          .map(schema => doesSemanticTypeMatch(target, schema))
          .getOrElse(false)
      }, withParameters)
    }
  }

  public findOperationListing (
    target?: DataSemantics | DataSemantics[],
    withParameters?: DataSemantics[]
  ): Option<ExpandedOpenAPIV3Semantics.OperationObject> {
    if (target == null) {
      return Option.empty()
    } else {
      return this._findOperation((operation, verb) => {
        return verb === 'get' && OperationReader.responseBodySchema(operation)
          .map(
            schema =>
              schema.type === 'array' &&
              doesSchemaSemanticsMatch(target, schema.items)
          )
          .getOrElse(false)
      }, withParameters)
    }
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
        : operation
    )

    return actualOperation.flatMap(OperationReader.responseBodySchema)
  }

  private _findOperation (
    predicate: (
      operation: ExpandedOpenAPIV3Semantics.OperationObject,
      verb?: string,
      path?: string
    ) => boolean,
    withParameters?: DataSemantics[]
  ): Option<ExpandedOpenAPIV3Semantics.OperationObject> {
    const allOperations = flatMap(
      Object.entries(this.documentation.paths),
      ([path, operations]) => Object.entries(operations).map(([verb, operation]) => ({ path, verb, operation, operations }))
    )
    const operationsMatchingPredicate = allOperations.filter(({ path, verb, operation }) => predicate(operation, verb, path))

    const orderedMatches = operationsMatchingPredicate
      .map((match) => ({
        ...match,
        matchingParametersCount: countParamsWithSemantics(match.operation, withParameters)
      }))
      .sort((o1, o2) => o2.matchingParametersCount - o1.matchingParametersCount)
    
    const bestMatch = orderedMatches[0]

    return Option.ofOptional(bestMatch).map(({verb, operation, operations, path}) => {
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
  }
}
