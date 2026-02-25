import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useInternalStepperContext } from "./stepper";
import { generateGUID } from "./helper";

type StepContextValue = {
  step?: string;
  registrationKey: number;
  registerField: (elements: string) => void;
  rebuildSteps: () => void;
};

const StepContext = createContext<StepContextValue | null>(null);

function useStep(): StepContextValue | null {
  return useContext(StepContext);
}

function Step({ children }: { children: React.ReactNode }) {
  const formContext = useInternalStepperContext();

  const {
    registerStep: registerStepFromParent,
    step: stepFromParent,
    rebuildSteps: rebuildStepsFromParent,
    registerStepOrder,
    changeStepAtIndex: changeStepAtIndexFromParent,
    registrationKey: registrationKeyFromParent,
  } = formContext;

  const stepRef = useRef<string | undefined>(undefined);

  const [id] = useState(generateGUID());
  const [steps, setSteps] = useState<string[]>([]);

  const [registrationKey, setRegistrationKey] = useState(0);

  useEffect(() => {
    const stepList = steps.length ? steps : [""];
    registerStepFromParent(stepList, id);
    registerStepOrder(id);
  }, [steps]);

  useEffect(() => {
    if (registrationKeyFromParent) {
      registerStepOrder(id);
    }
  }, [registrationKeyFromParent]);

  useEffect(() => {
    if (stepFromParent !== undefined) {
      rebuildStepsFromParent();
    }
    return () => {
      rebuildStepsFromParent();
    };
  }, []);

  const registerField = useCallback(
    (element: string): void => {
      setSteps((prevSteps) => {
        return Array.from(new Set([...prevSteps, element]));
      });
    },
    [steps],
  );

  const rebuildSteps = useCallback(() => {
    stepRef.current = undefined;
    setSteps([]);
    setRegistrationKey((prev) => prev + 1);
  }, []);

  const contextValue = useMemo<StepContextValue>(
    () => ({
      // eslint-disable-next-line react-hooks/refs
      step: stepRef.current,
      registrationKey,
      registerField,
      rebuildSteps,
    }),
    [registrationKey, registerField, rebuildSteps],
  );

  // eslint-disable-next-line react-hooks/refs
  return (
    <StepContext.Provider value={contextValue}>{children}</StepContext.Provider>
  );
}

Step.displayName = "Step";

export { Step, useStep };
export type { StepContextValue };
