const tokenLocalStorageKey = 'Authorization'

class AuthenticationService {
  static isAuthenticated (): boolean {
    return (
      AuthenticationService.getToken() !== undefined &&
      AuthenticationService.getToken() !== null
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
    AuthenticationService.removeToken()
  }
}

export default AuthenticationService
/* 
  TODO: create one kind of auth service per kind of auth mecanism, 
  enable to extend this list and instantiate the proper service
  based on one of the mechanism that the API supports, which can be
  discovered in the documentation of the API that we retrieve when 
  this app initialize
*/
