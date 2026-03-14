export const ROUTES = {
  DASHBOARD: (locale: string) => `/${locale}/dashboard`,
  POS: (locale: string) => `/${locale}/pos`,
  SALES: (locale: string) => `/${locale}/sales`,
  PRODUCTS: {
    LIST: (locale: string) => `/${locale}/products/list`,
    ADD: (locale: string) => `/${locale}/products/add`,
    EDIT: (locale: string, id: string) => `/${locale}/products/edit/${id}`,
  },
  INVENTORY: (locale: string) => `/${locale}/inventory`,
  SETTINGS: {
    INDEX: (locale: string) => `/${locale}/settings`,
    UNITS: (locale: string) => `/${locale}/settings/units`,
    CATEGORIES: (locale: string) => `/${locale}/settings/categories`,
    RAW_MATERIALS: (locale: string) => `/${locale}/settings/raw-materials`,
    PRODUCT_TYPES: (locale: string) => `/${locale}/settings/product-types`,
  },
  LOGIN: (locale: string) => `/${locale}/login`,
} as const;
