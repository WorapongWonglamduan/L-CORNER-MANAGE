import type { I18nText } from "@/types/i18n";

/** Shape of a recipe ingredient as sent in the product create/update request body. */
export interface RecipeIngredientInput {
  ingredient_id: string;
  quantity: number;
  unit_id: string;
  is_optional?: boolean;
  note_i18n?: I18nText | null;
}

/** Shape of a recipe as sent in the product create/update request body. */
export interface RecipeInput {
  name_i18n: I18nText;
  is_default?: boolean;
  serving_qty?: number;
  serving_unit_id?: string | null;
  ingredients?: RecipeIngredientInput[];
}
