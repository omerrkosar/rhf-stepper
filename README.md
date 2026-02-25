# rhf-stepper

A lightweight, headless multi-step form helper for [react-hook-form](https://react-hook-form.com). Build wizards, multi-step forms, and stepped workflows with automatic per-step validation. Bring your own UI — rhf-stepper handles the logic.

[Documentation](https://rhf-stepper-docs.vercel.app/docs)

## Installation

```bash
npm install rhf-stepper
# or
pnpm add rhf-stepper
# or
yarn add rhf-stepper
```

### Peer Dependencies

```json
{
  "react": ">=17.0.0",
  "react-hook-form": ">=7.0.0"
}
```

## Quick Start

```tsx
import { useForm, FormProvider } from 'react-hook-form'
import { Stepper, Step, Controller, useStepper } from 'rhf-stepper'

type FormValues = {
  name: string
  email: string
  address: string
  city: string
}

function MyMultiStepForm() {
  const form = useForm<FormValues>()

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit((data) => console.log(data))}>
        <Stepper>
          {({ activeStep }) => (
            <>
              <Step>
                {activeStep === 0 && (
                  <>
                    <Controller name="name" render={({ field }) => <input {...field} placeholder="Name" />} />
                    <Controller name="email" render={({ field }) => <input {...field} placeholder="Email" />} />
                  </>
                )}
              </Step>

              <Step>
                {activeStep === 1 && (
                  <>
                    <Controller name="address" render={({ field }) => <input {...field} placeholder="Address" />} />
                    <Controller name="city" render={({ field }) => <input {...field} placeholder="City" />} />
                  </>
                )}
              </Step>

              <StepNavigation />
            </>
          )}
        </Stepper>
      </form>
    </FormProvider>
  )
}

function StepNavigation() {
  const { next, prev, isFirstStep, isLastStep } = useStepper()

  return (
    <div>
      {!isFirstStep && <button type="button" onClick={prev}>Back</button>}
      {!isLastStep && <button type="button" onClick={next}>Next</button>}
      {isLastStep && <button type="submit">Submit</button>}
    </div>
  )
}
```

> **Important:** Do not conditionally render `<Step>` based on `activeStep`. This would break step counting and cause `isLastStep`, `next()`, and other navigation to behave incorrectly. Always keep steps mounted and conditionally render only the children inside each step.

## API Reference

### `<Stepper>`

The root component that manages step state and validation. Does **not** render a `<form>` element — you provide your own `<form>` and wrap with react-hook-form's `<FormProvider>`.

```tsx
<FormProvider {...form}>
  <form onSubmit={form.handleSubmit(handleSubmit)}>
    <Stepper stepValidationMode="forward">
      {children}
    </Stepper>
  </form>
</FormProvider>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `form` | `UseFormReturn<T>` | - | The form instance from `useForm()`. Optional if wrapped in `<FormProvider>` |
| `stepValidationMode` | `'forward' \| 'all' \| 'none'` | `'forward'` | When to validate step fields (see below) |
| `children` | `ReactNode \| (context) => ReactNode` | *required* | Form content. Accepts a render function for context access |

#### Step Validation Modes

| Mode | Description |
|------|-------------|
| `'forward'` | Validates current step fields only when navigating forward (via `next()` or `jumpTo` to a later step) |
| `'all'` | Validates current step fields on every navigation (forward and backward) |
| `'none'` | No automatic validation. Navigate freely between steps |

#### Render Function

When using a render function as children, you receive the full `StepperContextValue`:

```tsx
<Stepper>
  {({ activeStep, isFirstStep, isLastStep, next, prev }) => (
    // render steps based on activeStep
  )}
</Stepper>
```

---

### `<Step>`

Groups `<Controller>` fields into a logical step. Fields inside a `<Step>` are automatically registered and validated together. Each `<Step>` defines a step boundary — conditionally render its children based on `activeStep` to control which step is visible.

> **Important:** Do not conditionally render `<Step>` based on `activeStep`. This would break step counting and cause `isLastStep`, `next()`, and other navigation to behave incorrectly. Always keep steps mounted and conditionally render only the children inside each step. Steps **can** be conditionally rendered based on form values for dynamic forms (see [Dynamic Steps](#dynamic-steps)).

```tsx
<Step>
  {activeStep === 0 && (
    <>
      <Controller name="firstName" render={({ field }) => <input {...field} />} />
      <Controller name="lastName" render={({ field }) => <input {...field} />} />
    </>
  )}
</Step>
```

---

### `<Controller>`

A drop-in replacement for react-hook-form's `Controller`. It automatically registers the field with the nearest `<Step>` for step-aware validation.

```tsx
<Controller
  name="email"
  rules={{ required: 'Email is required' }}
  render={({ field, fieldState }) => (
    <div>
      <input {...field} />
      {fieldState.error && <span>{fieldState.error.message}</span>}
    </div>
  )}
/>
```

#### Props

Same as [react-hook-form's Controller](https://react-hook-form.com/docs/usecontroller/controller). The `control` prop is optional — it's automatically resolved from `<FormProvider>`.

---

### `useController()`

A hook alternative to `<Controller>`. Drop-in replacement for react-hook-form's `useController` that automatically registers the field with the nearest `<Step>`.

```tsx
import { useController } from 'rhf-stepper'

function CustomInput({ name }: { name: string }) {
  const { field, fieldState } = useController({ name, rules: { required: 'Required' } })

  return (
    <div>
      <input {...field} />
      {fieldState.error && <span>{fieldState.error.message}</span>}
    </div>
  )
}
```

#### Props

Same as [react-hook-form's useController](https://react-hook-form.com/docs/usecontroller).

---

### `useStepper()`

Hook to access the stepper state from any component inside `<Stepper>`.

```tsx
const {
  activeStep,
  jumpTo,
  fields,
  validSteps,
  isFirstStep,
  isLastStep,
  next,
  prev,
} = useStepper<MyFormValues>()
```

#### Return Value (`StepperContextValue<T>`)

| Property | Type | Description |
|----------|------|-------------|
| `activeStep` | `number` | Current step index (0-based) |
| `jumpTo` | `(step: number, onLeave?) => Promise<boolean>` | Navigate to a specific step. Validates before navigating (based on `stepValidationMode`). Returns `true` if navigation succeeded |
| `fields` | `string[] \| null` | Field names registered in the current step |
| `validSteps` | `number[]` | Step indices that have passed validation |
| `isFirstStep` | `boolean` | `true` if on the first step |
| `isLastStep` | `boolean` | `true` if on the last step |
| `next` | `(onLeave?) => Promise<boolean>` | Navigate to the next step. Validates current step first. Returns `true` if navigation succeeded |
| `prev` | `(onLeave?) => Promise<boolean>` | Navigate to the previous step. Returns `true` if navigation succeeded |

#### `onLeave` Callback

`next`, `prev`, and `jumpTo` accept an optional `onLeave` callback that runs **after validation passes but before the step changes**. Use it for side effects like fetching data or auto-filling fields:

```tsx
await next(async (values) => {
  // values contains only the current step's fields
  const res = await fetch(`/api/lookup?zip=${values.zipCode}`)
  const data = await res.json()
  form.setValue('city', data.city)
})
```

---

## Examples

### Basic Two-Step Form

```tsx
import { useForm, FormProvider } from 'react-hook-form'
import { Stepper, Step, Controller, useStepper } from 'rhf-stepper'

type SignupForm = {
  email: string
  password: string
  firstName: string
  lastName: string
}

function SignupWizard() {
  const form = useForm<SignupForm>()

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit((data) => console.log(data))}>
        <Stepper>
          {({ activeStep }) => (
            <>
              <Step>
                {activeStep === 0 && (
                  <>
                    <Controller
                      name="email"
                      rules={{ required: 'Email is required' }}
                      render={({ field, fieldState }) => (
                        <div>
                          <input {...field} type="email" placeholder="Email" />
                          {fieldState.error && <p>{fieldState.error.message}</p>}
                        </div>
                      )}
                    />
                    <Controller
                      name="password"
                      rules={{ required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } }}
                      render={({ field, fieldState }) => (
                        <div>
                          <input {...field} type="password" placeholder="Password" />
                          {fieldState.error && <p>{fieldState.error.message}</p>}
                        </div>
                      )}
                    />
                  </>
                )}
              </Step>

              <Step>
                {activeStep === 1 && (
                  <>
                    <Controller
                      name="firstName"
                      rules={{ required: 'First name is required' }}
                      render={({ field }) => <input {...field} placeholder="First Name" />}
                    />
                    <Controller
                      name="lastName"
                      rules={{ required: 'Last name is required' }}
                      render={({ field }) => <input {...field} placeholder="Last Name" />}
                    />
                  </>
                )}
              </Step>

              <Navigation />
            </>
          )}
        </Stepper>
      </form>
    </FormProvider>
  )
}

