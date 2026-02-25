import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { type FieldValues, Path, useFormContext, type UseFormReturn } from 'react-hook-form'

import { buildNestedValues } from './helper'
import { type StepValidationMode, type MaybePromise } from './types'

type StepperContextValue<TFieldValues extends FieldValues = FieldValues> = {
  activeStep: number
  jumpTo: (step: number, onLeave?: (values: Partial<TFieldValues>) => MaybePromise<void>) => Promise<boolean>
  fields: string[] | null
  validSteps: number[]
  isFirstStep: boolean
  isLastStep: boolean
  next: (onLeave?: ((values: Partial<TFieldValues>) => MaybePromise<void>) | unknown) => Promise<boolean>
  prev: (onLeave?: ((values: Partial<TFieldValues>) => MaybePromise<void>) | unknown) => Promise<boolean>
}

type InternalStepperContextValue = {
  step?: number
  registrationKey: number
  rebuildSteps: () => void
  registerStep: (elements: string[], stepRef: React.RefObject<number | undefined>, step?: number) => void
  changeStepAtIndex: (elements: string[], index: number) => void
}

const StepperContext = createContext<StepperContextValue | null>(null)
const InternalStepperContext = createContext<InternalStepperContextValue | null>(null)


function useInternalStepperContext(): InternalStepperContextValue {
  const context = useContext(InternalStepperContext)
  if (!context) {
    throw new Error('useInternalStepperContext must be used within a <Stepper>')
  }
  return context
}

interface StepperProps<TFieldValues extends FieldValues = FieldValues> {
  form?: UseFormReturn<TFieldValues>
  stepValidationMode?: StepValidationMode
  children: React.ReactNode | ((context: StepperContextValue<TFieldValues>) => React.ReactNode)
}

