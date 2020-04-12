export default abstract class Option<A> {
  constructor (protected value?: A) {}

  static of<A> (a: A): Option<A> {
    return Option.ofOptional(a === null ? undefined : a)
  }

  static ofOptional<A> (a?: A): Option<A> {
    return a !== undefined
      ? (new NonEmpty(a) as Option<A>)
      : (new Empty() as Option<A>)
  }

  static empty<A> (): Option<A> {
    return new Empty()
  }

  isEmpty (): boolean {
    return this instanceof Empty
  }

  nonEmpty (): boolean {
    return !this.isEmpty()
  }

  map<B> (mapper: (a: A) => B | undefined): Option<B> {
    return this.flatMap(value => Option.ofOptional(mapper(value)))
  }

  abstract flatMap<B> (mapper: (a: A) => Option<B>): Option<B>

  filter (predicate: (a: A) => boolean): Option<A> {
    return this.flatMap(value =>
      predicate(value) ? Option.ofOptional() : Option.of(value)
    )
  }

  ifPresent (consumer: (a: A) => void): void {
    this.map(consumer)
  }

  getOrElse (alternative: A): A {
    return this.value || alternative
  }

  orElse (alternative: () => Option<A>): Option<A> {
    return this.nonEmpty() ? this : alternative()
  }

  getOrUndefined (): A | undefined {
    return this.value
  }

  getOrThrow (throwable: () => Error): A {
    if (this.value !== undefined) {
      return this.value
    } else {
      throw throwable()
    }
  }
}

class Empty<A> extends Option<A> {
  constructor () {
    super(undefined)
  }

  flatMap<B> (_: (a: A) => Option<B>): Option<B> {
    return new Empty()
  }
}

class NonEmpty<A> extends Option<A> {
  constructor (value: A) {
    super(value)
  }

  flatMap<B> (mapper: (a: A) => Option<B>): Option<B> {
    if (this.value === undefined) {
      throw new Error('Impossible case exception')
    } else {
      return mapper(this.value)
    }
  }
}
