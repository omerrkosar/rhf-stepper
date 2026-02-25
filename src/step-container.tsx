import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { type FieldValues, Path, useFormContext, type UseFormReturn } from 'react-hook-form'

import { buildNestedValues } from './helper'
import { type StepValidationMode } from './types'

type StepperContextValue<TFieldValues extends FieldValues = FieldValues> = {
  currentStep: number
  setCurrentStep: (step: number, beforeStepChange?: (values: Partial<TFieldValues>) => Promise<void>) => Promise<boolean>
  currentStepArr: string[] | null
  validatedFields: string[]
  isFirstStep: boolean
  isLastStep: boolean
  next: (beforeStepChange?: ((values: Partial<TFieldValues>) => Promise<void>) | unknown) => Promise<boolean>
  prev: (beforeStepChange?: ((values: Partial<TFieldValues>) => Promise<void>) | unknown) => Promise<boolean>
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
    throw new Error('useInternalStepperContext must be used within a <StepContainer>')
  }
  return context
}

interface StepContainerProps<TFieldValues extends FieldValues = FieldValues> {
  form?: UseFormReturn<TFieldValues>
  stepValidationMode?: StepValidationMode
  children: React.ReactNode | ((context: StepperContextValue<TFieldValues>) => React.ReactNode)
}

function StepContainer<TFieldValues extends FieldValues = FieldValues>(
  { form:formProps, stepValidationMode = 'forward', children }: StepContainerProps<TFieldValues>,
) {
  const formContext = useFormContext()

  const form = formProps ?? formContext as UseFormReturn<TFieldValues>
  const [steps, setSteps] = useState<string[][]>([])
  const [currentStep, setCurrentStep] = useState(-1)
  const [validatedFields, setValidatedFields] = useState<string[]>([])
  const [registrationKey, setRegistrationKey] = useState(0)

  const stepRef = useRef<number | undefined>(undefined)

  const currentStepArr = useMemo<string[] | null>(() => {
    if (currentStep === -1 || !steps[currentStep]) return null
    return Array.from(new Set(steps[currentStep]))
  }, [steps, currentStep])

  const _setCurrentStep = useCallback(
    async (step: number, beforeStepChange?: (values: Partial<TFieldValues>) => Promise<void>): Promise<boolean> => {
      if (currentStep !== -1 && currentStepArr && stepValidationMode !== 'none') {
        const isForward = step > currentStep
        const shouldValidate = stepValidationMode === 'all' || (stepValidationMode === 'forward' && isForward)
        if (shouldValidate) {
          const isValid = await form.trigger(currentStepArr as Path<TFieldValues>[])
          if (!isValid) {
            setValidatedFields((prev) => prev.filter((field) => !currentStepArr.includes(field)))
            return false
          }
          setValidatedFields((prev) => [...new Set([...prev, ...currentStepArr])])
        }
      }
      if (beforeStepChange && currentStepArr) {
        const watchedValues = form.watch(currentStepArr as Path<TFieldValues>[])
        const values = buildNestedValues(currentStepArr, watchedValues) as Partial<TFieldValues>
        await beforeStepChange(values)
      }
      setCurrentStep(step)
      return true
    },
    [currentStep, currentStepArr, form, stepValidationMode],
  )

  const isFirstStep = useMemo(
    () => currentStep === -1 || currentStep === 0,
    [currentStep],
  )

  const isLastStep = useMemo(
    () => currentStep === -1 || currentStep === steps.length - 1,
    [currentStep, steps.length],
  )

  const next = useCallback(async (beforeStepChange?: ((values: Partial<TFieldValues>) => Promise<void>) | unknown): Promise<boolean> => {
    const callback = typeof beforeStepChange === 'function' ? beforeStepChange as (values: Partial<TFieldValues>) => Promise<void> : undefined
    if (currentStep === -1 || currentStep >= steps.length - 1) return false
    if (currentStepArr && stepValidationMode !== 'none') {
      const isValid = await form.trigger(currentStepArr as Path<TFieldValues>[])
      if (!isValid) {
        setValidatedFields((prev) => prev.filter((field) => !currentStepArr.includes(field)))
        return false
      }
      setValidatedFields((prev) => [...new Set([...prev, ...currentStepArr])])
    }
    if (callback && currentStepArr) {
      const watchedValues = form.watch(currentStepArr as Path<TFieldValues>[])
      const values = buildNestedValues(currentStepArr, watchedValues) as Partial<TFieldValues>
      await callback(values)
    }
    setCurrentStep(currentStep + 1)
    return true
  }, [steps.length, currentStep, currentStepArr, form, stepValidationMode])

  const prev = useCallback(async (beforeStepChange?: ((values: Partial<TFieldValues>) => Promise<void>) | unknown): Promise<boolean> => {
    const callback = typeof beforeStepChange === 'function' ? beforeStepChange as (values: Partial<TFieldValues>) => Promise<void> : undefined
    if (currentStep === -1 || currentStep <= 0) return false
    if (currentStepArr && stepValidationMode === 'all') {
      const isValid = await form.trigger(currentStepArr as Path<TFieldValues>[])
      if (!isValid) {
        setValidatedFields((prev) => prev.filter((field) => !currentStepArr.includes(field)))
        return false
      }
      setValidatedFields((prev) => [...new Set([...prev, ...currentStepArr])])
    }
    if (callback && currentStepArr) {
      const watchedValues = form.watch(currentStepArr as Path<TFieldValues>[])
      const values = buildNestedValues(currentStepArr, watchedValues) as Partial<TFieldValues>
      await callback(values)
    }
    setCurrentStep(currentStep - 1)
    return true
  }, [currentStep, currentStepArr, form, stepValidationMode])

  const registerStep = useCallback(
    (elements: string[], stepRef: React.RefObject<number | undefined>, step?: number): void => {
      setSteps((prevSteps) => {
        const stepNumber = step ?? prevSteps.length
        stepRef.current = stepNumber
        const newSteps = [...prevSteps]
        newSteps.splice(stepNumber, 0, elements)

        if (currentStep === -1 && newSteps.length > 0) {
          setCurrentStep(0)
        }

        return newSteps
      })
    },
    [currentStep],
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
      currentStep,
      setCurrentStep: _setCurrentStep,
      currentStepArr,
      validatedFields,
      isFirstStep,
      isLastStep,
      next,
      prev,
    }),
    [
      currentStep,
      _setCurrentStep,
      currentStepArr,
      validatedFields,
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

export { StepContainer, StepperContext, InternalStepperContext, useInternalStepperContext, useStepper }
export type { StepContainerProps, StepperContextValue, InternalStepperContextValue }
