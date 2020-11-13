/*
 * At the moment this class is only able to find elements in an object
 * with direct semantic match. It doesn't look at the OWL description
 * in order to leverage the "sameAs" property.
 *
 * TODO: look deeper into the semantic
 */
import { AxiosResponse } from 'axios'

import SemanticOpenApiDocumentation from './open-api/semantic-open-api-documentation'
import { reduceObject, Map } from './utils/transformation'
import Option from './utils/option'
import SemanticResourceUtils from './utils/semantic-resource'
import ApiOperation from './api-operation'
import { ExpandedOpenAPIV3Semantics } from './open-api/open-api-types'
import {
  DataSemantics,
  RelationSemantics,
  HypermediaData,
  NormalizedHeader,
  HypermediaControl,
  PivoRelationObject
} from './domain'
import {
  updateRequestBodySchema,
  doesSchemaSemanticsMatch,
  doesSemanticTypeMatch
} from './open-api/utils'
import OperationReader from './open-api/readers/operation-reader'
import HttpClient from './http-client'
import { NotFoundDataException } from './errors'

class SemanticResource<T = any> {
  readonly resourceSchema?: ExpandedOpenAPIV3Semantics.SchemaObject
  readonly type?: DataSemantics | DataSemantics[]

  private alreadyReadData: string[]
  private alreadyReadRelations: string[]

  constructor (
    readonly data: HypermediaData<T> | T,
    readonly apiDocumentation: SemanticOpenApiDocumentation,
    private httpClient: HttpClient,
    private originHttpResponse: AxiosResponse<any>,
    resourceSchema?: ExpandedOpenAPIV3Semantics.SchemaObject,
    readonly responseSchema?: ExpandedOpenAPIV3Semantics.ResponseObject
  ) {
    this.alreadyReadData = []
    this.alreadyReadRelations = []

    if (resourceSchema?.oneOf) {
      const schema = resourceSchema.oneOf
        .sort(
          SemanticResourceUtils.sortSchemaWithLowerAmountOfRequiredParameters
        )
        .find(schema => SemanticResourceUtils.doesSchemaMatch(data, schema))

      this.resourceSchema = schema
      this.type = schema
        ? schema['@id'] || schema.type || resourceSchema.type
        : undefined
    } else {
      this.type = resourceSchema
        ? resourceSchema['@id'] || resourceSchema.type
        : undefined
      this.resourceSchema = resourceSchema
    }
  }

  public is (semanticKey: DataSemantics): boolean {
    return (
      this.resourceSchema !== undefined &&
      doesSchemaSemanticsMatch(semanticKey, this.resourceSchema)
    )
  }

  public isOneOf (semanticKey: DataSemantics[]): boolean {
    return (
      this.resourceSchema !== undefined &&
      doesSchemaSemanticsMatch(semanticKey, this.resourceSchema)
    )
  }

  public isObject (): boolean {
    return this.resourceSchema
      ? this.resourceSchema.type === 'object'
      : this.data === Object(this.data)
  }

  public isArray (): boolean {
    return this.resourceSchema
      ? this.resourceSchema.type === 'array'
      : this.data instanceof Array
  }

  public isPrimitive (): boolean {
    return !this.isArray() && !this.isObject()
  }

  public resetReadCounter (): SemanticResource<T> {
    this.alreadyReadData = []
    this.alreadyReadRelations = []
    return this
  }

  public toArray (): SemanticResource<T>[] {
    if (this.data instanceof Array) {
      return this.data.map(
        d =>
          new SemanticResource(
            d,
            this.apiDocumentation,
            this.httpClient,
            this.originHttpResponse,
            this.resourceSchema?.['items'],
            this.responseSchema
          )
      )
    } else {
      return [this]
    }
  }

  async get <A = any> (semanticKey: DataSemantics): Promise<SemanticResource<A>> {
    const maybeInnerValue = await this.getInnerValue<A>(semanticKey).toPromise()

    if (maybeInnerValue) return maybeInnerValue

    return await this.getValueFromLinks(semanticKey)
  }

  async getOne <A = any> (semanticKey: DataSemantics): Promise<SemanticResource<A>> {
    const maybeInnerValue = await this.getInnerValue<A>(semanticKey).toPromise()

    if (maybeInnerValue) return takeFirst(maybeInnerValue)

    return await this.getValueFromLinks(semanticKey)
  }

  async getArray <A = any> (semanticKey: DataSemantics): Promise<Array<SemanticResource<A>>> {
    const maybeInnerValue = await this.getInnerValue(semanticKey).toPromise()

    if (maybeInnerValue) return ensureArray(maybeInnerValue)

    return ensureArray(await this.getValueFromLinks(semanticKey))
  }

