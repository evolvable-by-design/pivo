import React, { FunctionComponent } from 'react'
import { SemanticData } from '@evolvable-by-design/pivo'
import { DataSemantics } from '@evolvable-by-design/pivo/build/domain'

import WithSemanticDataRequired from './with-semantic-data-required'

export type WithSemanticDataProps = {
  data?: SemanticData
  mappings: { [keyInResult: string]: DataSemantics }
  children: (data: object) => React.ReactElement
  fallback?: React.ReactElement
}

const WithSemanticData: FunctionComponent<WithSemanticDataProps> = ({
  data,
  mappings,
  children,
  fallback
}) => {
  if (data === undefined) {
    return fallback ? fallback : <p>Waiting for data...</p>
  } else {
    return (
      <WithSemanticDataRequired
        data={data}
        mappings={mappings}
        fallback={fallback}
      >
        {children}
      </WithSemanticDataRequired>
    )
  }
}

export default WithSemanticData
