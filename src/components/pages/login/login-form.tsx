'use client'

import { useTranslations } from 'next-intl'
import { DynamicForm } from '@/components/dynamic-form/dynamic-form'
import { useLoginForm } from './helper'
import { theme } from '@/lib/theme'

export function LoginForm() {
  const t = useTranslations('auth.login')
  const { control, handleSubmit, onSubmit, errors, error, isLoading, formConfig } = useLoginForm()

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 ${theme.gradients.primaryBr} ${theme.rounded.lg} mb-4 lg:hidden ${theme.shadows.lg}`}>
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h2 className={`text-2xl font-bold text-[${theme.colors.text.primary}]`}>{t('title')}</h2>
        <p className="mt-2 text-sm text-gray-600">{t('subtitle')}</p>
      </div>

      <DynamicForm
        config={formConfig}
        control={control}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        errors={errors}
        error={error} 
        isLoading={isLoading} 
      />

      <div className="text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 ${theme.rounded.sm} ${theme.shadows.sm}`}>
          <svg
            className={`w-4 h-4 text-[${theme.colors.text.primary}]`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <p className={`text-sm text-[${theme.colors.text.primary}] font-medium`}>
            {t('testAccount')}
          </p>
        </div>
      </div>
    </div>
  )
}