  async getOneValue <A = any> (semanticKey: DataSemantics): Promise<A> {
    const semanticData = await this.getOne(semanticKey)
    return semanticData.data
  }

  async getArrayValue <A = any> (semanticKey: DataSemantics): Promise<Array<A>> {
    const semanticData = await this.getArray(semanticKey)
    return semanticData.map(s => s.data)
  }

  private getInnerValue <A = any> (
    semanticKey: DataSemantics | DataSemantics[]
  ): Option<SemanticResource<A>> {
    if (this.data === undefined) return Option.empty()

    if (this.isObject()) {
      return this.findPathsToValueAndSchema(semanticKey)
        .flatMap(([key, schema]) => {
          const value = SemanticResourceUtils.getNestedValue(this.data, key)

          return value != null
            ? Option.of({ key, schema, value })
            : Option.empty()
        })
        .map(({ key, schema, value }) => {
          if (!this.alreadyReadData.includes(key)) {
            this.alreadyReadData.push(key)
          }

          return this.instantiateSemanticResourceFromInnerValue(schema, value)
        })
    } else if (this.isArray()) {
      // Not sure of this yet. This may be thought a bit more.
      return Option.empty()
    } else {
      return this.type === semanticKey ? Option.of(this as unknown as SemanticResource<A>) : Option.empty()
    }
  }

  private instantiateSemanticResourceFromInnerValue (
    schema: ExpandedOpenAPIV3Semantics.SchemaObject,
    value: any
  ): SemanticResource {
    if (schema.type === 'array') {
      const responseSchema = this.apiDocumentation
        .findOperationThatReturns(schema.items['@id'])
        .orElse(() =>
          this.apiDocumentation.findOperationThatReturns(schema.items['@type'])
        )
        .flatMap(operation => OperationReader.responseSchema(operation))

      return value.map((v: any) => {
        const newOriginHttpResponse: AxiosResponse<unknown> = {
          data: v,
          status: 200,
          statusText: 'Ok',
          headers: {},
          config: {}
        }

        return new SemanticResource(
          v,
          this.apiDocumentation,
          this.httpClient,
          newOriginHttpResponse,
          schema.items,
          responseSchema.getOrUndefined()
        )
      })
    } else {
      const responseSchema = this.apiDocumentation
        .findOperationThatReturns(schema['@id'])
        .orElse(() =>
          this.apiDocumentation.findOperationThatReturns(schema['@type'])
        )
        .flatMap(operation => OperationReader.responseSchema(operation))

      const newOriginHttpResponse: AxiosResponse<unknown> = {
        data: value,
        status: 200,
        statusText: 'Ok',
        headers: {},
        config: {}
      }

      return new SemanticResource(
        value,
        this.apiDocumentation,
        this.httpClient,
        newOriginHttpResponse,
        schema,
        responseSchema.getOrUndefined()
      )
    }
  }

  private async getValueFromLinks (
    semanticKey: DataSemantics
  ): Promise<SemanticResource> {
    const resourcesContainingValue = this.getOperationsWithParentAffiliation()
      .filter(
        result =>
          result.operation.operationSchema.schema.verb === 'get' &&
          !result.operation.missesRequiredParameters()
      )
      .map(result => {
        const responseBodySchema = OperationReader.responseBodySchema(
          result.operation.operationSchema.schema
        )

        const maybeDirectMatch = responseBodySchema.map(
          schema => schema['@id'] === semanticKey
        )

        if (maybeDirectMatch.nonEmpty()) {
          return { ...result, pathInResponse: '/' }
        } else {
          const key = responseBodySchema
            .map(schema => schema.properties)
            .map(properties =>
              Object.entries(properties).find(([_, schema]) =>
                doesSchemaSemanticsMatch(semanticKey, schema)
              )
            )
            .map(([key]) => key)
            .getOrUndefined()

          return {
            ...result,
            pathInResponse: key
          }
        }
      })
      .filter(result => result.pathInResponse !== undefined) as {
      pathInResponse: string
      key: string
      operation: ApiOperation
    }[]

    if (resourcesContainingValue.length === 1) {
      const toInvoke = resourcesContainingValue[0]
      const linkedResourceData = await toInvoke.operation.invoke()

      if (toInvoke.pathInResponse === '/') {
        return linkedResourceData.data
      } else {
        return new SemanticResource(
          linkedResourceData.data.data[toInvoke.pathInResponse],
          this.apiDocumentation,
          this.httpClient,
          linkedResourceData.data.originHttpResponse,
          linkedResourceData.data?.resourceSchema?.properties?.[
            toInvoke.pathInResponse
          ]
        )
      }
    } else if (resourcesContainingValue.length === 0) {
      throw new NotFoundDataException(semanticKey)
    } else {
      console.warn(
        'Found more than one link containing a value for the searched property in SemanticResource.getValueFromLinks'
      )
      throw new NotFoundDataException(semanticKey)
    }
  }

