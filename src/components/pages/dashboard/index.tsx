'use client'

import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { ArrowUpRight, ArrowDownRight, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { quickActions, getStatsCards } from './helper'
import { theme } from '@/lib/theme'

interface DashboardContentProps {
  userName?: string
  userRoles?: string[]
  userPermissions?: string[]
}

export default function DashboardContent({ 
  userName, 
  userRoles, 
  userPermissions 
}: DashboardContentProps) {
  const t = useTranslations('dashboard')
  const tAuth = useTranslations('auth')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  const statsCards = getStatsCards({
    todaySales: 15420,
    totalProducts: 248,
    lowStockItems: 12,
    totalCustomers: 1847,
  })

  const handleQuickAction = (href: string) => {
    router.push(`/${locale}${href}`)
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push(`/${locale}/login`)
    router.refresh()
  }

  return (
    <div className={`min-h-screen ${theme.gradients.background}`}>
      {/* Header */}
      <div className={`bg-[${theme.colors.primary.main}] ${theme.shadows.lg}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-white">L</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{t('title')}</h1>
                <p className="text-sm text-blue-200">
                  {t('welcome')}, <span className="font-semibold text-white">{userName}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <button
                onClick={handleLogout}
                className={theme.buttons.ghost}
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">{tAuth('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 lg:p-8">

        <div className="mb-8">
          <div></div>
          {userRoles && userRoles.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-500">{t('role')}:</span>
              <div className="flex gap-2">
                {userRoles.map((role, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                className={theme.cards.default}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.colorClass} w-14 h-14 ${theme.rounded.md} flex items-center justify-center ${theme.shadows.lg}`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  {stat.trend && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      stat.trend.isPositive ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {stat.trend.isPositive ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>{stat.trend.value}</span>
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-sm text-gray-600">{t(stat.titleKey)}</p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className={`lg:col-span-2 ${theme.cards.flat} p-6`}>
            <h2 className={`text-lg font-semibold text-[${theme.colors.text.primary}] mb-4`}>{t('salesChart')}</h2>
            <div className={`h-64 flex items-center justify-center ${theme.gradients.backgroundLight} ${theme.rounded.md}`}>
              <p className="text-gray-500">{t('chartPlaceholder')}</p>
            </div>
          </div>

          <div className={`${theme.cards.flat} p-6`}>
            <h2 className={`text-lg font-semibold text-[${theme.colors.text.primary}] mb-4`}>{t('recentActivity')}</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{t('activityItem')}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('timeAgo', { time: item })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${theme.cards.flat} p-6`}>
          <h2 className={`text-lg font-semibold text-[${theme.colors.text.primary}] mb-4`}>{t('quickActions.title')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.href)}
                  className={`${action.colorClass} text-white ${theme.rounded.md} p-6 flex flex-col items-center gap-3 transition-all hover:scale-105 hover:shadow-xl ${theme.shadows.lg}`}
                >
                  <Icon className="w-10 h-10" />
                  <span className="text-sm font-semibold text-center">{t(action.labelKey)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {userPermissions && userPermissions.length > 0 && (
          <div className={`mt-6 ${theme.gradients.backgroundLight} border border-blue-200 ${theme.rounded.lg} p-4 ${theme.shadows.md}`}>
            <p className={`text-sm font-semibold text-[${theme.colors.text.primary}] mb-2`}>{t('permissions')}:</p>
            <div className="flex flex-wrap gap-2">
              {userPermissions.map((permission, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700"
                >
                  {permission}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
