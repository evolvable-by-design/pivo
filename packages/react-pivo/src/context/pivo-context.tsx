import React, { FunctionComponent } from 'react'
import Pivo from '@evolvable-by-design/pivo'

type Context = {
  pivo?: Pivo
}

const PivoStateContext = React.createContext<Context>({})

const PivoContextProvider: FunctionComponent<{ state: Context }> = ({ children, state }) => {
  return (
    <PivoStateContext.Provider value={state}>
      {children}
    </PivoStateContext.Provider>
  )
}

function usePivoContextState() {
  const context = React.useContext(PivoStateContext)
  if (context === undefined) {
    throw new Error('usePivoContextState must be used within a PivoContextProvider')
  }
  return context
}

function usePivo(): Pivo {
  const { pivo } = usePivoContextState()
  if (pivo !== undefined) {
    return pivo
  } else {
    throw new Error('Pivo must be used within a PivoContextProvider that was provided a value')
  }
}

export { PivoContextProvider, usePivoContextState, usePivo }
