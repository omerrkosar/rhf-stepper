import { createContext, forwardRef, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { type FieldValues, Path, type UseFormReturn } from 'react-hook-form'

import { Step } from './step'
import { type StepTree, type StepValidationMode } from './types'

function comparePaths(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i] ?? -1
    const bi = b[i] ?? -1
    if (ai !== bi) return ai - bi
  }
  return 0
}

function getNodeAtPath(tree: StepTree, path: number[]): StepTree | undefined {
  let current: StepTree = tree
  for (const index of path) {
    if (!Array.isArray(current) || index >= current.length) return undefined
    current = current[index]
  }
  return current
}

function isLeafParent(node: StepTree): node is string[] {
  return Array.isArray(node) && node.length > 0 && node.every((child) => typeof child === 'string')
}

function getFirstLeafParentPath(tree: StepTree, path: number[]): number[] | null {
  const node = getNodeAtPath(tree, path)
  if (node === undefined) return null
  if (isLeafParent(node)) return path
  if (Array.isArray(node) && node.length > 0) {
    for (let i = 0; i < node.length; i++) {
      const found = getFirstLeafParentPath(tree, [...path, i])
      if (found) return found
    }
  }
  return null
}

function getLastLeafParentPath(tree: StepTree, path: number[]): number[] | null {
  const node = getNodeAtPath(tree, path)
  if (node === undefined) return null
  if (isLeafParent(node)) return path
  if (Array.isArray(node) && node.length > 0) {
    for (let i = node.length - 1; i >= 0; i--) {
      const found = getLastLeafParentPath(tree, [...path, i])
      if (found) return found
    }
  }
  return null
}

function getPrevLeafParentPath(tree: StepTree, path: number[]): number[] | null {
  const current = [...path]
  while (current.length > 0) {
    const lastIndex = current[current.length - 1]
    const parentPath = current.slice(0, -1)
    const parent = getNodeAtPath(tree, parentPath)

    if (Array.isArray(parent)) {
      for (let i = lastIndex - 1; i >= 0; i--) {
        const found = getLastLeafParentPath(tree, [...parentPath, i])
        if (found) return found
      }
    }

    current.pop()
  }

  return null
}

function getNextLeafParentPath(tree: StepTree, path: number[]): number[] | null {
  const current = [...path]
  while (current.length > 0) {
    const lastIndex = current[current.length - 1]
    const parentPath = current.slice(0, -1)
    const parent = getNodeAtPath(tree, parentPath)

    if (Array.isArray(parent)) {
      for (let i = lastIndex + 1; i < parent.length; i++) {
        const found = getFirstLeafParentPath(tree, [...parentPath, i])
        if (found) return found
      }
    }

    current.pop()
  }

  return null
}

type FormContextValue<TFieldValues extends FieldValues = FieldValues> = {
  form: UseFormReturn<TFieldValues>
  currentStep: number | number[] | null
  setCurrentStep: (step: number | number[], beforeStepChange?: (values: Partial<TFieldValues>) => Promise<void>) => Promise<boolean>
  currentStepNode: StepTree | undefined
  currentStepArr: string[] | null
  validatedFields: string[]
  isFirstStep: boolean
  isLastStep: boolean
  next: (beforeStepChange?: (values: Partial<TFieldValues>) => Promise<void>) => Promise<boolean>
  prev: (beforeStepChange?: (values: Partial<TFieldValues>) => Promise<void>) => Promise<boolean>
}

type InternalFormContextValue = {
  step?: number
  registrationKey: number
  rebuildSteps: () => void
  registerStep: (elements: StepTree, stepRef: React.RefObject<number | undefined>, step?: number) => void
  changeStepAtIndex: (elements: StepTree, index: number) => void
}

const FormContext = createContext<FormContextValue | null>(null)
const InternalFormContext = createContext<InternalFormContextValue | null>(null)

function useFormContext<TFieldValues extends FieldValues = FieldValues>(): FormContextValue<TFieldValues> {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a <Form>')
  }
  return context as unknown as FormContextValue<TFieldValues>
}

function useInternalFormContext(): InternalFormContextValue {
  const context = useContext(InternalFormContext)
  if (!context) {
    throw new Error('useInternalFormContext must be used within a <Form>')
  }
  return context
}

interface FormProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<React.ComponentProps<'form'>, 'onSubmit' | 'children'> {
  form: UseFormReturn<TFieldValues>
  onSubmit: (values: TFieldValues) => void
  stepValidationMode?: StepValidationMode
  children: React.ReactNode | ((context: FormContextValue<TFieldValues>) => React.ReactNode)
}

