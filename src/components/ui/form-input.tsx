import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Input, InputType } from "./Input";

interface FormInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  inputType?: InputType;
  disabled?: boolean;
  className?: string;
}

export function FormInput<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  required = false,
  inputType = "text",
  disabled = false,
  className,
}: FormInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Input
          {...field}
          id={name}
          label={label}
          placeholder={placeholder}
          inputType={inputType}
          error={error}
          disabled={disabled}
          className={className}
        />
      )}
    />
  );
}