function Stepper<TFieldValues extends FieldValues = FieldValues>(
  { form:formProps, stepValidationMode = 'forward', children }: StepperProps<TFieldValues>,
) {
  const formContext = useFormContext()

  const form = formProps ?? formContext as UseFormReturn<TFieldValues>
  const [steps, setSteps] = useState<string[][]>([])
  const [activeStep, setActiveStep] = useState(-1)
  const [validSteps, setValidSteps] = useState<number[]>([])
  const [registrationKey, setRegistrationKey] = useState(0)

  const stepRef = useRef<number | undefined>(undefined)

  const fields = useMemo<string[] | null>(() => {
    if (activeStep === -1 || !steps[activeStep]) return null
    return Array.from(new Set(steps[activeStep]))
  }, [steps, activeStep])

  const jumpTo = useCallback(
    async (step: number, onLeave?: (values: Partial<TFieldValues>) => MaybePromise<void>): Promise<boolean> => {
      if (activeStep !== -1 && fields && stepValidationMode !== 'none') {
        const isForward = step > activeStep
        const shouldValidate = stepValidationMode === 'all' || (stepValidationMode === 'forward' && isForward)
        if (shouldValidate) {
          const isValid = await form.trigger(fields as Path<TFieldValues>[])
          if (!isValid) {
            setValidSteps((prev) => prev.filter((s) => s !== activeStep))
            return false
          }
          setValidSteps((prev) => [...new Set([...prev, activeStep])])
        }
      }
      if (onLeave && fields) {
        const watchedValues = form.watch(fields as Path<TFieldValues>[])
        const values = buildNestedValues(fields, watchedValues) as Partial<TFieldValues>
        await onLeave(values)
      }
      setActiveStep(step)
      return true
    },
    [activeStep, fields, form, stepValidationMode],
  )

  const isFirstStep = useMemo(
    () => activeStep === -1 || activeStep === 0,
    [activeStep],
  )

  const isLastStep = useMemo(
    () => activeStep === -1 || activeStep === steps.length - 1,
    [activeStep, steps.length],
  )

  const next = useCallback(async (onLeave?: ((values: Partial<TFieldValues>) => MaybePromise<void>) | unknown): Promise<boolean> => {
    const callback = typeof onLeave === 'function' ? onLeave as (values: Partial<TFieldValues>) => MaybePromise<void> : undefined
    if (activeStep === -1 || activeStep >= steps.length - 1) return false
    if (fields && stepValidationMode !== 'none') {
      const isValid = await form.trigger(fields as Path<TFieldValues>[])
      if (!isValid) {
        setValidSteps((prev) => prev.filter((s) => s !== activeStep))
        return false
      }
      setValidSteps((prev) => [...new Set([...prev, activeStep])])
    }
    if (callback && fields) {
      const watchedValues = form.watch(fields as Path<TFieldValues>[])
      const values = buildNestedValues(fields, watchedValues) as Partial<TFieldValues>
      await callback(values)
    }
    setActiveStep(activeStep + 1)
    return true
  }, [steps.length, activeStep, fields, form, stepValidationMode])

  const prev = useCallback(async (onLeave?: ((values: Partial<TFieldValues>) => MaybePromise<void>) | unknown): Promise<boolean> => {
    const callback = typeof onLeave === 'function' ? onLeave as (values: Partial<TFieldValues>) => MaybePromise<void> : undefined
    if (activeStep === -1 || activeStep <= 0) return false
    if (fields && stepValidationMode === 'all') {
      const isValid = await form.trigger(fields as Path<TFieldValues>[])
      if (!isValid) {
        setValidSteps((prev) => prev.filter((s) => s !== activeStep))
        return false
      }
      setValidSteps((prev) => [...new Set([...prev, activeStep])])
    }
    if (callback && fields) {
      const watchedValues = form.watch(fields as Path<TFieldValues>[])
      const values = buildNestedValues(fields, watchedValues) as Partial<TFieldValues>
      await callback(values)
    }
    setActiveStep(activeStep - 1)
    return true
  }, [activeStep, fields, form, stepValidationMode])

  const registerStep = useCallback(
    (elements: string[], stepRef: React.RefObject<number | undefined>, step?: number): void => {
      setSteps((prevSteps) => {
        const stepNumber = step ?? prevSteps.length
        stepRef.current = stepNumber
        const newSteps = [...prevSteps]
        newSteps.splice(stepNumber, 0, elements)

        if (activeStep === -1 && newSteps.length > 0) {
          setActiveStep(0)
        }

        return newSteps
      })
    },
    [activeStep],
  )

  const rebuildSteps = useCallback(() => {
    setSteps([])
    setRegistrationKey((prev) => prev + 1)
  }, [])


  const changeStepAtIndex = useCallback((elements: string[], index: number): void => {
    setSteps((prevSteps) => {
      const newSteps = [...prevSteps]
      newSteps[index] = elements
      return newSteps
    })
  }, [])


  const publicContextValue = useMemo<StepperContextValue>(
    () => ({
      activeStep,
      jumpTo,
      fields,
      validSteps,
      isFirstStep,
      isLastStep,
      next,
      prev,
    }),
    [
      activeStep,
      jumpTo,
      fields,
      validSteps,
      isFirstStep,
      isLastStep,
      next,
      prev,
    ],
  )

  const internalContextValue = useMemo<InternalStepperContextValue>(
    () => ({
      // eslint-disable-next-line react-hooks/refs
      step: stepRef.current,
      registrationKey,
      rebuildSteps,
      registerStep,
      changeStepAtIndex,
    }),
    [registrationKey, rebuildSteps, registerStep, changeStepAtIndex],
  )

  const resolvedChildren =
    // eslint-disable-next-line react-hooks/refs
    typeof children === 'function' ? children(publicContextValue as unknown as StepperContextValue<TFieldValues>) : children

  return (
    // eslint-disable-next-line react-hooks/refs
    <StepperContext.Provider value={publicContextValue}>
      <InternalStepperContext.Provider value={internalContextValue}>
        {resolvedChildren}
      </InternalStepperContext.Provider>
    </StepperContext.Provider>
  )
}

function useStepper<TFieldValues extends FieldValues = FieldValues>(): StepperContextValue<TFieldValues> {
  const context = useContext(StepperContext)
  return context as unknown as StepperContextValue<TFieldValues>
}

export { Stepper, StepperContext, InternalStepperContext, useInternalStepperContext, useStepper }
export type { StepperProps, StepperContextValue, InternalStepperContextValue }
