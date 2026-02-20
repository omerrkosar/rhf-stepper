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
import { useForm } from 'react-hook-form'
import { Form, Step, Controller, useFormContext } from 'rhf-stepper'

type FormValues = {
  name: string
  email: string
  address: string
  city: string
}

function MyMultiStepForm() {
  const form = useForm<FormValues>()

  return (
    <Form form={form} onSubmit={(data) => console.log(data)}>
      {({ currentStep }) => (
        <>
          <Step>
            {currentStep === 0 && (
              <>
                <Controller name="name" render={({ field }) => <input {...field} placeholder="Name" />} />
                <Controller name="email" render={({ field }) => <input {...field} placeholder="Email" />} />
              </>
            )}
          </Step>

          <Step>
            {currentStep === 1 && (
              <>
                <Controller name="address" render={({ field }) => <input {...field} placeholder="Address" />} />
                <Controller name="city" render={({ field }) => <input {...field} placeholder="City" />} />
              </>
            )}
          </Step>

          <StepNavigation />
        </>
      )}
    </Form>
  )
}

function StepNavigation() {
  const { next, prev, isFirstStep, isLastStep } = useFormContext()

  return (
    <div>
      {!isFirstStep && <button type="button" onClick={prev}>Back</button>}
      {!isLastStep && <button type="button" onClick={next}>Next</button>}
      {isLastStep && <button type="submit">Submit</button>}
    </div>
  )
}
```

> **Important:** `<Step>` components must always be mounted in the tree. Conditionally render the `<Controller>` fields inside each `<Step>` based on `currentStep` to show/hide step content.

## API Reference

### `<Form>`

The root component that replaces the standard `<form>` element. Manages step state and validation.

```tsx
<Form
  form={form}
  onSubmit={handleSubmit}
  stepValidationMode="forward"
>
  {children}
</Form>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `form` | `UseFormReturn<T>` | *required* | The form instance from `useForm()` |
| `onSubmit` | `(values: T) => void` | *required* | Called with form values on valid submission |
| `stepValidationMode` | `'forward' \| 'all' \| 'none'` | `'forward'` | When to validate step fields (see below) |
| `children` | `ReactNode \| (context) => ReactNode` | *required* | Form content. Accepts a render function for context access |
| `ref` | `Ref<HTMLFormElement>` | - | Ref forwarded to the underlying `<form>` element |

All other props are passed through to the underlying `<form>` element (e.g., `className`, `id`).

#### Step Validation Modes

| Mode | Description |
|------|-------------|
| `'forward'` | Validates current step fields only when navigating forward (via `next()` or `setCurrentStep` to a later step) |
| `'all'` | Validates current step fields on every navigation (forward and backward) |
| `'none'` | No automatic validation. Navigate freely between steps |

#### Render Function

When using a render function as children, you receive the full `FormContextValue`:

```tsx
<Form form={form} onSubmit={handleSubmit}>
  {({ currentStep, isFirstStep, isLastStep, next, prev }) => (
    // render steps based on currentStep
  )}
</Form>
```

---

### `<Step>`

Groups `<Controller>` fields into a logical step. Fields inside a `<Step>` are automatically registered and validated together. Each `<Step>` defines a step boundary -- conditionally render its children based on `currentStep` to control which step is visible.

> **Important:** `<Step>` components must always be mounted in the tree. Do not conditionally render the `<Step>` itself -- only its children.

```tsx
<Step>
  {currentStep === 0 && (
    <>
      <Controller name="firstName" render={({ field }) => <input {...field} />} />
      <Controller name="lastName" render={({ field }) => <input {...field} />} />
    </>
  )}
</Step>
```

Steps can be nested for sub-step grouping:

```tsx
<Step>
  <Step>
    {currentStep === 0 && (
      <Controller name="a" render={({ field }) => <input {...field} />} />
    )}
  </Step>
  <Step>
    {currentStep === 1 && (
      <Controller name="b" render={({ field }) => <input {...field} />} />
    )}
  </Step>
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

Same as [react-hook-form's Controller](https://react-hook-form.com/docs/usecontroller/controller). The `control` prop is optional -- it's automatically resolved from the `<Form>` context.

---

### `useFormContext()`

Hook to access the stepper state from any component inside `<Form>`.

```tsx
const {
  form,
  currentStep,
  setCurrentStep,
  currentStepNode,
  currentStepArr,
  validatedFields,
  isFirstStep,
  isLastStep,
  next,
  prev,
} = useFormContext<MyFormValues>()
```

#### Return Value (`FormContextValue<T>`)

| Property | Type | Description |
|----------|------|-------------|
| `form` | `UseFormReturn<T>` | The react-hook-form instance |
| `currentStep` | `number \| number[] \| null` | Current step index. `number[]` for nested steps |
| `setCurrentStep` | `(step: number \| number[]) => Promise<void>` | Navigate to a specific step. Validates before navigating (based on `stepValidationMode`) |
| `currentStepNode` | `StepTree \| undefined` | The current step's node in the step tree |
| `currentStepArr` | `string[] \| null` | Field names registered in the current step |
| `validatedFields` | `string[]` | Field names that have been validated via step navigation |
| `isFirstStep` | `boolean` | `true` if on the first step |
| `isLastStep` | `boolean` | `true` if on the last step |
| `next` | `() => void` | Navigate to the next step (validates current step first) |
| `prev` | `() => void` | Navigate to the previous step |

---

## Examples

### Basic Two-Step Form

```tsx
import { useForm } from 'react-hook-form'
import { Form, Step, Controller, useFormContext } from 'rhf-stepper'

type SignupForm = {
  email: string
  password: string
  firstName: string
  lastName: string
}

function SignupWizard() {
  const form = useForm<SignupForm>()

  return (
    <Form form={form} onSubmit={(data) => console.log(data)}>
      {({ currentStep }) => (
        <>
          <Step>
            {currentStep === 0 && (
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
            {currentStep === 1 && (
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
    </Form>
  )
}

function Navigation() {
  const { next, prev, isFirstStep, isLastStep } = useFormContext()

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
  const { currentStep, setCurrentStep } = useFormContext()

  return (
    <nav>
      <button type="button" onClick={() => setCurrentStep(0)}>Account</button>
      <button type="button" onClick={() => setCurrentStep(1)}>Profile</button>
      <button type="button" onClick={() => setCurrentStep(2)}>Review</button>
    </nav>
  )
}
```

### Skip Validation

```tsx
<Form form={form} onSubmit={handleSubmit} stepValidationMode="none">
  {/* Users can freely navigate between steps without validation */}
</Form>
```

### Accessing the Form Instance

`useFormContext` returns the full `react-hook-form` instance under the `form` property:

```tsx
function ResetButton() {
  const { form } = useFormContext<MyFormValues>()

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
  FormContextValue,
  FormProps,
  ControllerProps,
  ControllerRenderArgs,
  StepTree,
  StepValidationMode,
} from 'rhf-stepper'
```

| Type | Description |
|------|-------------|
| `FormContextValue<T>` | Return type of `useFormContext()` |
| `FormProps<T>` | Props for the `<Form>` component |
| `ControllerProps<T, N>` | Props for the `<Controller>` component |
| `ControllerRenderArgs<T, N>` | Arguments passed to the Controller `render` function |
| `StepTree` | Recursive type representing the step structure (`string \| StepTree[]`) |
| `StepValidationMode` | `'all' \| 'forward' \| 'none'` |

## License

MIT