function Navigation() {
  const { next, prev, isFirstStep, isLastStep } = useStepper()

  return (
    <div>
      {!isFirstStep && <button type="button" onClick={prev}>Back</button>}
      {!isLastStep && <button type="button" onClick={next}>Next</button>}
      {isLastStep && <button type="submit">Submit</button>}
    </div>
  )
}
```

### Jump to a Specific Step

```tsx
function StepIndicator() {
  const { activeStep, jumpTo } = useStepper()

  return (
    <nav>
      <button type="button" onClick={() => jumpTo(0)}>Account</button>
      <button type="button" onClick={() => jumpTo(1)}>Profile</button>
      <button type="button" onClick={() => jumpTo(2)}>Review</button>
    </nav>
  )
}
```

### Skip Validation

```tsx
<Stepper stepValidationMode="none">
  {/* Users can freely navigate between steps without validation */}
</Stepper>
```

### Dynamic Steps

`<Step>` components can be conditionally rendered based on **form values** (not `activeStep`) for dynamic forms:

```tsx
const needsShipping = useWatch({ control: form.control, name: 'needsShipping' })

<Stepper>
  {({ activeStep }) => (
    <>
      <Step>{activeStep === 0 && <AccountFields />}</Step>

      {needsShipping && (
        <Step>{activeStep === 1 && <ShippingFields />}</Step>
      )}

      <Step>
        {activeStep === (needsShipping ? 2 : 1) && <PaymentFields />}
      </Step>
    </>
  )}
</Stepper>
```

### Accessing the Form Instance

Since `useStepper` only returns stepper state, use react-hook-form's `useFormContext` to access the form instance:

```tsx
import { useFormContext } from 'react-hook-form'

function ResetButton() {
  const form = useFormContext<MyFormValues>()

  return (
    <button type="button" onClick={() => form.reset()}>
      Reset
    </button>
  )
}
```

## Types

```ts
import type {
  StepperContextValue,
  StepperProps,
  ControllerProps,
  ControllerRenderArgs,
  StepValidationMode,
} from 'rhf-stepper'
```

| Type | Description |
|------|-------------|
| `StepperContextValue<T>` | Return type of `useStepper()` |
| `StepperProps<T>` | Props for the `<Stepper>` component |
| `ControllerProps<T, N>` | Props for the `<Controller>` component |
| `ControllerRenderArgs<T, N>` | Arguments passed to the Controller `render` function |
| `StepValidationMode` | `'all' \| 'forward' \| 'none'` |

## License

MIT
