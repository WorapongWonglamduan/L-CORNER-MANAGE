# Specialized Input Components Pattern

## Overview
This document defines the architectural pattern for creating specialized input components that integrate with the main `Input` component.

## Architecture Principles

### 1. Input Component as Orchestrator
The `Input` component (`@/components/ui/Input`) serves as the central orchestrator for all input types. It provides:
- Consistent API across all input types
- Unified error handling
- Standardized styling
- Label and helper text management

### 2. Specialized Components for Complex Inputs
For complex input types (like date ranges, multi-select, file uploads with preview, etc.), create separate specialized components that:
- Handle the specific input logic
- Are imported and used by the `Input` component
- Do NOT import the `Input` component (to avoid circular dependencies)

## Implementation Pattern

### Step 1: Create Specialized Component

Create a new file in `src/components/ui/` for your specialized component.

**Key Requirements:**
- ✅ DO NOT import `Input` component
- ✅ Accept `baseInputClass` prop for consistent styling
- ✅ Use raw HTML inputs (`<input>`, `<select>`, `<textarea>`) with the `baseInputClass`
- ✅ Handle all internal logic (icons, clear buttons, validation display)
- ✅ Export a clear interface with well-defined props

**Example: DateRangePicker Component**

```typescript
// src/components/ui/date-range-picker.tsx
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
  baseInputClass?: string; // REQUIRED: For consistent styling
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
      {/* Start Date */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
          <Calendar className="w-5 h-5" />
        </div>
        <input
          type="date"
          className={baseInputClass} // Use provided styling
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          placeholder={startPlaceholder}
        />
        {startDate && (
          <button
            onClick={() => onStartDateChange("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-20"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* End Date */}
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
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-20"
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

### Step 2: Add Input Type Constant

Add the new input type to `src/constants/input-types.ts`:

```typescript
export enum INPUT_TYPES {
  // ... existing types
  DATE_RANGE = "date-range",
}
```

### Step 3: Integrate with Input Component

Update `src/components/ui/Input.tsx`:

**3.1. Import the specialized component:**
```typescript
import { DateRangePicker } from "./date-range-picker";
```

**3.2. Add interface for the value type (if needed):**
```typescript
export interface DateRangeValue {
  startDate: string;
  endDate: string;
}
```

**3.3. Update BaseInputProps:**
```typescript
export interface BaseInputProps {
  // ... existing props
  dateRangeValue?: DateRangeValue;
  onDateRangeChange?: (value: DateRangeValue) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
}
```

**3.4. Add case in renderInput() switch statement:**
```typescript
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
        onDateRangeChange?.({
          ...dateRangeValue,
          startDate: date,
        })
      }
      onEndDateChange={(date) =>
        onDateRangeChange?.({
          ...dateRangeValue,
          endDate: date,
        })
      }
      startPlaceholder={startPlaceholder}
      endPlaceholder={endPlaceholder}
      baseInputClass={baseInputClass}
    />
  );
```

**3.5. Update icon rendering logic (if needed):**
```typescript
{Icon && inputType !== "textarea" && inputType !== INPUT_TYPES.DATE_RANGE && (
  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
    <Icon className="w-5 h-5" />
  </div>
)}
```

### Step 4: Update Documentation

Add usage examples to `docs/INPUT_COMPONENT_PATTERN.md`.

## Usage Example

After integration, the specialized component is used through the `Input` component:

```typescript
import { Input, INPUT_TYPES } from "@/components/ui/Input";

function MyComponent() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
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
  );
}
```

## Benefits of This Pattern

1. **No Circular Dependencies**: Specialized components don't import `Input`, preventing circular dependency issues
2. **Consistent API**: All inputs use the same `Input` component interface
3. **Separation of Concerns**: Complex logic is isolated in specialized components
4. **Reusability**: Specialized components can be used directly if needed (though not recommended)
5. **Maintainability**: Changes to specialized components don't affect other input types
6. **Consistent Styling**: `baseInputClass` ensures all inputs follow the same theme

## When to Create a Specialized Component

Create a specialized component when:
- ✅ The input requires multiple HTML elements (e.g., date range = 2 inputs)
- ✅ The input has complex internal state or logic
- ✅ The input needs custom UI elements (clear buttons, preview, etc.)
- ✅ The input type is used in multiple places

Do NOT create a specialized component when:
- ❌ A simple HTML input type suffices (use `INPUT_TYPES.TEXT`, `INPUT_TYPES.DATE`, etc.)
- ❌ The logic is trivial and can be handled in the parent component

## Checklist for New Specialized Components

- [ ] Create component file in `src/components/ui/`
- [ ] Component does NOT import `Input`
- [ ] Component accepts `baseInputClass` prop
- [ ] Component uses raw HTML inputs with `baseInputClass`
- [ ] Add input type to `INPUT_TYPES` enum
- [ ] Add value interface (if needed) to `Input.tsx`
- [ ] Update `BaseInputProps` interface
- [ ] Import component in `Input.tsx`
- [ ] Add case in `renderInput()` switch
- [ ] Update icon rendering logic (if needed)
- [ ] Add usage examples to documentation
- [ ] Test integration with `Input` component

## Anti-Patterns

❌ **DO NOT import Input component in specialized components:**
```typescript
// WRONG
import { Input, INPUT_TYPES } from "./Input";

export function DateRangePicker() {
  return (
    <div>
      <Input inputType={INPUT_TYPES.DATE} /> {/* Creates circular dependency */}
    </div>
  );
}
```

✅ **DO use raw HTML inputs with baseInputClass:**
```typescript
// CORRECT
export function DateRangePicker({ baseInputClass }) {
  return (
    <div>
      <input type="date" className={baseInputClass} />
    </div>
  );
}
```

❌ **DO NOT bypass Input component in application code:**
```typescript
// WRONG - Don't use specialized component directly
import { DateRangePicker } from "@/components/ui/date-range-picker";
<DateRangePicker startDate={...} endDate={...} />
```

✅ **DO use through Input component:**
```typescript
// CORRECT
import { Input, INPUT_TYPES } from "@/components/ui/Input";
<Input inputType={INPUT_TYPES.DATE_RANGE} dateRangeValue={...} />
```

## Summary

This pattern ensures that:
1. All inputs go through the `Input` component for consistency
2. Complex input logic is properly separated
3. No circular dependencies exist
4. Styling remains consistent across all input types
5. The codebase remains maintainable and scalable
