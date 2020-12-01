import React, { useCallback, useMemo, useState } from 'react'
import {
  ApiOperation,
  ExpandedOpenAPIV3Semantics,
  SemanticHttpResponse,
  SemanticData
} from '@evolvable-by-design/pivo'
import { AxiosError } from 'axios'

import { Map } from '../utils'
import { JsonLD } from '@evolvable-by-design/pivo/build/domain'
import { OpenApiUtils } from '@evolvable-by-design/pivo'

type UseOperationResult = {
  parametersDetail: {
    values: object
    setter: React.Dispatch<any>
    documentation: ExpandedOpenAPIV3Semantics.ParameterObject[]
  }
  makeCall: () => void
  isLoading: boolean
  success: boolean
  data?: SemanticData
  error?: AxiosError
  userShouldAuthenticate: boolean
}

export default function useOperation (
  operation: ApiOperation,
  providedValues: object = {}
): UseOperationResult {
  const parameters: ExpandedOpenAPIV3Semantics.ParameterObject[] = operation.operationSchema.getParameters()
  const parametersName: [string, JsonLD.Entry['@id']][] = parameters.map(
    (p: ExpandedOpenAPIV3Semantics.ParameterObject) => [p.name, p['@id']]
  )
  const defaultParametersValues = {
    ...operation.operationSchema.getDefaultParametersValue(),
    ...mapProvidedValueToOperationParameter(providedValues, parametersName)
  }
  const [parametersValue, setParametersValue] = useState(
    defaultParametersValues
  )
  const parametersDetail = {
    values: parametersValue,
    setter: setParametersValue,
    documentation: parameters
  }

  const { makeCall, isLoading, success, data, error } = useCaller(
    parametersValue,
    operation.invoke.bind(operation)
  )

  return {
    parametersDetail,
    makeCall,
    isLoading,
    success,
    data,
    error,
    userShouldAuthenticate: operation.userShouldAuthenticate
  }
}

type UseCallerResult = {
  makeCall: () => void
  isLoading: boolean
  success: boolean
  data?: SemanticData
  error?: AxiosError
}

export function useCaller (
  parameters: object,
  callFct: (parameters?: object) => Promise<SemanticHttpResponse>
): UseCallerResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AxiosError>()
  const [data, setData] = useState<any>()
  const [callAlreadyTriggered, setCallAlreadyTriggered] = useState(false)
  const success = useMemo(
    () =>
      data !== undefined ||
      (callAlreadyTriggered && !isLoading && error === undefined),
    [callAlreadyTriggered, isLoading, error, data]
  )

  const makeCall = useCallback(() => {
    const call = async () => {
      setIsLoading(true)
      setCallAlreadyTriggered(true)
      setError(undefined)
      try {
        const response = await callFct(parameters)
        setData(response.data)
      } catch (error) {
        setError(error)
      } finally {
        setIsLoading(false)
      }
    }

    call()
  }, [callFct, parameters])

  return { makeCall, isLoading, success, data, error }
}

function mapProvidedValueToOperationParameter (
  values: Map<any>,
  keys: [string, JsonLD.Entry['@id']][]
): object {
  const valuesK = Object.keys(values || {})
  const res: Map<any> = {}
  keys.forEach(([key, semanticKey]: [string, string]) => {
    if (valuesK.includes(key)) {
      res[key] = values[key]
    } else if (OpenApiUtils.doesSemanticsMatchOne(semanticKey, valuesK)) {
      res[key] = values[semanticKey]
    }
  })
  return res
}
