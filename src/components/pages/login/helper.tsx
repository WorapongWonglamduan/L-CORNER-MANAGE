import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { signIn } from 'next-auth/react'
import { z } from 'zod'
import { Package, ShoppingCart, BarChart3, LucideIcon } from 'lucide-react'

export interface FeatureItem {
  icon: LucideIcon
  titleKey: string
  descriptionKey: string
}

export type LoginFormData = {
  username: string
  password: string
}

export const loginFeatures: FeatureItem[] = [
  {
    icon: Package,
    titleKey: 'features.inventory.title',
    descriptionKey: 'features.inventory.description',
  },
  {
    icon: ShoppingCart,
    titleKey: 'features.sales.title',
    descriptionKey: 'features.sales.description',
  },
  {
    icon: BarChart3,
    titleKey: 'features.reports.title',
    descriptionKey: 'features.reports.description',
  },
]

export const brandingConfig = {
  iconSize: {
    large: 'w-7 h-7',
    medium: 'w-5 h-5',
  },
  containerSize: {
    large: 'w-12 h-12',
    medium: 'w-10 h-10',
  },
}

export const useHelper = () => {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('auth.login')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const loginSchema = z.object({
    username: z.string().min(1, t('validation.usernameRequired')),
    password: z.string().min(6, t('validation.passwordMin')),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        username: data.username,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError(t('error'))
      } else {
        router.push(`/${locale}`)
        router.refresh()
      }
    } catch {
      setError(t('serverError'))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    error,
    isLoading,
    t,
  }
}
