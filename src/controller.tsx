import { ComponentProps, useEffect } from 'react'
import {
  type Control,
  Controller as RHFController,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type UseFormStateReturn,
} from 'react-hook-form'

import { useFormContext } from './form'
import { useStep } from './step'

type ControllerRenderArgs<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  field: ControllerRenderProps<TFieldValues, TName>
  fieldState: ControllerFieldState
  formState: UseFormStateReturn<TFieldValues>
}

type ControllerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = ComponentProps<typeof RHFController<TFieldValues, TName>>

function Controller<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ name, control, ...rest }: ControllerProps<TFieldValues, TName>) {
  const formContext = useFormContext<TFieldValues>()
  const stepContext = useStep()
  const resolvedControl = control ?? (formContext.form.control as unknown as Control<TFieldValues>)

  useEffect(() => {
    if (stepContext) {
      stepContext.registerField([name as string])
    }
  }, [stepContext?.registrationKey])

  useEffect(() => {
    if (stepContext?.step !== undefined) {
      stepContext?.rebuildSteps()
    }
    return () => {
      stepContext?.rebuildSteps()
    }
  }, [])

  return <RHFController name={name} control={resolvedControl} {...rest} />
}

Controller.displayName = 'Controller'

export { Controller }
export type { ControllerProps, ControllerRenderArgs }
