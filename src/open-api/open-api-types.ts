import { JsonLD } from '../domain'

// Extended from the work of @kogosoftwarellc at https://github.com/kogosoftwarellc/open-api/tree/master/packages/openapi-types#readme
export declare namespace OpenAPIV3Semantics {
  interface Document {
    openapi: string
    info: InfoObject
    servers?: ServerObject[]
    paths: PathsObject
    components?: ComponentsObject
    security?: SecurityRequirementObject[]
    tags?: TagObject[]
    externalDocs?: ExternalDocumentationObject
    '@context'?: JsonLD.Context
  }
  interface InfoObject {
    title: string
    description?: string
    termsOfService?: string
    contact?: ContactObject
    license?: LicenseObject
    version: string
  }
  interface ContactObject {
    name?: string
    url?: string
    email?: string
  }
  interface LicenseObject {
    name: string
    url?: string
  }
  interface ServerObject {
    url: string
    description?: string
    variables?: {
      [variable: string]: ServerVariableObject
    }
  }
  interface ServerVariableObject {
    enum?: string[]
    default: string
    description?: string
  }
  interface PathsObject {
    [pattern: string]: PathItemObject
  }
  interface PathItemObject {
    $ref?: string
    summary?: string
    description?: string
    get?: OperationObject
    put?: OperationObject
    post?: OperationObject
    delete?: OperationObject
    options?: OperationObject
    head?: OperationObject
    patch?: OperationObject
    trace?: OperationObject
    servers?: ServerObject[]
    parameters?: Array<ReferenceObject | ParameterObject>
  }
  type OperationObject = {
    tags?: string[]
    summary?: string
    description?: string
    externalDocs?: ExternalDocumentationObject
    operationId?: string
    parameters?: Array<ReferenceObject | ParameterObject>
    requestBody?: ReferenceObject | RequestBodyObject
    responses?: ResponsesObject
    callbacks?: {
      [callback: string]: ReferenceObject | CallbackObject
    }
    deprecated?: boolean
    security?: SecurityRequirementObject[]
    servers?: ServerObject[]
  } & JsonLD.Entry
  interface ExternalDocumentationObject {
    description?: string
    url: string
  }
  interface ParameterObject extends ParameterBaseObject {
    name: string
    in: string
  }
  interface HeaderObject extends ParameterBaseObject {}
  type ParameterBaseObject = {
    description?: string
    required?: boolean
    deprecated?: boolean
    allowEmptyValue?: boolean
    style?: string
    explode?: boolean
    allowReserved?: boolean
    schema?: ReferenceObject | SchemaObject
    example?: any
    examples?: {
      [media: string]: ReferenceObject | ExampleObject
    }
    content?: {
      [media: string]: MediaTypeObject
    }
  } & JsonLD.Entry
  type NonArraySchemaObjectType =
    | 'null'
    | 'boolean'
    | 'object'
    | 'number'
    | 'string'
    | 'integer'
  type ArraySchemaObjectType = 'array'
  type SchemaObject = ArraySchemaObject | NonArraySchemaObject
  interface ArraySchemaObject extends BaseSchemaObject {
    type: ArraySchemaObjectType
    items: ReferenceObject | SchemaObject
  }
  interface NonArraySchemaObject extends BaseSchemaObject {
    type: NonArraySchemaObjectType
  }
  type BaseSchemaObject = {
    title?: string
    description?: string
    format?: string
    default?: any
    multipleOf?: number
    maximum?: number
    exclusiveMaximum?: boolean
    minimum?: number
    exclusiveMinimum?: boolean
    maxLength?: number
    minLength?: number
    pattern?: string
    additionalProperties?: boolean | ReferenceObject | SchemaObject
    maxItems?: number
    minItems?: number
    uniqueItems?: boolean
    maxProperties?: number
    minProperties?: number
    required?: string[]
    enum?: any[]
    properties?: {
      [name: string]: ReferenceObject | SchemaObject
    }
    allOf?: Array<ReferenceObject | SchemaObject>
    oneOf?: Array<ReferenceObject | SchemaObject>
    anyOf?: Array<ReferenceObject | SchemaObject>
    not?: ReferenceObject | SchemaObject
    nullable?: boolean
    discriminator?: DiscriminatorObject
    readOnly?: boolean
    writeOnly?: boolean
    xml?: XMLObject
    externalDocs?: ExternalDocumentationObject
    example?: any
    deprecated?: boolean
  } & JsonLD.Entry
  interface DiscriminatorObject {
    propertyName: string
    mapping?: {
      [value: string]: string
    }
  }
  interface XMLObject {
    name?: string
    namespace?: string
    prefix?: string
    attribute?: boolean
    wrapped?: boolean
  }
  interface ReferenceObject {
    $ref: string
  }
  interface ExampleObject {
    summary?: string
    description?: string
    value?: any
    externalValue?: string
  }
  interface MediaTypeObject {
    schema?: ReferenceObject | SchemaObject
    example?: any
    examples?: {
      [media: string]: ReferenceObject | ExampleObject
    }
    encoding?: {
      [media: string]: EncodingObject
    }
  }
  interface EncodingObject {
    contentType?: string
    headers?: {
      [header: string]: ReferenceObject | HeaderObject
    }
    style?: string
    explode?: boolean
    allowReserved?: boolean
  }
  interface ContentsObject {
    [media: string]: MediaTypeObject
  }
  interface RequestBodyObject {
    description?: string
    content: ContentsObject
    required?: boolean
  }
  interface ResponsesObject {
    [code: string]: ReferenceObject | ResponseObject
  }
  interface ResponseObject {
    description: string
    headers?: {
      [header: string]: ReferenceObject | HeaderObject
    }
    content?: ContentsObject
    links?: {
      [link: string]: ReferenceObject | LinkObject
    }
  }
  type LinkObject = {
    operationRef?: string
    operationId?: string
    parameters?: {
      [parameter: string]: any
    }
    requestBody?: any
    description?: string
    server?: ServerObject
  } & JsonLD.Relation
  interface CallbackObject {
    [url: string]: PathItemObject
  }
  interface SecurityRequirementObject {
    [name: string]: string[]
  }
  interface ComponentsObject {
    schemas?: {
      [key: string]: ReferenceObject | SchemaObject
    }
    responses?: {
      [key: string]: ReferenceObject | ResponseObject
    }
    parameters?: {
      [key: string]: ReferenceObject | ParameterObject
    }
    examples?: {
      [key: string]: ReferenceObject | ExampleObject
    }
    requestBodies?: {
      [key: string]: ReferenceObject | RequestBodyObject
    }
    headers?: {
      [key: string]: ReferenceObject | HeaderObject
    }
    securitySchemes?: {
      [key: string]: ReferenceObject | SecuritySchemeObject
    }
    links?: {
      [key: string]: ReferenceObject | LinkObject
    }
    callbacks?: {
      [key: string]: ReferenceObject | CallbackObject
    }
  }
  type SecuritySchemeObject =
    | HttpSecurityScheme
    | ApiKeySecurityScheme
    | OAuth2SecurityScheme
    | OpenIdSecurityScheme
  interface HttpSecurityScheme {
    type: 'http'
    description?: string
    scheme: string
    bearerFormat?: string
  }
  interface ApiKeySecurityScheme {
    type: 'apiKey'
    description?: string
    name: string
    in: string
  }
  interface OAuth2SecurityScheme {
    type: 'oauth2'
    flows: {
      implicit?: {
        authorizationUrl: string
        refreshUrl?: string
        scopes: {
          [scope: string]: string
        }
      }
      password?: {
        tokenUrl: string
        refreshUrl?: string
        scopes: {
          [scope: string]: string
        }
      }
      clientCredentials?: {
        tokenUrl: string
        refreshUrl?: string
        scopes: {
          [scope: string]: string
        }
      }
      authorizationCode?: {
        authorizationUrl: string
        tokenUrl: string
        refreshUrl?: string
        scopes: {
          [scope: string]: string
        }
      }
    }
  }
  interface OpenIdSecurityScheme {
    type: 'openIdConnect'
    description?: string
    openIdConnectUrl: string
  }
  interface TagObject {
    name: string
    description?: string
    externalDocs?: ExternalDocumentationObject
  }
}

