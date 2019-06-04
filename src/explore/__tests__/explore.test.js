const Maybe = val => ({
  value: val instanceof Error ? undefined : val,
  error: val instanceof Error ? val : undefined,
  pipe (...fns) {
    const combine = (maybe, fn) => maybe.value ? Maybe(fn(maybe.value)) : maybe
    return fns.reduce(combine, this)
  },
  map (fn) {
    return this.value ? Maybe(fn(this.value)) : this
  }
})

const identity = x => x
const double = n => n * 2
const triple = n => n * 3

const pipe = (...fns) => args => fns.reduce((f, g) => g(f), args)

const fetchAsyncData = () => new Promise(
  (resolve, reject) => setTimeout(
    () => resolve(2), 100)
)

describe('Explorations', () => {
  describe("Arrays can be used as a Poor man's error handling", () => {
    // Use arrays for simple container logic.
    // If the value exists then the result will be `[value]`.
    // If the value does not exist then the result will be `[]`
    const wrapped = val => {
      try {
        return val instanceof Function ? [val()] : [val]
      } catch (err) {
        return [] // return an empty array when there is a failure
      }
    }

    const fetchIntAndFail = () => { throw new Error('Unable to fetch Int due to external server failure.') }

    it('Wraps the value in an array', () => {
      const newValue = wrapped(5)
      expect(newValue).toEqual([5])
    })

    it('Allows processing using map', () => {
      const newValue = wrapped(5).map(double)
      expect(newValue).toEqual([10])
    })

    it('Allows for chaining multiple actions', () => {
      const value = wrapped(2)
        .map(double)
        .map(double)
        .map(double)
      expect(value).toEqual([16])
    })

    it('It does not invoke the function when there is an error', () => {
      const value = wrapped(fetchIntAndFail)
        .map(double)
      expect(value).toEqual([])
    })

    it('It skips the rest of the chain as soon as an error occurs', () => {
      const value = wrapped(fetchIntAndFail)
        .map(double)
        .map(double)
        .map(double)
      expect(value).toEqual([])
    })
  })

  describe('Improved error handling', () => {
    it('Uses has a constructor that wraps the value', () => {
      const wrappedVal = Maybe(10)
      expect(wrappedVal.value).toEqual(10)
      expect(wrappedVal.error).toBeUndefined()
    })

    it('Errors are encoded in the actual value', () => {
      const wrappedVal = Maybe(new Error('Unable to get value'))
      expect(wrappedVal.error).toBeDefined()
      expect(wrappedVal.value).toBeUndefined()
    })

    it('Allows chaining of multiple actions', () => {
      // Note that 'double' knows nothing about how 'Maybe' works.
      // It assumes just simple values.
      const maybeVal = Maybe(2)
        .map(double)
        .map(double)
        .map(double)
      expect(maybeVal.value).toEqual(16)
    })

    it('Executes until there is a failure', () => {
      const failToDouble = () => new Error('Ooops, I failed to double')
      // 'double' does not need to concern itself with
      // error handling because Maybe abstracts it away.
      let maybeVal = Maybe(2)
        .map(double)
        .map(failToDouble)
        .map(double)

      expect(maybeVal.value).toBeUndefined()
    })

    it('Chaining can be specified as pipes', () => {
      const maybeVal = Maybe(2).pipe(
        double,
        double,
        double
      )
      expect(maybeVal.value).toEqual(16)
    })

    it('Pipelining without caring about error handling', () => {
      const failToDouble = () => new Error('Ooops, I failed to double')
      const maybeVal = Maybe(2).pipe(
        double,
        failToDouble,
        double
      )
      expect(maybeVal.value).toBeUndefined()
      expect(maybeVal.error).toBeDefined()
    })

    it('Pipelines can be composed dynamically based on user input', () => {
      function doStuff (performAdditional) {
        const basicOperations = [double, double]
        const additionalOperations = performAdditional ? [triple] : []

        const actions = [
          ...basicOperations,
          ...additionalOperations
        ]

        return Maybe(2).pipe(...actions)
      }

      expect(doStuff(true).value).toEqual(24) // 2 * 2 * 2 * 3 = 24
      expect(doStuff(false).value).toEqual(8) // 2 * 2 * 2 = 8
    })

    it('Pipe allow functions to be combined with very little overhead', () => {
      const doubleThenTriple = pipe(double, triple)
      expect(
        Maybe(2).map(doubleThenTriple).value
      ).toEqual(12)
    })
  })

  describe('Promises follow the same pattern but for async', () => {
    it('Promises wrap values (but they called map "then")', async () => {
      return Promise.resolve(2)
        .then(n => expect(n).toEqual(2))
    })

    it('Promises allow chaining', () => {
      return Promise.resolve(2)
        .then(double)
        .then(double)
        .then(double)
        .then(n => expect(n).toEqual(16))
    })

    it('Promises also handle errors for you', () => {
      const unableToDouble = n => { throw new Error('Not able to double') }
      return Promise.resolve(2)
        .then(double)
        .then(unableToDouble)
        .then(double)
        .catch(err => {
          expect(err).toBeDefined()
        })
    })

    it('Promises have special syntactic sugar in JS', async () => {
      // await makes asynchronous code read like synchronous code
      const val = await fetchAsyncData()
      expect(val).toEqual(2)

      // It is equivalent to:
      return fetchAsyncData()
        .then(n => expect(n).toEqual(2))
    })
  })

  describe('Functor design pattern', () => {
    it('A functor is a data structure that implements map', () => {
      const maybeVal = Maybe(2)
      expect(maybeVal.map).toBeDefined()
    })

    it('Functors must support the identity function', () => {
      const maybeVal = Maybe(2)
        .map(identity)
        .map(identity)
      expect(maybeVal.value).toEqual(2)
    })

    it('Functors must support associative composition', () => {
      const val1 = Maybe(2).map(double).map(triple)
      const val2 = Maybe(2).map(n => triple(double(n)))
      expect(val1.value).toEqual(val2.value)
    })
  })

  describe('Examples of functors', () => {
    it('Maybe is a functor', () => {
      expect(
        Maybe(2).map(double).map(triple).value // implements map
      ).toEqual(12)

      expect(
        Maybe(2).map(identity).map(identity).value // supports identity
      ).toEqual(2)

      expect(
        Maybe(2).map(n => triple(double(n))).value // associative
      ).toEqual(12)
    })

    it('Arrays are functors', () => {
      expect(
        [2].map(double).map(triple) // implements map
      ).toEqual([12])

      expect(
        [2].map(identity).map(identity) // supports identity
      ).toEqual([2])

      expect(
        [2].map(n => triple(double(n))) // associative
      ).toEqual([12])
    })

    it('Promises are functors', async () => {
      expect(await Promise.resolve(2)
        .then(double) // They use 'then' instead of 'map'
        .then(triple)
      ).toEqual(12)

      const val2 = await Promise.resolve(2)
        .then(identity)
        .then(identity)
      expect(val2).toEqual(2)

      const val3 = await Promise.resolve(2)
        .then(n => triple(double(n))) // associative
      expect(val3).toEqual(12)
    })

    it('Same interface (if implemented correctly), different use cases', async () => {
      // Arrays apply a function to all elements in an Array.
      // They abstract away applying the same logic in multiple places.
      expect([1, 2, 3].map(double)).toEqual([2, 4, 6])

      // Promises apply a function across time.
      // They abstract away the aspect of time
      expect(await fetchAsyncData().then(double)).toEqual(4)

      // Maybe apply a function conditionally if there are no errors.
      // They abstract away error handling.
      const failToDouble = () => new Error('Ooops, I failed to double')
      let maybeVal = Maybe(2).map(failToDouble).map(double)
      expect(maybeVal.value).toBeUndefined()
    })
  })
})
