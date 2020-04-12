import Ajv from 'ajv'

const dataConstraintsChecker = new Ajv({
  unknownFormats: 'ignore',
  formats: {
    int8: (v: string) => {
      const value = parseInt(v, 10)
      return !isNaN(value) && value >= -128 && value <= 127
    },
    int16: (v: string) => {
      const value = parseInt(v, 10)
      return !isNaN(value) && value >= -32768 && value <= 32767
    }
  }
})

export default dataConstraintsChecker
