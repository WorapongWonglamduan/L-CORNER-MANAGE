# Input Component Usage Pattern

## Overview
All input fields in this project MUST use the `Input` component from `@/components/ui/Input`. This ensures consistency, proper error handling, and standardized styling across the application.

## Core Principle
**DO NOT create custom input elements.** Always use the `Input` component with the appropriate `inputType` prop.

## Available Input Types
The `Input` component supports all standard HTML input types through the `INPUT_TYPES` constant:

```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";
```

Available types:
- `INPUT_TYPES.TEXT` - Standard text input
- `INPUT_TYPES.EMAIL` - Email input
- `INPUT_TYPES.PASSWORD` - Password input
- `INPUT_TYPES.NUMBER` - Number input
- `INPUT_TYPES.TEL` - Telephone input
- `INPUT_TYPES.URL` - URL input
- `INPUT_TYPES.DATE` - Date picker
- `INPUT_TYPES.TIME` - Time picker
- `INPUT_TYPES.DATETIME_LOCAL` - DateTime picker
- `INPUT_TYPES.FILE` - File upload
- `INPUT_TYPES.SEARCH` - Search input
- `INPUT_TYPES.COLOR` - Color picker
- `INPUT_TYPES.TEXTAREA` - Multi-line text area
- `INPUT_TYPES.SELECT` - Dropdown select
- `INPUT_TYPES.CHECKBOX` - Checkbox
- `INPUT_TYPES.DATE_RANGE` - Date range picker (start and end date)

## Standard Usage Examples

### Text Input with Icon
```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import { User } from "lucide-react";

<Input
  inputType={INPUT_TYPES.TEXT}
  icon={User}
  value={name}
  onChange={(e) => setName((e.target as HTMLInputElement).value)}
  placeholder="Enter name"
/>
```

### Date Input
```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import { Calendar } from "lucide-react";

<Input
  inputType={INPUT_TYPES.DATE}
  icon={Calendar}
  value={date}
  onChange={(e) => setDate((e.target as HTMLInputElement).value)}
  placeholder="Select date"
/>
```

### Number Input
```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";

<Input
  inputType={INPUT_TYPES.NUMBER}
  value={quantity}
  onChange={(e) => setQuantity((e.target as HTMLInputElement).value)}
  placeholder="Enter quantity"
  min="0"
/>
```

### Select Dropdown
```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";

<Input
  inputType={INPUT_TYPES.SELECT}
  value={category}
  onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}
  options={[
    { value: "1", label: "Category 1" },
    { value: "2", label: "Category 2" },
  ]}
/>
```

### Textarea
```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";

<Input
  inputType={INPUT_TYPES.TEXTAREA}
  value={description}
  onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
  placeholder="Enter description"
/>
```

### Checkbox
```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";

<Input
  inputType={INPUT_TYPES.CHECKBOX}
  checked={isActive}
  onCheckedChange={setIsActive}
  id="active-checkbox"
/>
```

### Date Range Picker
```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";

<Input
  inputType={INPUT_TYPES.DATE_RANGE}
  dateRangeValue={{ startDate, endDate }}
  onDateRangeChange={({ startDate: newStart, endDate: newEnd }) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  }}
  startPlaceholder="วันที่เริ่มต้น"
  endPlaceholder="วันที่สิ้นสุด"
/>
```

## Component Architecture Pattern

### Input Component as Orchestrator
The `Input` component acts as the main orchestrator for all input types. For complex input types like `DATE_RANGE`, it delegates to specialized components while maintaining a consistent API.

### Creating Specialized Input Components

When creating specialized input components (like `DateRangePicker`), follow this pattern:

**1. Create the specialized component WITHOUT importing Input component** (to avoid circular dependencies):

```typescript
"use client";

import { Calendar, X } from "lucide-react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  baseInputClass?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = "วันที่เริ่มต้น",
  endPlaceholder = "วันที่สิ้นสุด",
  baseInputClass = "",
}: DateRangePickerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Implementation using raw HTML inputs with styling */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
          <Calendar className="w-5 h-5" />
        </div>
        <input
          type="date"
          className={baseInputClass}
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
        {/* Clear button */}
      </div>
      {/* End date similar structure */}
    </div>
  );
}
```

**2. Import and use the specialized component in Input component**:

