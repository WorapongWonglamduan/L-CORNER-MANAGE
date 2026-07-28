# Project conventions

## Reuse existing components before writing new ones

Before adding a new UI element or piece of logic, check whether an existing
shared component/hook already covers it, and use that instead of a raw
native element or a duplicate implementation.

- Inputs (text/number/date/select/textarea/checkbox/image-upload) go through
  `src/components/ui/Input.tsx`, not a raw `<input>`/`<select>`/`<textarea>`.
- Dates go through `Input.tsx`'s `INPUT_TYPES.DATE` / `INPUT_TYPES.DATE_RANGE`
  (locale-aware via `DateField`/`DateRangePicker` in
  `src/components/ui/date-range-picker.tsx`) — never a native
  `<input type="date">`, since its displayed format follows the browser's
  locale, not the app's next-intl locale.
- Entity add/edit forms go through the dynamic-form pipeline (`useEntityForm`
  + `EntityDialog` + `DynamicFormFields` + `field-registry.tsx`), configured
  via a `FieldConfig[]` in that page's `form/config.ts` — not a hand-rolled
  form.
- Buttons, modals/dialogs, dropdown menus, comboboxes, and pagination use
  `src/components/ui/*` (`Button`, `entity-dialog`, `dropdown-menu`,
  `Combobox`, `pagination`, etc.).
- If nothing existing fits, extend/generalize the existing shared component
  (as done for `DateField`, and for `emptyOptionLabel`/`hideEmptyOption` on
  `Input.tsx`) rather than building a parallel one-off.
