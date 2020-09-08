const tokenLocalStorageKey = 'Authorization'

class BrowserAuthenticationService {
  static isAuthenticated (): boolean {
    return (
      BrowserAuthenticationService.getToken() !== undefined &&
      BrowserAuthenticationService.getToken() !== null
    )
  }

  static getToken () {
    return window.localStorage.getItem(tokenLocalStorageKey)
  }

  static updateToken (token: string) {
    window.localStorage.setItem(tokenLocalStorageKey, token)
  }

  static removeToken () {
    window.localStorage.removeItem(tokenLocalStorageKey)
  }

  static currentTokenWasRefusedByApi () {
    BrowserAuthenticationService.removeToken()
  }
}

class NodeAuthenticationService {

  static token: string | null = null

  static isAuthenticated (): boolean {
    return NodeAuthenticationService.getToken() !== null
  }

  static getToken () {
    return NodeAuthenticationService.token
  }

  static updateToken (token: string) {
    NodeAuthenticationService.token = token
  }

  static removeToken () {
    NodeAuthenticationService.token = null
  }

  static currentTokenWasRefusedByApi () {
    NodeAuthenticationService.removeToken()
  }
}

const AuthenticationService = typeof process === 'object' ? NodeAuthenticationService : BrowserAuthenticationService

export default AuthenticationService
/* 
  TODO: create one kind of auth service per kind of auth mecanism, 
  enable to extend this list and instantiate the proper service
  based on one of the mechanism that the API supports, which can be
  discovered in the documentation of the API that we retrieve when 
  this app initialize
*/
