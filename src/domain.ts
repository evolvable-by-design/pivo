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

export type PivoApiOperationSchema = ExpandedOpenAPIV3Semantics.OperationObject & {
  userShouldAuthenticate: boolean
  parameters: Array<ExpandedOpenAPIV3Semantics.ParameterObject>
  verb: HttpVerb
  requestBody: object
  url: string
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

export type PivoSchemaObject = {
  properties: { [key: string]: OpenAPIV3.SchemaObject }
  required: string[]
}

type HttpVerb = 'get' | 'put' | 'post' | 'delete' | 'patch' | 'options'

export type ActionSemantics = string
export type DataSemantics = string
