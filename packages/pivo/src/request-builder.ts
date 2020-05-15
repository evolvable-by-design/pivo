import OperationSchema from './operation-schema'
import { ExpandedOpenAPIV3Semantics } from './open-api/open-api-types'
import Option from './utils/option'

import { AxiosRequestConfig, Method } from 'axios'

// TODO: merge parameters and body into a single parameters object
export function buildRequest (
  operation: OperationSchema,
  parameters: object,
  body: object
): AxiosRequestConfig {
  if (supportsJson(operation)) {
    return {
      method: operation.schema.verb as Method,
      url: buildUrl(operation, parameters),
      data: buildBody(operation.getRequestBodySchema(), body),
      headers: buildHeaders(operation, parameters)
    }
  } else {
    throw new Error(
      'Operations that must send another format than JSON to the server are not supported yet.'
    )
  }
}

function supportsJson (operation: OperationSchema): boolean {
  return (
    operation.schema.requestBody !== undefined &&
    operation.schema.requestBody.content['application/json'] !== undefined
  )
}

function buildUrl (operation: OperationSchema, parameters: object) {
  let url = operation.schema.url

  if (operation.hasParameters()) {
    operation
      .getParametersSchema('path')
      .filter(
        param =>
          param?.schema?.default !== undefined ||
          parameters[param.name] !== undefined
      )
      .forEach(param => {
        const value = parameters[param.name] || param?.schema?.default
        url = url.replace(`{${param.name}}`, value)
      })

    operation
      .getParametersSchema('query')
      .filter(
        param =>
          param?.schema?.default !== undefined ||
          parameters[param.name] !== undefined
      )
      .forEach((param, i) => {
        const prefix = i === 0 ? '?' : '&'
        const value = parameters[param.name] || param?.schema?.default

        url += `${prefix}${param.name}=${value}`
      })
  }

  return url
}

function buildBody (
  requestBodySchema: Option<ExpandedOpenAPIV3Semantics.SchemaObject>,
  values: object
): object {
  return requestBodySchema
    .filter(schema => ['object', 'array'].includes(schema.type))
    .flatMap(schema => {
      if (schema.type === 'array') {
        return schema.default
      } else {
        return Option.ofOptional(schema.properties)
          .map(properties => {
            return Object.keys(properties)
              .filter(
                key =>
                  values[key] !== undefined ||
                  schema?.properties?.[key]?.default !== undefined
              )
              .reduce((acc, key) => {
                acc[key] = values[key] || schema?.properties?.[key]?.default
                return acc
              }, {})
          })
          .getOrElse({})
      }
    })
}

function buildHeaders (operation: OperationSchema, values: object): object {
  return operation
    .getParametersSchema('header')
    .filter(
      param =>
        values[param.name] !== undefined || param?.schema?.default !== undefined
    )
    .reduce((acc, param) => {
      acc[param.name] = values[param.name] || param?.schema?.default
      return acc
    }, {})
}
