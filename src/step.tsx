import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { useInternalFormContext } from './form'
import { type StepTree } from './types'

type StepContextValue = {
  step?: number
  registrationKey: number
  registerField: (elements: StepTree) => void
  registerStep: (elements: StepTree, stepRef: React.RefObject<number | undefined>, step?: number) => void
  rebuildSteps: () => void
  changeStepAtIndex: (steps: StepTree, index: number) => void
}

const StepContext = createContext<StepContextValue | null>(null)

function useStep(): StepContextValue | null {
  return useContext(StepContext)
}

function Step({ children }: { children: React.ReactNode }) {
  const stepContext = useStep()
  const formContext = useInternalFormContext()

  const {
    registerStep: registerStepFromParent,
    step: stepFromParent,
    rebuildSteps: rebuildStepsFromParent,
    changeStepAtIndex: changeStepAtIndexFromParent,
    registrationKey: registrationKeyFromParent,
  } = stepContext ?? formContext
  const stepRef = useRef<number | undefined>(undefined)
  const [steps, setSteps] = useState<StepTree>([])
  const [registrationKey, setRegistrationKey] = useState(0)

  const changeStepAtIndex = useCallback((steps: StepTree, index: number): void => {
    setSteps((prevSteps) => {
      const newSteps = [...prevSteps]
      newSteps[index] = steps
      return newSteps
    })
  }, [])

  useEffect(() => {
    if (steps.length > 0) {
      if (stepRef.current !== undefined) {
        changeStepAtIndexFromParent(steps, stepRef.current)
      } else {
        registerStepFromParent(steps, stepRef)
      }
    }
  }, [registrationKeyFromParent, steps])

  useEffect(() => {
    if (stepFromParent !== undefined) {
      rebuildStepsFromParent()
    }
    return () => {
      rebuildStepsFromParent()
    }
  }, [])

  const registerField = useCallback(
    (elements: StepTree): void => {
      setSteps((prevSteps) => {
        return [...prevSteps, ...elements]
      })
    },
    [steps],
  )

  const registerStep = useCallback(
    (elements: StepTree, stepRef: React.RefObject<number | undefined>, step?: number): void => {
      setSteps((prevSteps: StepTree) => {
        const stepNumber = step ?? prevSteps.length
        stepRef.current = stepNumber
        const newSteps = [...prevSteps]
        newSteps.splice(stepNumber, 0, elements)
        return newSteps
      })
    },
    [steps],
  )

  const rebuildSteps = useCallback(() => {
    setSteps([])
    setRegistrationKey((prev) => prev + 1)
  }, [])

  const contextValue = useMemo<StepContextValue>(
    () => ({
      // eslint-disable-next-line react-hooks/refs
      step: stepRef.current,
      registrationKey,
      changeStepAtIndex,
      registerField,
      registerStep,
      rebuildSteps,
    }),
    [registrationKey, changeStepAtIndex, registerField, registerStep, rebuildSteps],
  )

  // eslint-disable-next-line react-hooks/refs
  return <StepContext.Provider value={contextValue}>{children}</StepContext.Provider>
}

Step.displayName = 'Step'

export { Step, useStep }
export type { StepContextValue }
