import { useEffect, useState } from 'react'
import { SemanticData } from '@evolvable-by-design/pivo'
import { Loaded } from './use-pivo-fetch'

type PivoData = { readonly source: SemanticData } & {
  readonly [key: string]: SemanticData | ReadonlyArray<SemanticData>
}

async function getAllData (
  source: SemanticData,
  dataToGet: ReadonlyArray<string>
): Promise<PivoData> {
  const allPromises = dataToGet.map(key =>
    source.getOne(key).then(result => ({ key, result }))
  )

  return Promise.all(allPromises).then(results =>
    results.reduce(
      (acc, previous) => {
        acc[previous.key] = previous.result
        return acc
      },
      { source } as PivoData
    )
  )
}

export default function usePivoArrayData (
  source: ReadonlyArray<SemanticData> | undefined,
  dataToGet: ReadonlyArray<string>
): Loaded<ReadonlyArray<PivoData> | undefined> {
  const [state, setState] = useState<
    Loaded<ReadonlyArray<PivoData> | undefined>
  >({ loading: true, data: undefined })

  if (source !== undefined) {
    useEffect(() => {
      Promise.all(
        source.map(sourceData => getAllData(sourceData, dataToGet))
      ).then(data => setState({ loading: false, data }))
    }, [])
  }

  return state
}
