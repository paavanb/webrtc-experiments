import {renderHook, act} from '@testing-library/react-hooks'

import useReferentiallyStableState from '../useReferentiallyStableState'

jest.useFakeTimers()

describe('#useReferentiallyStableState', () => {
  it('initializes to the passed-in value', () => {
    const obj = {a: 1, b: 2}
    const {result} = renderHook(() => useReferentiallyStableState(obj))
    const [value] = result.current

    expect(value).toBe(obj)
  })

  it('correctly invalidates numbers', () => {
    const obj = {value: 1}
    const {result} = renderHook(v => useReferentiallyStableState(v), {
      initialProps: obj,
    })
    const [value, setValue] = result.current

    expect(value).toBe(obj)

    const newObj = {value: 2}

    act(() => {
      setValue(newObj)
      jest.advanceTimersByTime(100)
    })

    const [newValue] = result.current

    expect(newValue).toBe(newObj)
    expect(newValue.value).not.toBe(obj.value)
  })

  it('correctly invalidates booleans', () => {
    const obj = {value: false}
    const {result} = renderHook(v => useReferentiallyStableState(v), {
      initialProps: obj,
    })
    const [value, setValue] = result.current

    expect(value).toBe(obj)

    const newObj = {value: true}

    act(() => {
      setValue(newObj)
      jest.advanceTimersByTime(100)
    })

    const [newValue] = result.current

    expect(newValue.value).toBe(newObj.value)
    expect(newValue.value).not.toBe(obj.value)
  })

  describe('strings', () => {
    it('maintains equality if the string is unchanged', () => {
      const obj = {value: 'hello'}
      const {result} = renderHook(v => useReferentiallyStableState(v), {
        initialProps: obj,
      })
      const [value, setValue] = result.current

      expect(value).toBe(obj)

      const newObj = {value: 'hello'}

      act(() => {
        setValue(newObj)
        jest.advanceTimersByTime(100)
      })

      const [newValue] = result.current

      expect(newValue.value).toEqual(newObj.value)
    })

    it('correctly invalidates strings', () => {
      const obj = {value: 'hello'}
      const {result} = renderHook(v => useReferentiallyStableState(v), {
        initialProps: obj,
      })
      const [value, setValue] = result.current

      expect(value).toBe(obj)

      const newObj = {value: 'goodbye'}

      act(() => {
        setValue(newObj)
        jest.advanceTimersByTime(100)
      })

      const [newValue] = result.current

      expect(newValue).toBe(newObj)
      expect(newValue.value).not.toBe(obj.value)
    })
  })
})