export declare namespace ExpandedOpenAPIV3Semantics {
  interface Document {
    openapi: string
    info: InfoObject
    servers?: ServerObject[]
    paths: PathsObject
    components?: ComponentsObject
    security?: SecurityRequirementObject[]
    tags?: TagObject[]
    externalDocs?: ExternalDocumentationObject
    '@context'?: JsonLD.Context
  }
  interface InfoObject {
    title: string
    description?: string
    termsOfService?: string
    contact?: ContactObject
    license?: LicenseObject
    version: string
  }
  interface ContactObject {
    name?: string
    url?: string
    email?: string
  }
  interface LicenseObject {
    name: string
    url?: string
  }
  interface ServerObject {
    url: string
    description?: string
    variables?: {
      [variable: string]: ServerVariableObject
    }
  }
  interface ServerVariableObject {
    enum?: string[]
    default: string
    description?: string
  }
  interface PathsObject {
    [pattern: string]: PathItemObject
  }
  interface PathItemObject {
    $ref?: string
    summary?: string
    description?: string
    get?: OperationObject
    put?: OperationObject
    post?: OperationObject
    delete?: OperationObject
    options?: OperationObject
    head?: OperationObject
    patch?: OperationObject
    trace?: OperationObject
    servers?: ServerObject[]
    parameters?: Array<ParameterObject>
  }
  type OperationObject = {
    verb: string
    tags?: string[]
    summary?: string
    description?: string
    externalDocs?: ExternalDocumentationObject
    operationId?: string
    parameters?: Array<ParameterObject>
    requestBody?: RequestBodyObject
    responses?: ResponsesObject
    callbacks?: {
      [callback: string]: CallbackObject
    }
    deprecated?: boolean
    security?: SecurityRequirementObject[]
    servers?: ServerObject[]
  } & JsonLD.Entry
  interface ExternalDocumentationObject {
    description?: string
    url: string
  }
  interface ParameterObject extends ParameterBaseObject {
    name: string
    in: string
  }
  interface ContentsObject {
    [media: string]: MediaTypeObject
  }
  interface HeaderObject extends ParameterBaseObject {}
  type ParameterBaseObject = {
    description?: string
    required?: boolean
    deprecated?: boolean
    allowEmptyValue?: boolean
    style?: string
    explode?: boolean
    allowReserved?: boolean
    schema?: SchemaObject
    example?: any
    examples?: {
      [media: string]: ExampleObject
    }
    content?: ContentsObject
  } & JsonLD.Entry
  type NonArraySchemaObjectType =
    | 'null'
    | 'boolean'
    | 'object'
    | 'number'
    | 'string'
    | 'integer'
  type ArraySchemaObjectType = 'array'
  type SchemaObject = ArraySchemaObject | NonArraySchemaObject
  interface ArraySchemaObject extends BaseSchemaObject {
    type: ArraySchemaObjectType
    items: SchemaObject
  }
  interface NonArraySchemaObject extends BaseSchemaObject {
    type: NonArraySchemaObjectType
  }
  type BaseSchemaObject = {
    title?: string
    description?: string
    format?: string
    default?: any
    multipleOf?: number
    maximum?: number
    exclusiveMaximum?: boolean
    minimum?: number
    exclusiveMinimum?: boolean
    maxLength?: number
    minLength?: number
    pattern?: string
    additionalProperties?: boolean | SchemaObject
    maxItems?: number
    minItems?: number
    uniqueItems?: boolean
    maxProperties?: number
    minProperties?: number
    required?: string[]
    enum?: any[]
    properties?: {
      [name: string]: SchemaObject
    }
    allOf?: Array<SchemaObject>
    oneOf?: Array<SchemaObject>
    anyOf?: Array<SchemaObject>
    not?: SchemaObject
    nullable?: boolean
    discriminator?: DiscriminatorObject
    readOnly?: boolean
    writeOnly?: boolean
    xml?: XMLObject
    externalDocs?: ExternalDocumentationObject
    example?: any
    deprecated?: boolean
  } & JsonLD.Entry
  interface DiscriminatorObject {
    propertyName: string
    mapping?: {
      [value: string]: string
    }
  }
  interface XMLObject {
    name?: string
    namespace?: string
    prefix?: string
    attribute?: boolean
    wrapped?: boolean
  }
  interface ExampleObject {
    summary?: string
    description?: string
    value?: any
    externalValue?: string
  }
  interface MediaTypeObject {
    schema?: SchemaObject
    example?: any
    examples?: {
      [media: string]: ExampleObject
    }
    encoding?: {
      [media: string]: EncodingObject
    }
  }
  interface EncodingObject {
    contentType?: string
    headers?: {
      [header: string]: HeaderObject
    }
    style?: string
    explode?: boolean
    allowReserved?: boolean
  }
  interface RequestBodyObject {
    description?: string
    content: ContentsObject
    required?: boolean
  }
  interface ResponsesObject {
    [code: string]: ResponseObject
  }
  interface ResponseObject {
    description: string
    headers?: {
      [header: string]: HeaderObject
    }
    content?: ContentsObject
    links?: {
      [link: string]: LinkObject
    }
  }
  type LinkObject = {
    operationRef?: string
    operationId?: string
    parameters?: {
      [parameter: string]: any
    }
    requestBody?: any
    description?: string
    server?: ServerObject
  } & JsonLD.Relation
  interface CallbackObject {
    [url: string]: PathItemObject
  }
  interface SecurityRequirementObject {
    [name: string]: string[]
  }
  interface ComponentsObject {
    schemas?: {
      [key: string]: SchemaObject
    }
    responses?: {
      [key: string]: ResponseObject
    }
    parameters?: {
      [key: string]: ParameterObject
    }
    examples?: {
      [key: string]: ExampleObject
    }
    requestBodies?: {
      [key: string]: RequestBodyObject
    }
    headers?: {
      [key: string]: HeaderObject
    }
    securitySchemes?: {
      [key: string]: SecuritySchemeObject
    }
    links?: {
      [key: string]: LinkObject
    }
    callbacks?: {
      [key: string]: CallbackObject
    }
  }
  type SecuritySchemeObject =
    | HttpSecurityScheme
    | ApiKeySecurityScheme
    | OAuth2SecurityScheme
    | OpenIdSecurityScheme
  interface HttpSecurityScheme {
    type: 'http'
    description?: string
    scheme: string
    bearerFormat?: string
  }
  interface ApiKeySecurityScheme {
    type: 'apiKey'
    description?: string
    name: string
    in: string
  }
  interface OAuth2SecurityScheme {
    type: 'oauth2'
    flows: {
      implicit?: {
        authorizationUrl: string
        refreshUrl?: string
        scopes: {
          [scope: string]: string
        }
      }
      password?: {
        tokenUrl: string
        refreshUrl?: string
        scopes: {
          [scope: string]: string
        }
      }
      clientCredentials?: {
        tokenUrl: string
        refreshUrl?: string
        scopes: {
          [scope: string]: string
        }
      }
      authorizationCode?: {
        authorizationUrl: string
        tokenUrl: string
        refreshUrl?: string
        scopes: {
          [scope: string]: string
        }
      }
    }
  }
  interface OpenIdSecurityScheme {
    type: 'openIdConnect'
    description?: string
    openIdConnectUrl: string
  }
  interface TagObject {
    name: string
    description?: string
    externalDocs?: ExternalDocumentationObject
  }
}
