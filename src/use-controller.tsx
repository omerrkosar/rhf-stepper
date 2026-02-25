import { useEffect } from "react";
import {
  type Control,
  type FieldPath,
  type FieldValues,
  type UseControllerProps,
  type UseControllerReturn,
  useController as useRHFController,
} from "react-hook-form";

import { useStep } from "./step";

function useController<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  props: UseControllerProps<TFieldValues, TName>,
): UseControllerReturn<TFieldValues, TName> {
  const stepContext = useStep();

  useEffect(() => {
    if (stepContext) {
      stepContext.registerField(props.name);
    }
  }, [stepContext?.registrationKey]);

  useEffect(() => {
    if (stepContext?.step !== undefined) {
      stepContext?.rebuildSteps();
    }
    return () => {
      stepContext?.rebuildSteps();
    };
  }, []);

  return useRHFController({ ...props });
}

export { useController };
