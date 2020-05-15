import React, { FunctionComponent, useState, useEffect } from 'react'
import { OpenAPIV3 } from 'openapi-types'
import Pivo from '@evolvable-by-design/pivo'

import { PivoContextProvider } from '../context/pivo-context'

interface Props {
  fetch: () => Promise<OpenAPIV3.Document>,
  loader?: React.ReactNode,
  error?: (errorMessage: string) => React.ReactNode
}

const DocumentationProvider: FunctionComponent<Props> = ({ fetch, loader, error: errorComponent, children }) => {
  const [isLoading, setLoading] = useState(false)
  const [documentation, setDocumentation] = useState<Pivo>()
  const [error, setError] = useState<Error>()

  useEffect(() => {
    setLoading(true)

    fetch()
      .then(documentation => new Pivo(documentation))
      .then(setDocumentation)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  if (isLoading) {
    return <>{loader || null}</>
  } else if (documentation !== undefined) {
    return <PivoContextProvider state={{ pivo: documentation }}>
      {children}
    </PivoContextProvider>
  } else {
    return <>{ errorComponent?.(error?.message || 'Something unexpected happened. Please try again later.') || null }</>
  }
}

export default DocumentationProvider