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
import SemanticDataUtils from './utils/semantic-data'
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
  doesSchemaSemanticsMatch
} from './open-api/utils'
import OperationReader from './open-api/readers/operation-reader'
import HttpClient from './http-client'
import { NotFoundDataException } from './errors'

class SemanticData {
  readonly resourceSchema?: ExpandedOpenAPIV3Semantics.SchemaObject
  readonly type?: DataSemantics | DataSemantics[]

  private alreadyReadData: string[]
  private alreadyReadRelations: string[]

  constructor (
    readonly data: HypermediaData<unknown> | any,
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
        .sort(SemanticDataUtils.sortSchemaWithLowerAmountOfRequiredParameters)
        .find(schema => SemanticDataUtils.doesSchemaMatch(data, schema))

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

  public resetReadCounter (): SemanticData {
    this.alreadyReadData = []
    this.alreadyReadRelations = []
    return this
  }

  async get (
    semanticKey: DataSemantics
  ): Promise<SemanticData | SemanticData[]> {
    const maybeInnerValue = await this.getInnerValue(semanticKey).toPromise()

    if (maybeInnerValue) return maybeInnerValue

    return await this.getValueFromLinks(semanticKey)
  }

  async getOne (semanticKey: DataSemantics): Promise<SemanticData> {
    const maybeInnerValue = await this.getInnerValue(semanticKey).toPromise()

    if (maybeInnerValue) return takeFirst(maybeInnerValue)

    return await this.getValueFromLinks(semanticKey)
  }

  async getArray (semanticKey: DataSemantics): Promise<SemanticData[]> {
    const maybeInnerValue = await this.getInnerValue(semanticKey).toPromise()

    if (maybeInnerValue) return ensureArray(maybeInnerValue)

    return ensureArray(await this.getValueFromLinks(semanticKey))
  }

  async getOneValue (semanticKey: DataSemantics): Promise<any> {
    const semanticData = await this.getOne(semanticKey)
    return semanticData.data
  }

  async getArrayValue (semanticKey: DataSemantics): Promise<any> {
    const semanticData = await this.getArray(semanticKey)
    return semanticData.map(s => s.data)
  }

  private getInnerValue (
    semanticKey: DataSemantics | DataSemantics[]
  ): Option<SemanticData | Array<SemanticData>> {
    if (this.data === undefined) return Option.empty()

    if (this.isObject()) {
      return this.findPathsToValueAndSchema(semanticKey)
        .flatMap(([key, schema]) => {
          const value = key.includes('.')
            ? this.data[key.split('.')[0]][key.split('.')[1]]
            : this.data[key]

          return value ? Option.of({ key, schema, value }) : Option.empty()
        })
        .map(({ key, schema, value }) => {
          if (!this.alreadyReadData.includes(key)) {
            this.alreadyReadData.push(key)
          }

          if (schema.type === 'array') {
            const responseSchema = this.apiDocumentation
              .findOperationThatReturns(schema.items['@id'])
              .flatMap(operation => OperationReader.responseSchema(operation))

            this.apiDocumentation?.responseBodySchema(schema.items['@id'])
            return value.map(
              (v: any) =>
                new SemanticData(
                  v,
                  this.apiDocumentation,
                  this.httpClient,
                  this.originHttpResponse,
                  schema.items,
                  responseSchema.getOrUndefined()
                )
            )
          } else {
            const responseSchema = this.apiDocumentation
              .findOperationThatReturns(schema['@id'])
              .flatMap(operation => OperationReader.responseSchema(operation))

            return new SemanticData(
              value,
              this.apiDocumentation,
              this.httpClient,
              this.originHttpResponse,
              schema,
              responseSchema.getOrUndefined()
            )
          }
        })
    } else if (this.isArray()) {
      // Not sure of this yet. This may be thought a bit more.
      return Option.empty()
    } else {
      return this.type === semanticKey ? Option.of(this) : Option.empty()
    }
  }

  private async getValueFromLinks (
    semanticKey: DataSemantics
  ): Promise<SemanticData> {
    const resourcesContainingValue = this.getOperationsWithParentAffiliation()
      .filter(
        result =>
          result.operation.verb === 'get' &&
          !new ApiOperation(
            result.operation,
            this.httpClient
          ).missesRequiredParameters()
      )
      .map(result => {
        const key = OperationReader.responseBodySchema(result.operation)
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
      })
      .filter(result => result.pathInResponse !== undefined) as {
      pathInResponse: string
      key: string
      operation: ExpandedOpenAPIV3Semantics.OperationObject
    }[]

    if (resourcesContainingValue.length === 1) {
      const toInvoke = resourcesContainingValue[0]
      const linkedResourceData = await new ApiOperation(
        toInvoke.operation,
        this.httpClient
      ).invoke()

      return new SemanticData(
        linkedResourceData.data.data[toInvoke.pathInResponse],
        this.apiDocumentation,
        this.httpClient,
        linkedResourceData.data.originHttpResponse,
        linkedResourceData.data?.resourceSchema?.properties?.[
          toInvoke.pathInResponse
        ]
      )
    } else if (resourcesContainingValue.length === 0) {
      throw new NotFoundDataException()
    } else {
      console.warn(
        'Found more than one link containing a value for the searched property in SemanticData.getValueFromLinks'
      )
      throw new NotFoundDataException()
    }
  }

  private findPathsToValueAndSchema (
    semanticKey: DataSemantics | DataSemantics[]
  ): Option<[string, ExpandedOpenAPIV3Semantics.SchemaObject]> {
    const result:
      | [string, ExpandedOpenAPIV3Semantics.SchemaObject]
      | undefined = Object.entries(this.resourceSchema?.properties || {})
      .map(([key, value]) => {
        if (value.type === 'object' && value['x-affiliation'] === 'parent') {
          return Object.entries(value?.properties || {}).map(
            ([pKey, pValue]) => [`${key}.${pKey}`, pValue]
          ) as [string, ExpandedOpenAPIV3Semantics.SchemaObject][]
        } else {
          return [[key, value]] as [
            string,
            ExpandedOpenAPIV3Semantics.SchemaObject
          ][]
        }
      })
      .reduce((acc, v) => acc.concat(v), [])
      .find(([_, value]: [string, ExpandedOpenAPIV3Semantics.SchemaObject]) =>
        doesSchemaSemanticsMatch(semanticKey, value)
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
            SemanticData | SemanticData[] | undefined
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

  public getDataFromHeaders (semanticKey: DataSemantics): SemanticData[] {
    return this.getHeader(semanticKey).map(
      result =>
        new SemanticData(
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

        return {
          key,
          operation: {
            ...operation,
            url: result.value
          }
        } as {
          key: string
          operation: ExpandedOpenAPIV3Semantics.OperationObject
        }
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

  private getRelationFromSemantics (semanticRelation: RelationSemantics) {
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
    const availableLinks = this.data._links || []

    return Object.entries(responseSchemaLinks)
      .filter(filterFct)
      .map(([key, schema]) => {
        const operation = this.apiDocumentation
          .findOperation(schema?.operationId)
          .getOrUndefined()

        if (operation === undefined) {
          console.warn(
            `Error found in the documentation: operation with id ${key} does not exist.`
          )
        }
        return [key, operation] as [
          string,
          ExpandedOpenAPIV3Semantics.OperationObject
        ]
      })
      .filter(([_, operation]) => operation !== undefined)
      .filter(
        ([key, _]) =>
          availableLinks.includes(key) ||
          availableLinks.find(
            (control: HypermediaControl) => control['relation'] === key
          )
      )
      .map(([key, operation]) => {
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
              SemanticDataUtils.findClosestSchema(schemas, controlFromPayload)
            )
          )

        const operationWithDefaultValues = SemanticDataUtils.addDefaultValuesToOperationSchema(
          controlFromPayload,
          operation
        )

        if (addToReadList && !this.alreadyReadRelations.includes(key)) {
          this.alreadyReadRelations.push(key)
        }

        return { key, operation: operationWithDefaultValues }
      })
  }
}

function takeFirst (data: SemanticData | SemanticData[]): SemanticData {
  return data instanceof Array ? data[0] : data
}

function ensureArray (data: SemanticData | SemanticData[]): SemanticData[] {
  return data instanceof Array ? data : [data]
}

export default SemanticData
