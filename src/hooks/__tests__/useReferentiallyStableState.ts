import {renderHook, act} from '@testing-library/react-hooks'

import useReferentiallyStableState from '../useReferentiallyStableState'

jest.useFakeTimers()

function itHandlesPrimitiveTypes<T>(typeName: string, initialValue: T, updatedValue: T): void {
  describe(typeName, () => {
    it('maintains equality if the value is unchanged', () => {
      const obj = {value: initialValue}
      const {result} = renderHook(useReferentiallyStableState, {
        initialProps: obj,
      })
      const [value, setValue] = result.current

      expect(value).toBe(obj)

      const newObj = {value: initialValue}

      act(() => {
        setValue(newObj)
        jest.advanceTimersByTime(100)
      })

      const [newValue] = result.current

      expect(newValue.value).toEqual(newObj.value)
    })

    it('correctly invalidates the value if changed', () => {
      const obj = {value: initialValue}
      const {result} = renderHook(useReferentiallyStableState, {
        initialProps: obj,
      })
      const [value, setValue] = result.current

      expect(value).toBe(obj)

      const newObj = {value: updatedValue}

      act(() => {
        setValue(newObj)
        jest.advanceTimersByTime(100)
      })

      const [newValue] = result.current

      expect(newValue).toEqual(newObj)
      expect(newValue.value).not.toBe(obj.value)
    })
  })
}

describe('#useReferentiallyStableState', () => {
  it('initializes to the passed-in value', () => {
    const obj = {a: 1, b: 2}
    const {result} = renderHook(() => useReferentiallyStableState(obj))
    const [value] = result.current

    expect(value).toBe(obj)
  })

  itHandlesPrimitiveTypes('numbers', 1, 2)
  itHandlesPrimitiveTypes('booleans', true, false)
  itHandlesPrimitiveTypes('strings', 'hello', 'goodbye')

  describe('objects', () => {
    it('maintains referential equality if the new updated value is equivalent to the old value.', () => {
      const obj = {value: {a: 1}}
      const {result} = renderHook(useReferentiallyStableState, {initialProps: obj})
      const [value, setValue] = result.current

      expect(value).toBe(obj)

      const newObj = {value: {a: 1}}

      act(() => {
        setValue(newObj)
        jest.advanceTimersByTime(100)
      })

      const [newValue] = result.current

      // The entire object should maintain the same reference since nothing changed
      expect(newValue).toBe(obj)
    })

    it('maintains referential equality if the new updated value is equivalent to the old value.', () => {
      const obj = {
        value: {a: 1},
        arrayValue: [1, 2, 3],
        b: 2,
      }
      const {result} = renderHook(useReferentiallyStableState, {initialProps: obj})
      const [value, setValue] = result.current

      expect(value).toBe(obj)

      const newObj = {
        value: {a: 1},
        arrayValue: [1, 2, 3],
        b: 3,
      }

      act(() => {
        setValue(newObj)
        jest.advanceTimersByTime(100)
      })

      const [newValue] = result.current

      expect(newValue.value).toBe(obj.value)
      expect(newValue.arrayValue).toBe(obj.arrayValue)
      expect(newValue.b).toBe(3)
    })

    it('recursively maintains referential equality if a new updated sub-value is equivalent to the old sub-value.', () => {
      const obj = {
        value: {
          a: 1,
          b: 2,
          c: {
            d: 'hello',
          },
        },
        arrayValue: [{e: 1}, {f: true}, 1],
        g: true,
      }
      const {result} = renderHook(useReferentiallyStableState, {initialProps: obj})
      const [value, setValue] = result.current

      expect(value).toBe(obj)

      const newObj = {
        value: {
          a: 3,
          b: 2,
          c: {
            d: 'hello',
          },
        },
        arrayValue: [{e: 1}, {f: true}, 3],
        g: true,
      }

      act(() => {
        setValue(newObj)
        jest.advanceTimersByTime(100)
      })

      const [newValue] = result.current

      expect(newValue).toEqual(newObj)
      expect(newValue.value).not.toBe(obj.value)
      expect(newValue.value.c).toBe(obj.value.c)

      expect(newValue.arrayValue).not.toBe(obj.arrayValue)
      expect(newValue.arrayValue[0]).toBe(obj.arrayValue[0])
      expect(newValue.arrayValue[1]).toBe(obj.arrayValue[1])
      expect(newValue.arrayValue[2]).not.toBe(obj.arrayValue[2])
    })
  })

  describe('arrays', () => {
    it('maintains referential equality if the new updated value is equivalent to the old value.', () => {
      const arr = [1, true, {a: 1}]
      const {result} = renderHook(useReferentiallyStableState, {initialProps: arr})
      const [value, setValue] = result.current

      expect(value).toBe(arr)

      const newArr = [1, true, {a: 1}]

      act(() => {
        setValue(newArr)
        jest.advanceTimersByTime(100)
      })

      const [newValue] = result.current

      // The entire object should maintain the same reference since nothing changed
      expect(newValue).toBe(arr)
    })

    it('maintains referential equality if the new updated value is equivalent to the old value.', () => {
      const arr = [1, true, {a: 1}]
      const {result} = renderHook(useReferentiallyStableState, {initialProps: arr})
      const [value, setValue] = result.current

      expect(value).toBe(arr)

      const newArr = [2, true, {a: 1}]

      act(() => {
        setValue(newArr)
        jest.advanceTimersByTime(100)
      })

      const [newValue] = result.current
      expect(newValue[0]).not.toBe(arr[0])
      expect(newValue[2]).toBe(arr[2])
    })
  })
})
