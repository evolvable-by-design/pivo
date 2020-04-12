export type Map<V> = { [key: string]: V }

export function cast<A> (value: any, constructor: { new (): A }): A {
  if (value instanceof constructor) {
    return value as A
  } else {
    throw new Error('Invalid cast exception')
  }
}

export function mapFind<A, B> (
  object: A[],
  mapper: (a: A) => B | undefined
): B | undefined {
  for (const el of object) {
    const res = mapper(el)
    if (res !== undefined) return res
  }
  return undefined
}

export function mapObject<B> (
  object: Object,
  mapper: (k: string, value: any) => [string, B] | undefined
): Object {
  return Object.entries(object)
    .map(([key, value]) => mapper(key, value))
    .filter(el => el !== undefined)
    .reduce(reduceMap, {})
}

export function mapMap<A, B> (
  object: Map<A>,
  mapper: (k: string, value: A) => [string, B] | undefined
): Map<B> {
  return Object.entries(object)
    .map(([key, value]) => mapper(key, value))
    .filter(el => el !== undefined)
    .reduce(reduceMap, {})
}

export function matchUrlPattern (url: string, pattern: string): boolean {
  const urlSplit = removeQueryAndTrailingSlash(url).split('/')
  const patternSplit = removeQueryAndTrailingSlash(pattern).split('/')

  if (patternSplit.length < urlSplit.length) return false

  return patternSplit
    .map((fragment, index) => {
      if (fragment.startsWith('{') && fragment.endsWith('}')) {
        return urlSplit[index] !== undefined
      } else {
        return fragment === urlSplit[index]
      }
    })
    .reduce((match, el) => match && el, true)
}

export function mergeOptionalArrays<A> (arr1: A[] = [], arr2: A[] = []): A[] {
  return arr1.concat(arr2)
}

export function reduceMap<A> (res: Map<A>, [key, value]: [string, A]) {
  res[key] = value
  return res
}

export function reduceObject (acc: object, [key, value]: [string, unknown]) {
  acc[key] = value
  return acc
}

export function flattenArray<A> (acc: Array<A>, value: Array<A>): Array<A> {
  return acc.concat(value)
}

export function removeQueryAndTrailingSlash (url: string): string {
  const urlWithoutQuery =
    url.indexOf('?') === -1 ? url : url.slice(0, url.indexOf('?'))
  return urlWithoutQuery.endsWith('/')
    ? urlWithoutQuery.slice(0, urlWithoutQuery.length - 1)
    : urlWithoutQuery
}
