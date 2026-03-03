export const INPUT_TYPES = {
  TEXT: "text",
  EMAIL: "email",
  PASSWORD: "password",
  NUMBER: "number",
  TEL: "tel",
  URL: "url",
  DATE: "date",
  TIME: "time",
  DATETIME_LOCAL: "datetime-local",
  FILE: "file",
  SEARCH: "search",
  COLOR: "color",
  TEXTAREA: "textarea",
  SELECT: "select",
  CHECKBOX: "checkbox",
} as const;

export type InputType = (typeof INPUT_TYPES)[keyof typeof INPUT_TYPES];
