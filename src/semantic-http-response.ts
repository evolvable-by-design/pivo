import OperationSchema from './operation-schema'
import SemanticData from './semantic-data'

export default class SemanticHttpResponse {
  readonly data: SemanticData
  constructor (
    readonly rawData: object,
    readonly operationSchema: OperationSchema,
    readonly request: object
  ) {}
}
