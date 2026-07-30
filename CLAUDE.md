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

## Page folder structure

Each entity lives under `src/components/pages/<entity>/`. Split it into
subfolders by view/route instead of dropping every file at the top level:

- `list/` — the list page (`index.tsx`), its data hook (`helper.tsx`), and
  any list-only components (row action buttons, visibility toggles, etc.).
- `form/` — the create/edit page or dialog (`index.tsx`/`helper.tsx`) and the
  dynamic-form `config.ts` used by `useEntityForm`/`EntityDialog` (see
  above). Only needed when the entity has a dedicated create/edit
  route/dialog.
- `detail/` — a dedicated detail/view route (`index.tsx` + `helper.tsx`), if
  the entity has one.
- `other/` — anything that doesn't fit list/form/detail: standalone modals,
  secondary dialogs, etc.

Omit whichever subfolders don't apply to that entity — e.g. a list-only
entity doesn't need a `form/` folder. Reference layouts: `products/` (list +
form + detail) and `sales/` (list + other, since sales are created via POS,
not a form on this page).
