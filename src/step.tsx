import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { useInternalStepperContext } from './step-container'

type StepContextValue = {
  step?: number
  registrationKey: number
  registerField: (elements: string) => void
  registerStep: (elements: string[], stepRef: React.RefObject<number | undefined>, step?: number) => void
  rebuildSteps: () => void
  changeStepAtIndex: (elements: string[], index: number) => void
}

const StepContext = createContext<StepContextValue | null>(null)

function useStep(): StepContextValue | null {
  return useContext(StepContext)
}

function Step({ children }: { children: React.ReactNode }) {
  const formContext = useInternalStepperContext()

  const {
    registerStep: registerStepFromParent,
    step: stepFromParent,
    rebuildSteps: rebuildStepsFromParent,
    changeStepAtIndex: changeStepAtIndexFromParent,
    registrationKey: registrationKeyFromParent,
  } = formContext


  const stepRef = useRef<number | undefined>(undefined)
  const [steps, setSteps] = useState<string[]>([])

  const [registrationKey, setRegistrationKey] = useState(0)

  const changeStepAtIndex = useCallback((elements: string[], _index: number): void => {
    setSteps(elements)
  }, [])

  useEffect(() => {
    const stepList = steps.length ? steps : ['']
    if (stepRef.current !== undefined) {
      changeStepAtIndexFromParent(stepList, stepRef.current)
    } else {
      registerStepFromParent(stepList, stepRef)
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
    (element: string): void => {
      setSteps((prevSteps) => {
        return [...prevSteps, element]
      })
    },
    [steps],
  )

  const registerStep = useCallback(
    (elements: string[], stepRef: React.RefObject<number | undefined>, step?: number): void => {
      setSteps((prevSteps) => {
        const stepNumber = step ?? prevSteps.length
        stepRef.current = stepNumber
        const newSteps = [...prevSteps]
        newSteps.splice(stepNumber, 0, ...elements)
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
