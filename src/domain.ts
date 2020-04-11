import { OpenAPIV3 } from 'openapi-types'

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

export type PivoApiOperationSchema = OpenAPIV3.OperationObject & {
  userShouldAuthenticate: boolean
  parameters: PivoParameterSchema[]
  verb: HttpVerb
  requestBody: object
}

export type PivoRequestBody = OpenAPIV3.RequestBodyObject & {
  properties: { [key: string]: OpenAPIV3.SchemaObject }
  required?: string[]
}
export type PivoParameterSchema = OpenAPIV3.ParameterObject

export type PivoSchemaObject = {
  properties: { [key: string]: OpenAPIV3.SchemaObject }
  required: string[]
}

type HttpVerb = 'get' | 'put' | 'post' | 'delete' | 'patch' | 'options'

export type ActionSemantics = string
export type DataSemantics = string