function FormInner<TFieldValues extends FieldValues = FieldValues>(
  { form, onSubmit, stepValidationMode = 'forward', children, ...props }: FormProps<TFieldValues>,
  ref: React.Ref<HTMLFormElement>,
) {
  const [steps, setSteps] = useState<StepTree>([])
  const [currentStep, setCurrentStep] = useState<number[] | null>(null)
  const [validatedFields, setValidatedFields] = useState<string[]>([])
  const [registrationKey, setRegistrationKey] = useState(0)

  const stepRef = useRef<number | undefined>(undefined)

  const _currentStep = useMemo<number | number[] | null>(() => {
    if (!currentStep) return null
    const sliced = currentStep.slice(1)
    return sliced.length === 1 ? sliced[0] : sliced
  }, [currentStep])

  const currentStepNode = useMemo(
    () => (currentStep ? getNodeAtPath(steps, currentStep) : undefined),
    [steps, currentStep],
  )

  const currentStepArr = useMemo<string[] | null>(() => {
    if (!currentStepNode) return null
    return isLeafParent(currentStepNode) ? currentStepNode : null
  }, [currentStepNode])

  const _setCurrentStep = useCallback(
    async (step: number | number[], beforeStepChange?: (values: Partial<TFieldValues>) => Promise<void>): Promise<boolean> => {
      const path = typeof step === 'number' ? [0, step] : [0, ...step]
      if (currentStep && currentStepArr && stepValidationMode !== 'none') {
        const isForward = comparePaths(path, currentStep) > 0
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
        const values = currentStepArr.reduce((acc, field, i) => { acc[field] = watchedValues[i]; return acc }, {} as Record<string, unknown>) as Partial<TFieldValues>
        await beforeStepChange(values)
      }
      setCurrentStep(path)
      return true
    },
    [currentStep, currentStepArr, form, stepValidationMode],
  )

  const isFirstStep = useMemo(
    () => (currentStep ? getPrevLeafParentPath(steps, currentStep) === null : true),
    [steps, currentStep],
  )

  const isLastStep = useMemo(
    () => (currentStep ? getNextLeafParentPath(steps, currentStep) === null : true),
    [steps, currentStep],
  )

  const next = useCallback(async (beforeStepChange?: (values: Partial<TFieldValues>) => Promise<void>): Promise<boolean> => {
    if (!currentStep) return false
    const nextPath = getNextLeafParentPath(steps, currentStep)
    if (currentStepArr && stepValidationMode !== 'none') {
      const isValid = await form.trigger(currentStepArr as Path<TFieldValues>[])
      if (!isValid) {
        setValidatedFields((prev) => prev.filter((field) => !currentStepArr.includes(field)))
        return false
      }
      setValidatedFields((prev) => [...new Set([...prev, ...currentStepArr])])
    }
    if (nextPath) {
      if (beforeStepChange && currentStepArr) {
        const watchedValues = form.watch(currentStepArr as Path<TFieldValues>[])
        const values = currentStepArr.reduce((acc, field, i) => { acc[field] = watchedValues[i]; return acc }, {} as Record<string, unknown>) as Partial<TFieldValues>
        await beforeStepChange(values)
      }
      setCurrentStep(nextPath)
      return true
    }
    return false
  }, [steps, currentStep, currentStepArr, form, stepValidationMode])

  const prev = useCallback(async (beforeStepChange?: (values: Partial<TFieldValues>) => Promise<void>): Promise<boolean> => {
    if (!currentStep) return false
    const prevPath = getPrevLeafParentPath(steps, currentStep)
    if (currentStepArr && stepValidationMode === 'all') {
      const isValid = await form.trigger(currentStepArr as Path<TFieldValues>[])
      if (!isValid) {
        setValidatedFields((prev) => prev.filter((field) => !currentStepArr.includes(field)))
        return false
      }
      setValidatedFields((prev) => [...new Set([...prev, ...currentStepArr])])
    }
    if (prevPath) {
      if (beforeStepChange && currentStepArr) {
        const watchedValues = form.watch(currentStepArr as Path<TFieldValues>[])
        const values = currentStepArr.reduce((acc, field, i) => { acc[field] = watchedValues[i]; return acc }, {} as Record<string, unknown>) as Partial<TFieldValues>
        await beforeStepChange(values)
      }
      setCurrentStep(prevPath)
      return true
    }
    return false
  }, [steps, currentStep, currentStepArr, form, stepValidationMode])

  const registerStep = useCallback(
    (elements: StepTree, stepRef: React.RefObject<number | undefined>, step?: number): void => {
      setSteps((prevSteps: StepTree) => {
        const stepNumber = step ?? (Array.isArray(prevSteps) ? prevSteps.length : 0)
        stepRef.current = stepNumber
        const newSteps = Array.isArray(prevSteps) ? [...prevSteps] : [prevSteps]
        newSteps.splice(stepNumber, 0, elements)

        if (currentStep === null) {
          const firstLeafParent = getFirstLeafParentPath(newSteps, [0])
          if (firstLeafParent) {
            setCurrentStep(firstLeafParent)
          }
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

  const changeStepAtIndex = useCallback((steps: StepTree, index: number): void => {
    setSteps((prevSteps) => {
      const newSteps = Array.isArray(prevSteps) ? [...prevSteps] : [prevSteps]
      newSteps[index] = steps
      return newSteps
    })
  }, [])

  const publicContextValue = useMemo<FormContextValue>(
    () => ({
      currentStep: _currentStep,
      setCurrentStep: _setCurrentStep,
      currentStepNode,
      currentStepArr,
      validatedFields,
      isFirstStep,
      isLastStep,
      form: form as unknown as UseFormReturn<FieldValues>,
      next,
      prev,
    }),
    [
      form,
      _currentStep,
      _setCurrentStep,
      currentStepNode,
      currentStepArr,
      validatedFields,
      isFirstStep,
      isLastStep,
      next,
      prev,
    ],
  )

  const internalContextValue = useMemo<InternalFormContextValue>(
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
    typeof children === 'function' ? children(publicContextValue as unknown as FormContextValue<TFieldValues>) : children

  return (
    // eslint-disable-next-line react-hooks/refs
    <FormContext.Provider value={publicContextValue}>
      <InternalFormContext.Provider value={internalContextValue}>
        <form ref={ref} onSubmit={form.handleSubmit(onSubmit)} {...props}>
          <Step>{resolvedChildren}</Step>
        </form>
      </InternalFormContext.Provider>
    </FormContext.Provider>
  )
}

const Form = forwardRef(FormInner) as <TFieldValues extends FieldValues = FieldValues>(
  props: FormProps<TFieldValues> & { ref?: React.Ref<HTMLFormElement> },
) => React.JSX.Element

;(Form as React.NamedExoticComponent & { displayName?: string }).displayName = 'Form'

export { Form, useFormContext, useInternalFormContext }
export type { FormContextValue, FormProps, InternalFormContextValue }