  private findPathsToValueAndSchema (
    semanticKey: DataSemantics | DataSemantics[]
  ): Option<[string, ExpandedOpenAPIV3Semantics.SchemaObject]> {
    const result:
      | [string, ExpandedOpenAPIV3Semantics.SchemaObject]
      | undefined = SemanticResourceUtils.flattenObjectProperties(this.resourceSchema?.properties || {})
      .find(
        ([_, value]: [string, ExpandedOpenAPIV3Semantics.SchemaObject]) =>
          doesSchemaSemanticsMatch(semanticKey, value) ||
          doesSemanticTypeMatch(semanticKey, value)
      )

    return Option.ofOptional(result)
  }

  public getOtherData (): object {
    return Object.entries(this?.resourceSchema?.properties || {})
      .filter(([key]) => !this.alreadyReadData.includes(key))
      .map(
        ([key, property]) =>
          [key, this.getInnerValue(property['@id']).getOrUndefined()] as [
            string,
            SemanticResource | SemanticResource[] | undefined
          ]
      )
      .filter(([_, value]) => value !== undefined)
      .reduce(reduceObject, {})
  }

  public isRelationAvailable (semanticRelation: RelationSemantics): boolean {
    return this.getRelation(semanticRelation)
      .map(relations =>
        relations instanceof Array ? relations.length !== 0 : true
      )
      .getOrElse(false)
  }

  public getRelation (
    semanticRelation: RelationSemantics,
    maxRelationReturned?: number
  ): Option<PivoRelationObject | PivoRelationObject[]> {
    const relations = this.getRelationFromSemantics(semanticRelation)

    if (maxRelationReturned === 1) {
      return relations.length > 0 ? Option.of(relations[0]) : Option.empty()
    } else if (maxRelationReturned) {
      return Option.of(relations.splice(0, maxRelationReturned))
    } else {
      return Option.of(relations)
    }
  }

  public getRelations (semanticRelations: RelationSemantics[]) {
    return semanticRelations
      .map(rel => this.getRelation(rel))
      .filter(maybeRelation => maybeRelation.nonEmpty)
      .reduce(
        (acc: PivoRelationObject[], values: Option<PivoRelationObject[]>) =>
          values.map(val => acc.concat(val)).getOrElse(acc),
        []
      )
  }

  public getOtherRelations (): PivoRelationObject[] {
    const others = ((this.data['_links'] || {}) as HypermediaControl[])
      .map(l => (l instanceof Object ? l.relation : l))
      .filter(key => !this.alreadyReadRelations.includes(key))

    return others
      .map(key => this.getRelationFromHypermediaControlKey(key, false))
      .reduce((acc, val) => acc.concat(val), [])
  }

  private getHeader (semanticKey: DataSemantics): NormalizedHeader[] {
    const headers = this.normalizeHeaders()
    return Object.values(headers)
      .map(value => {
        if (value instanceof Array) {
          return value.filter(v => v?.relation === semanticKey)
        } else if (value?.relation === semanticKey) {
          return [value]
        } else {
          return []
        }
      })
      .reduce((acc, value) => acc.concat(value), [])
  }

  public getDataFromHeaders (semanticKey: DataSemantics): SemanticResource[] {
    return this.getHeader(semanticKey).map(
      result =>
        new SemanticResource(
          result.value,
          this.apiDocumentation,
          this.httpClient,
          this.originHttpResponse
          // result.documentation, -> HeaderObject is not a SchemaObject
        )
    )
  }

  private getRelationsFromHeaders (
    semanticKey: RelationSemantics
  ): PivoRelationObject[] {
    return this.getHeader(semanticKey)
      .filter(result => result.relation !== undefined)
      .map(result => {
        const operation = Option.ofOptional(
          result?.operationId || result?.documentation?.operationId
        )
          .flatMap(operationId =>
            this.apiDocumentation.findOperation(operationId)
          )
          .map(operation => {
            delete operation['parameters']
            delete operation['requestBody']
            return operation
          })
          .getOrUndefined()

        const rel = result.relation as string
        const key: string = rel.slice(rel.lastIndexOf('#') + 1)

        const operationWithUrl = {
          ...operation,
          url: result.value
        } as ExpandedOpenAPIV3Semantics.OperationObject

        return {
          key,
          operation: new ApiOperation(operationWithUrl, this.httpClient)
        } as PivoRelationObject
      })
  }