```typescript
// In Input.tsx
import { DateRangePicker } from "./date-range-picker";

// In renderInput() switch statement:
case INPUT_TYPES.DATE_RANGE:
  const { dateRangeValue, onDateRangeChange, startPlaceholder, endPlaceholder } = props;
  
  return (
    <DateRangePicker
      startDate={dateRangeValue.startDate}
      endDate={dateRangeValue.endDate}
      onStartDateChange={(date) => onDateRangeChange?.({ ...dateRangeValue, startDate: date })}
      onEndDateChange={(date) => onDateRangeChange?.({ ...dateRangeValue, endDate: date })}
      startPlaceholder={startPlaceholder}
      endPlaceholder={endPlaceholder}
      baseInputClass={baseInputClass}
    />
  );
```

### Key Principles

1. **Avoid Circular Dependencies**: Specialized components should NOT import `Input` component
2. **Accept baseInputClass**: Specialized components should accept `baseInputClass` prop for consistent styling
3. **Single Responsibility**: Each specialized component handles one complex input type
4. **Input as Gateway**: All usage goes through `Input` component with `inputType` prop
5. **Reusability**: Specialized components can be used directly if needed, but prefer using through `Input` component

## Form Integration with React Hook Form

```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import { useForm } from "react-hook-form";

const { register, formState: { errors } } = useForm();

<Input
  inputType={INPUT_TYPES.TEXT}
  label="Product Name"
  error={errors.name}
  required
  {...register("name", { required: "Name is required" })}
/>
```

## Props Reference

### Common Props
- `inputType`: Type of input (use `INPUT_TYPES` constant)
- `label`: Label text displayed above the input
- `error`: Error message or FieldError object from react-hook-form
- `helperText`: Helper text displayed below the input
- `icon`: Lucide icon component to display on the left
- `containerClassName`: Additional classes for the container div
- `className`: Additional classes for the input element
- `required`: Shows a red asterisk next to the label
- `placeholder`: Placeholder text

### Type-Specific Props
- **SELECT**: `options` - Array of `{ value, label }` objects
- **CHECKBOX**: `checked`, `onCheckedChange`
- **DATE**: `min`, `max` - Date constraints
- **NUMBER**: `min`, `max`, `step` - Number constraints
- **DATE_RANGE**: `dateRangeValue` - Object with `{ startDate, endDate }`, `onDateRangeChange` - Callback function, `startPlaceholder`, `endPlaceholder`

## Migration Checklist

When refactoring existing code:
1. ✅ Replace all `<input>` elements with `<Input inputType={INPUT_TYPES.TEXT}>`
2. ✅ Replace all `<textarea>` elements with `<Input inputType={INPUT_TYPES.TEXTAREA}>`
3. ✅ Replace all `<select>` elements with `<Input inputType={INPUT_TYPES.SELECT}>`
4. ✅ Replace date inputs with `<Input inputType={INPUT_TYPES.DATE}>`
5. ✅ Replace `DateRangePicker` component with `<Input inputType={INPUT_TYPES.DATE_RANGE}>`
6. ✅ Add appropriate icons using the `icon` prop
7. ✅ Ensure proper type casting in onChange handlers
8. ✅ Use `INPUT_TYPES` constant instead of string literals

## Anti-Patterns (DO NOT DO)

❌ **Creating raw HTML inputs:**
```typescript
// WRONG
<input type="text" value={name} onChange={...} />
```

✅ **Use Input component:**
```typescript
// CORRECT
<Input inputType={INPUT_TYPES.TEXT} value={name} onChange={...} />
```

❌ **Creating custom styled inputs:**
```typescript
// WRONG
<input className="custom-input-class" type="date" />
```

✅ **Use Input component with className:**
```typescript
// CORRECT
<Input inputType={INPUT_TYPES.DATE} className="custom-input-class" />
```

❌ **Hardcoding input type strings:**
```typescript
// WRONG
<Input inputType="text" />
```

✅ **Use INPUT_TYPES constant:**
```typescript
// CORRECT
<Input inputType={INPUT_TYPES.TEXT} />
```

## Benefits

1. **Consistency**: All inputs look and behave the same
2. **Error Handling**: Built-in error display with react-hook-form integration
3. **Icons**: Easy icon integration with Lucide icons
4. **Accessibility**: Proper label and error associations
5. **Maintainability**: Single source of truth for input styling
6. **Type Safety**: TypeScript support for all input types

## Summary

**Always use the `Input` component for any form input needs. Never create raw HTML input elements.**
