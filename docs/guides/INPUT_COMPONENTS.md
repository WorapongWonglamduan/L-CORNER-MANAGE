# Input Component Pattern

> Merged from the former `INPUT_COMPONENT_PATTERN.md` (usage) and `SPECIALIZED_INPUT_COMPONENTS.md` (extension) — the two overlapped heavily (same `DateRangePicker` example duplicated in both). This file keeps that example once, in Part 2.

This doc has two audiences:
- **Part 1 — Using `Input`**: for anyone adding a form field to a page.
- **Part 2 — Extending `Input`**: for anyone adding a brand-new input type (e.g. a new picker/widget).

---

## Part 1: Using the Input Component

### Core Principle
**DO NOT create custom input elements.** Always use the `Input` component (`@/components/ui/Input`) with the appropriate `inputType` prop. This ensures consistency, proper error handling, and standardized styling across the application.

### Available Input Types

```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";
```

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
- `INPUT_TYPES.DATE_RANGE` - Date range picker (start and end date, see Part 2 for its implementation)

### Standard Usage Examples

```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import { User, Calendar } from "lucide-react";

// Text with icon
<Input
  inputType={INPUT_TYPES.TEXT}
  icon={User}
  value={name}
  onChange={(e) => setName((e.target as HTMLInputElement).value)}
  placeholder="Enter name"
/>

// Date
<Input
  inputType={INPUT_TYPES.DATE}
  icon={Calendar}
  value={date}
  onChange={(e) => setDate((e.target as HTMLInputElement).value)}
/>

// Number
<Input
  inputType={INPUT_TYPES.NUMBER}
  value={quantity}
  onChange={(e) => setQuantity((e.target as HTMLInputElement).value)}
  min="0"
/>

// Select
<Input
  inputType={INPUT_TYPES.SELECT}
  value={category}
  onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}
  options={[{ value: "1", label: "Category 1" }]}
/>

// Textarea
<Input
  inputType={INPUT_TYPES.TEXTAREA}
  value={description}
  onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
/>

// Checkbox
<Input
  inputType={INPUT_TYPES.CHECKBOX}
  checked={isActive}
  onCheckedChange={setIsActive}
  id="active-checkbox"
/>

// Date range
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

### Form Integration with React Hook Form

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

### Props Reference

**Common:** `inputType`, `label`, `error` (message or react-hook-form `FieldError`), `helperText`, `icon` (Lucide component), `containerClassName`, `className`, `required`, `placeholder`.

**Type-specific:**
- **SELECT**: `options` — Array of `{ value, label }`
- **CHECKBOX**: `checked`, `onCheckedChange`
- **DATE**: `min`, `max`
- **NUMBER**: `min`, `max`, `step`
- **DATE_RANGE**: `dateRangeValue` (`{ startDate, endDate }`), `onDateRangeChange`, `startPlaceholder`, `endPlaceholder`

### Migration Checklist (refactoring existing code)

1. Replace all `<input>` with `<Input inputType={INPUT_TYPES.TEXT}>`
2. Replace all `<textarea>` with `<Input inputType={INPUT_TYPES.TEXTAREA}>`
3. Replace all `<select>` with `<Input inputType={INPUT_TYPES.SELECT}>`
4. Replace date inputs with `<Input inputType={INPUT_TYPES.DATE}>`
5. Replace any standalone `DateRangePicker` usage with `<Input inputType={INPUT_TYPES.DATE_RANGE}>`
6. Add icons via the `icon` prop
7. Ensure proper type casting in `onChange` handlers
8. Use the `INPUT_TYPES` constant instead of string literals

### Anti-Patterns

```typescript
// ❌ WRONG — raw HTML input
<input type="text" value={name} onChange={...} />

// ✅ CORRECT
<Input inputType={INPUT_TYPES.TEXT} value={name} onChange={...} />

// ❌ WRONG — hardcoded type string
<Input inputType="text" />