  private normalizeHeaders (): Map<NormalizedHeader | NormalizedHeader[]> {
    return Object.entries(this.originHttpResponse.headers as Map<string>)
      .map(([header, value]) => {
        const headerDocumentation = Option.ofOptional(
          Object.keys(this.responseSchema?.headers || {}).find(
            key => key.toLowerCase() === header.toLowerCase()
          )
        )
          .map(headerKey => this.responseSchema?.headers?.[headerKey])
          .getOrUndefined()

        if (header === 'link') {
          const links = String(value)
            .split(',')
            .map(entry => entry.trim())
            .map(entry => entry.slice(1, -1))
            .map(entry =>
              entry
                .split(';')
                .map(s => s.trim())
                .reduce((accumulator, value, i) => {
                  if (i === 0) {
                    accumulator['value'] = value
                    accumulator['documentation'] = headerDocumentation
                  } else {
                    const [key, val] = value.split('=')
                    const correctedKey = key === 'rel' ? 'relation' : key
                    accumulator[correctedKey] = val.slice(1, -1)
                  }
                  return accumulator
                }, {})
            )
          return [header, links]
        } else {
          const relation = headerDocumentation
            ? headerDocumentation['@id']
            : undefined
          return [
            header,
            { value, relation, documentation: headerDocumentation }
          ]
        }
      })
      .reduce((acc, [key, value]) => {
        acc[key as string] = value
        return acc
      }, {})
  }

  private getRelationFromSemantics (
    semanticRelation: RelationSemantics
  ): PivoRelationObject[] {
    const relationsFromHypermediaControls = this.getRelationFromHypermediaControls(
      ([_, schema]) => schema['@relation'] === semanticRelation,
      true
    )

    const relationsFromHeaders = this.getRelationsFromHeaders(semanticRelation)
    return relationsFromHypermediaControls.concat(relationsFromHeaders)
  }

  private getRelationFromHypermediaControlKey (
    hypermediaControlKey: RelationSemantics,
    addToReadList: boolean
  ) {
    return this.getRelationFromHypermediaControls(
      ([key]) => key === hypermediaControlKey,
      addToReadList
    )
  }

  private getOperationsWithParentAffiliation () {
    return this.getRelationFromHypermediaControls(
      ([_, schema]) => schema['x-affiliation'] === 'parent',
      false
    )
  }

  private getRelationFromHypermediaControls (
    filterFct: (
      value: [string, ExpandedOpenAPIV3Semantics.LinkObject]
    ) => boolean,
    addToReadList: boolean
  ): PivoRelationObject[] {
    const responseSchemaLinks = this.responseSchema?.links || {}
    const availableLinks = this.data['_links'] || []

    return Object.entries(responseSchemaLinks)
      .filter(filterFct)
      .map(([key, schema]) => {
        const operation = this.apiDocumentation
          .findOperation(schema?.operationId)
          .getOrUndefined()

        if (operation === undefined) {
          console.warn(
            `Error found in the documentation: operation with id ${schema?.operationId} does not exist.`
          )
        }
        return [key, schema, operation] as [
          string,
          ExpandedOpenAPIV3Semantics.LinkObject,
          ExpandedOpenAPIV3Semantics.OperationObject
        ]
      })
      .filter(([_, __, operation]) => operation !== undefined)
      .filter(
        ([key]) =>
          availableLinks.includes(key) ||
          availableLinks.find(
            (control: HypermediaControl) => control['relation'] === key
          )
      )
      .map(([key, linkSchema, operation]) => {
        const controlFromPayload =
          availableLinks[key] ||
          availableLinks.find(
            (control: HypermediaControl) => control['relation'] === key
          )

        OperationReader.requestBodySchema(operation)
          .map(schema => schema.oneOf)
          .ifPresent(schemas =>
            updateRequestBodySchema(
              operation,
              SemanticResourceUtils.findClosestSchema(
                schemas,
                controlFromPayload
              )
            )
          )

        const operationWithDefaultValues = SemanticResourceUtils.addDefaultValuesToOperationSchema(
          controlFromPayload,
          linkSchema,
          operation,
          this.originHttpResponse
        )

        if (addToReadList && !this.alreadyReadRelations.includes(key)) {
          this.alreadyReadRelations.push(key)
        }

        return {
          key,
          operation: new ApiOperation(
            operationWithDefaultValues,
            this.httpClient
          )
        }
      })
  }
}

function takeFirst (
  data: SemanticResource | SemanticResource[]
): SemanticResource {
  return data instanceof Array ? data[0] : data
}

function ensureArray (
  data: SemanticResource | SemanticResource[]
): SemanticResource[] {
  return data instanceof Array ? data : [data]
}

export default SemanticResource
