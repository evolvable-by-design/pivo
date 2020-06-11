import React, { FunctionComponent } from 'react'
import { SemanticData } from '@evolvable-by-design/pivo'

import { WithSemanticDataProps } from './with-semantic-data'
import usePivoData from '../hooks/use-pivo-data'

type WithSemanticDataRequiredProps = WithSemanticDataProps & {
  data: SemanticData
  loader?: React.ReactNode
}

const WithSemanticDataRequired: FunctionComponent<WithSemanticDataRequiredProps> = ({
  data,
  mappings,
  children,
  loader
}) => {
  const dataToDisplay = usePivoData(data, mappings)
  if (data === undefined) {
    return <>{loader || null}</>
  } else {
    return <>{children(dataToDisplay)}</>
  }
}

export default WithSemanticDataRequired
