# Component Architecture Pattern

## Overview
ระบบใช้ pattern แบบแยก logic ออกจาก UI component โดยใช้ custom hooks ใน helper.tsx

## Standard Pattern

### 1. File Structure
```
src/components/pages/[page-name]/
├── index.tsx          # Main page component (UI only)
├── helper.tsx         # Logic, hooks, configs, handlers
└── configs.ts         # Form configs (if applicable)
```

### 2. Helper Pattern (helper.tsx)

**ต้องมีส่วนประกอบ:**
- **Static Configs**: ข้อมูลคงที่ เช่น menu items, feature lists
- **Custom Hook**: `use[PageName]` - รวม logic, state, handlers ทั้งหมด
- **Return Object**: ส่งค่าที่ UI component ต้องการ

```typescript
// helper.tsx
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

// 1. Static Configs
export const staticConfig = {
  // ... config data
};

// 2. Custom Hook
export const use[PageName] = () => {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("[namespace]");
  
  // State
  const [state, setState] = useState();
  
  // Handlers
  const handleAction = () => {
    // logic here
  };
  
  // Return everything UI needs
  return {
    t,
    state,
    handleAction,
    // ... other values
  };
};
```

### 3. Page Component Pattern (index.tsx)

**ต้องทำ:**
- Import hook จาก helper
- Destructure ค่าที่ต้องการจาก hook
- Focus เฉพาะ UI rendering

```typescript
// index.tsx
'use client'

import { use[PageName] } from './helper'

export default function [PageName]Content(props) {
  const { t, state, handleAction } = use[PageName]()
  
  return (
    <div>
      {/* UI only - no logic */}
    </div>
  )
}
```

## Examples

### Example 1: Login Page

**File: `src/components/pages/login/helper.tsx`**
```typescript
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { createLoginFormConfig } from "./configs";

// Static configs
export const loginFeatures = [
  { icon: Package, titleKey: "features.inventory.title" },
  // ...
];

export const brandingConfig = {
  iconSize: { large: "w-7 h-7" },
  // ...
};

// Custom hook
export const useLoginForm = () => {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("auth.login");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    // ... login logic
  };

  const formConfig = {
    fields: createLoginFormConfig(t),
    submitLabel: t("submit"),
    loadingLabel: t("loading"),
  };

  return {
    control,
    handleSubmit,
    onSubmit,
    errors,
    error,
    isLoading,
    formConfig,
  };
};
```

**File: `src/components/pages/login/login-form.tsx`**
```typescript
'use client'

import { FormBuilder } from '@/components/ui/FormBuilder'
import { useLoginForm } from './helper'

export function LoginForm() {
  const { control, handleSubmit, onSubmit, errors, error, isLoading, formConfig } = useLoginForm()
  
  return (
    <div className="space-y-6">
      <FormBuilder 
        config={formConfig} 
        control={control}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        errors={errors}
        error={error} 
        isLoading={isLoading} 
      />
    </div>
  )
}
```

### Example 2: Dashboard Page

**File: `src/components/pages/dashboard/helper.tsx`**
```typescript
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

// Static configs
export const quickActions = [
  { labelKey: "quickActions.newSale", icon: ShoppingCart, href: "/pos" },
  // ...
];

export const getStatsCards = (data) => [
  { titleKey: "stats.todaySales", value: data.todaySales, icon: DollarSign },
  // ...
];

// Custom hook
export const useDashboard = () => {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("dashboard");

  const statsCards = getStatsCards({
    todaySales: 15420,
    totalProducts: 248,
    lowStockItems: 12,
    totalCustomers: 1847,
  });

  const handleQuickAction = (href: string) => {
    router.push(`/${locale}${href}`);
  };

  return {
    t,
    statsCards,
    quickActions,
    handleQuickAction,
  };
};
```

**File: `src/components/pages/dashboard/index.tsx`**
```typescript
'use client'

import { Navbar } from '@/components/navbar'
import { useDashboard } from './helper'

export default function DashboardContent({ userName, userRoles }) {
  const { t, statsCards, quickActions, handleQuickAction } = useDashboard()
  
  return (
    <div>
      <Navbar userName={userName} />
      {/* Render stats cards, quick actions, etc. */}
    </div>
  )
}
```

## Form Validation Pattern

### Using Config-based Validation (Recommended)

**File: `configs.ts`**
```typescript
import { FieldConfig } from "@/components/ui/FormBuilder";

export const createLoginFormConfig = (
  t: (key: string) => string
): FieldConfig<LoginFormData>[] => [
  {
    name: "username",
    type: "text",
    label: t("username"),
    placeholder: "admin",
    icon: User,
    rules: {
      required: t("validation.usernameRequired"),
    },
  },
  {
    name: "password",
    type: "password",
    label: t("password"),
    rules: {
      required: t("validation.passwordRequired"),
      minLength: {
        value: 6,
        message: t("validation.passwordMin"),
      },
    },
  },
];
```

**Benefits:**
- Validation rules อยู่ใน config
- ไม่ต้องใช้ Zod schema
- ใช้ react-hook-form validation โดยตรง
- Type-safe และ reusable

## Rules & Best Practices

### ✅ DO
1. **แยก logic ออกจาก UI** - ทุก logic ต้องอยู่ใน helper.tsx
2. **ใช้ custom hook** - สร้าง `use[PageName]` hook เสมอ
3. **Return ค่าที่จำเป็น** - UI component ควร destructure เฉพาะที่ใช้
4. **Static config แยกออกมา** - อย่าเขียน hardcode ใน UI
5. **Handler functions ใน hook** - ทุก event handler ต้องอยู่ใน hook
6. **Translation ใน hook** - เรียก `useTranslations` ใน hook แล้วส่ง `t` ออกมา

### ❌ DON'T
1. **อย่าเขียน logic ใน UI component** - ห้าม `useState`, `useEffect` ใน index.tsx
2. **อย่า import hooks โดยตรงใน UI** - ใช้ผ่าน custom hook เท่านั้น
3. **อย่า hardcode config** - ย้ายไปไว้ใน helper หรือ configs
4. **อย่าใช้ inline handlers** - สร้าง function ใน hook แล้ว return ออกมา

## Migration Checklist

เมื่อต้องการ refactor component เก่าให้เป็น pattern ใหม่:

- [ ] สร้างไฟล์ `helper.tsx` ถ้ายังไม่มี
- [ ] ย้าย static configs ไปไว้ใน helper
- [ ] สร้าง custom hook `use[PageName]`
- [ ] ย้าย state, handlers, logic ทั้งหมดเข้า hook
- [ ] Return ค่าที่ UI ต้องการจาก hook
- [ ] อัปเดต UI component ให้ใช้ hook
- [ ] ลบ imports และ code ที่ไม่ใช้แล้วออก
- [ ] Test ให้แน่ใจว่าทำงานเหมือนเดิม

## Benefits

1. **Separation of Concerns** - UI และ logic แยกกันชัดเจน
2. **Reusability** - Hook สามารถนำไปใช้ซ้ำได้
3. **Testability** - Test logic ได้โดยไม่ต้อง render UI
4. **Maintainability** - แก้ไข logic ไม่กระทบ UI
5. **Type Safety** - TypeScript ช่วย validate ทุกอย่าง
6. **Consistency** - ทุกหน้าใช้ pattern เดียวกัน
