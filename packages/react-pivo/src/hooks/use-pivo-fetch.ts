import { useEffect, useState } from 'react'
import { ApiOperation, SemanticData } from '@evolvable-by-design/pivo'

export function usePivoFetch<A> (
  operation: ApiOperation | undefined,
  extract: (a: SemanticData) => Promise<SemanticData>,
  type: (a: SemanticData) => Promise<A>
) {
  return usePivoFetchGeneric(operation, extract, type)
}

export function usePivoFetchArray<A> (
  operation: ApiOperation | undefined,
  extract: (a: SemanticData) => Promise<ReadonlyArray<SemanticData>> = a =>
    Promise.resolve([a]),
  type: (a: ReadonlyArray<SemanticData>) => Promise<A>
) {
  return usePivoFetchGeneric(operation, extract, type)
}

function usePivoFetchGeneric<A, SEMANTIC_DATA> (
  operation: ApiOperation | undefined,
  extract: (a: SemanticData) => Promise<SEMANTIC_DATA>,
  type: (a: SEMANTIC_DATA) => Promise<A>
) {
  const [state, setState] = useState<
    SemanticLoadedGeneric<A | undefined, SEMANTIC_DATA>
  >({
    loading: true,
    semanticData: undefined,
    data: undefined
  })

  useEffect(() => {
    if (operation) {
      operation
        .invoke()
        .then(response => extract(response.data))
        .then(semanticData =>
          type(semanticData).then(data => ({ semanticData, data }))
        )
        .then(newStatePartial => {
          setState({
            ...newStatePartial,
            loading: false
          })
        })
    } else {
      setState({
        loading: false,
        semanticData: undefined,
        data: undefined
      })
    }
  }, [operation])

  return state
}

export interface Loaded<A> {
  readonly loading: boolean
  readonly data: A
}

export type SemanticLoaded<A> = Loaded<A> & {
  readonly emanticData?: SemanticData
}

export type SemanticArrayLoaded<A> = Loaded<A> & {
  readonly semanticData?: ReadonlyArray<SemanticData>
}

export type SemanticLoadedGeneric<A, B> = Loaded<A> & {
  readonly semanticData?: B
}
