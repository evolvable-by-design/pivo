export class AuthenticationRequiredError extends Error {}
export class InvalidArgumentException extends Error {}
export class NotFoundDataException extends Error {
  constructor (readonly dataKey: string = '') {
    super(`Could not find data ${dataKey}`)
  }
}
