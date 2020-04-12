import { OpenAPIV3 } from 'openapi-types'
import { ExpandedOpenAPIV3Semantics } from './open-api/open-api-types'

export declare namespace JsonLD {
  interface Context {
    [key: string]: string | Entry
  }

  interface Entry {
    '@id': string
    '@type'?: string
  }

  interface Relation {
    '@relation'?: string | string[]
  }
}

export type PivoRequestBody = OpenAPIV3.RequestBodyObject & {
  properties: { [key: string]: OpenAPIV3.SchemaObject }
  required?: string[]
}
export type PivoParameterSchema = {
  name: string
  description?: string
  required: boolean
  schema: ExpandedOpenAPIV3Semantics.SchemaObject
}

export type PivoRelationObject = {
  key: string
  operation: ExpandedOpenAPIV3Semantics.OperationObject
}

export type PivoSchemaObject = {
  properties: { [key: string]: OpenAPIV3.SchemaObject }
  required: string[]
}

export type HypermediaData<T> = {
  _links: HypermediaControl[]
} & T

export type HypermediaControl = HypermediaControlKey | HypermediaControlDetailed
export type HypermediaControlKey = string
export type HypermediaControlDetailed = {
  relation: string
  parameters: object
}

type HttpVerb = 'get' | 'put' | 'post' | 'delete' | 'patch' | 'options'

export type ActionSemantics = string
export type DataSemantics = string
export type RelationSemantics = string

export type NormalizedHeader = {
  value: string
  documentation?: ExpandedOpenAPIV3Semantics.HeaderObject
  relation?: string
} & { [key: string]: string }