// ✅ CORRECT
<Input inputType={INPUT_TYPES.TEXT} />
```

Never bypass `Input` and import a specialized component (e.g. `DateRangePicker`) directly in application code — always go through `Input` with `inputType`.

### Benefits
Consistency across the app, built-in error handling with react-hook-form, easy icon integration, accessible label/error associations, single source of truth for input styling, full TypeScript support.

---

## Part 2: Extending the Input Component

### Architecture Principle

`Input` (`@/components/ui/Input`) is the central orchestrator for all input types. For complex input types (date ranges, multi-select, file-upload-with-preview, etc.), create a separate **specialized component** that:
- Handles the specific input logic
- Is imported and used *by* `Input`
- Does **NOT** import `Input` itself (to avoid circular dependencies)

### When to Create a Specialized Component

Create one when:
- The input requires multiple HTML elements (e.g. date range = 2 inputs)
- The input has complex internal state or logic
- The input needs custom UI elements (clear buttons, preview, etc.)
- The input type is used in multiple places

Don't create one when a simple HTML input type suffices, or the logic is trivial enough for the parent component.

### Step 1: Create the Specialized Component

Create a new file in `src/components/ui/`.

**Requirements:**
- Do NOT import `Input`
- Accept a `baseInputClass` prop for consistent styling
- Use raw HTML inputs (`<input>`, `<select>`, `<textarea>`) styled via `baseInputClass`
- Handle all internal logic (icons, clear buttons, validation display)
- Export a clear, well-typed props interface

**Worked example — `DateRangePicker`** (`src/components/ui/date-range-picker.tsx`):

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
  className?: string;
  baseInputClass?: string; // REQUIRED: for consistent styling
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = "วันที่เริ่มต้น",
  endPlaceholder = "วันที่สิ้นสุด",
  className = "",
  baseInputClass = "",
}: DateRangePickerProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
          <Calendar className="w-5 h-5" />
        </div>
        <input
          type="date"
          className={baseInputClass}
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          placeholder={startPlaceholder}
        />
        {startDate && (
          <button
            onClick={() => onStartDateChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
          <Calendar className="w-5 h-5" />
        </div>
        <input
          type="date"
          className={baseInputClass}
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          placeholder={endPlaceholder}
          min={startDate || undefined}
        />
        {endDate && (
          <button
            onClick={() => onEndDateChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```

### Step 2: Add the Input Type Constant

`src/constants/input-types.ts`:

```typescript
export enum INPUT_TYPES {
  // ... existing types
  DATE_RANGE = "date-range",
}
```

### Step 3: Integrate with `Input`

In `src/components/ui/Input.tsx`:

```typescript
// Import
import { DateRangePicker } from "./date-range-picker";

// Value type
export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

// Extend BaseInputProps
export interface BaseInputProps {
  // ... existing props
  dateRangeValue?: DateRangeValue;
  onDateRangeChange?: (value: DateRangeValue) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
}

// In renderInput()'s switch statement:
case INPUT_TYPES.DATE_RANGE:
  const {
    dateRangeValue = { startDate: "", endDate: "" },
    onDateRangeChange,
    startPlaceholder = "วันที่เริ่มต้น",
    endPlaceholder = "วันที่สิ้นสุด",
  } = props as BaseInputProps;

  return (
    <DateRangePicker
      startDate={dateRangeValue.startDate}
      endDate={dateRangeValue.endDate}
      onStartDateChange={(date) =>
        onDateRangeChange?.({ ...dateRangeValue, startDate: date })
      }
      onEndDateChange={(date) =>
        onDateRangeChange?.({ ...dateRangeValue, endDate: date })
      }
      startPlaceholder={startPlaceholder}
      endPlaceholder={endPlaceholder}
      baseInputClass={baseInputClass}
    />
  );
```

Also make sure the generic icon-rendering block excludes this type where it doesn't apply:

```typescript
{Icon && inputType !== "textarea" && inputType !== INPUT_TYPES.DATE_RANGE && (
  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
    <Icon className="w-5 h-5" />
  </div>
)}
```

### Step 4: Update This Document
Add a usage example to Part 1's "Standard Usage Examples" section above.

### Checklist for New Specialized Components

- [ ] Component file created in `src/components/ui/`
- [ ] Component does NOT import `Input`
- [ ] Component accepts `baseInputClass`
- [ ] Component uses raw HTML inputs with `baseInputClass`
- [ ] Input type added to `INPUT_TYPES` enum
- [ ] Value interface (if needed) added to `Input.tsx`
- [ ] `BaseInputProps` updated
- [ ] Component imported in `Input.tsx`
- [ ] Case added in `renderInput()` switch
- [ ] Icon rendering logic updated if needed
- [ ] Usage example added to Part 1
- [ ] Integration tested

### Anti-Patterns

```typescript
// ❌ WRONG — creates a circular dependency
import { Input, INPUT_TYPES } from "./Input";
export function DateRangePicker() {
  return <Input inputType={INPUT_TYPES.DATE} />;
}

// ✅ CORRECT — raw HTML input with baseInputClass
export function DateRangePicker({ baseInputClass }) {
  return <input type="date" className={baseInputClass} />;
}
```

```typescript
// ❌ WRONG — bypassing Input in application code
import { DateRangePicker } from "@/components/ui/date-range-picker";
<DateRangePicker startDate={...} endDate={...} />

// ✅ CORRECT — go through Input
import { Input, INPUT_TYPES } from "@/components/ui/Input";
<Input inputType={INPUT_TYPES.DATE_RANGE} dateRangeValue={...} />
```

### Why This Pattern

1. No circular dependencies between `Input` and specialized components
2. One consistent API for every input type used in application code
3. Complex logic stays isolated and testable in its own component
4. `baseInputClass` keeps styling consistent across all input types
5. Codebase stays maintainable as more specialized types are added
