'use client'

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { useDashboard } from './helper'
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
  const { t, statsCards, quickActions, handleQuickAction } = useDashboard()

  return (
    <div className={`min-h-screen ${theme.gradients.background}`}>
      <Navbar userName={userName} />

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
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.colorClass} w-14 h-14 rounded-xl flex items-center justify-center shadow-lg`}>
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
