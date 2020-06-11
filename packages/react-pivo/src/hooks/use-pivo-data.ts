import { useState, useEffect } from 'react'
import { SemanticData } from '@evolvable-by-design/pivo'
import { DataSemantics } from '@evolvable-by-design/pivo/build/domain'

export default function usePivoData (
  data: SemanticData,
  mappings: { [keyInResult: string]: DataSemantics }
): { [key: string]: any } {
  const [resolvedData, setResolvedData] = useState<{ [key: string]: any }>({})

  useEffect(() => {
    const keysInResult = Object.keys(mappings)
    const promises = Object.values(mappings).map(semanticKey =>
      data.getOneValue(semanticKey)
    )

    Promise.all(promises)
      .then(values =>
        values.reduce((acc, value, index) => {
          acc[keysInResult[index]] = value
          return acc
        }, {} as { [key: string]: any })
      )
      .then(setResolvedData)
  }, [data, mappings])

  return resolvedData
}
