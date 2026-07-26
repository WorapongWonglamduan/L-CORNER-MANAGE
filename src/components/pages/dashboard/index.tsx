'use client'

import { ArrowUpRight, ArrowDownRight, TrendingUp, Clock, RefreshCw, Calendar, ChevronRight } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
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
  const { t, status, stats, actions } = useDashboard()
  
  const currentDate = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })

  return (
    <div className={`min-h-screen ${theme.gradients.background} flex`}>
      <Sidebar userName={userName} />

      {/* Main Content */}
      <div className="flex-1 p-6 pt-20 md:pt-6 lg:p-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                {t('welcome')}, {userName}!
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>{currentDate}</span>
              </div>
            </div>
            <button
              onClick={actions.handleRefresh}
              disabled={status.refreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${status.refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">รีเฟรช</span>
            </button>
          </div>

          {userRoles && userRoles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">{t('role')}:</span>
              <div className="flex flex-wrap gap-2">
                {userRoles.map((role, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {status.loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gray-200 w-14 h-14 rounded-xl"></div>
                  <div className="bg-gray-200 h-6 w-16 rounded"></div>
                </div>
                <div className="bg-gray-200 h-8 w-24 rounded mb-2"></div>
                <div className="bg-gray-200 h-4 w-32 rounded"></div>
              </div>
            ))
          ) : (
            stats.statsCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
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
            })
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Products */}
          <div className={`lg:col-span-2 ${theme.cards.flat} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                {t('topProducts')}
              </h2>
              <span className="text-xs text-gray-500">30 {t('days')}</span>
            </div>
            <div className="space-y-3">
              {status.loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg animate-pulse">
                    <div className="bg-gray-200 w-10 h-10 rounded"></div>
                    <div className="flex-1">
                      <div className="bg-gray-200 h-4 w-32 rounded mb-2"></div>
                      <div className="bg-gray-200 h-3 w-24 rounded"></div>
                    </div>
                    <div className="bg-gray-200 h-6 w-20 rounded"></div>
                  </div>
                ))
              ) : stats.dashboardData?.topProducts && stats.dashboardData.topProducts.length > 0 ? (
                stats.dashboardData.topProducts.map((product, index) => {
                  const rankColors = [
                    'bg-gradient-to-br from-yellow-400 to-yellow-600',
                    'bg-gradient-to-br from-gray-300 to-gray-500',
                    'bg-gradient-to-br from-orange-400 to-orange-600',
                    'bg-gradient-to-br from-blue-500 to-blue-600',
                    'bg-gradient-to-br from-purple-500 to-purple-600',
                  ]
                  return (
                    <div key={product.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-xl hover:from-blue-100 transition-all hover:shadow-md group">
                      <div className={`${rankColors[index] || 'bg-gradient-to-br from-blue-500 to-blue-600'} text-white w-12 h-12 rounded-xl flex items-center justify-center font-bold shadow-lg`}>
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 mb-1 truncate">{product.name_i18n.th}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          <span className="px-2 py-0.5 bg-gray-100 rounded">{product.code}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-medium">{product.totalQuantity.toLocaleString()} {t('units')}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-600 text-base sm:text-lg">฿{product.totalRevenue.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">รายได้</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors hidden sm:block" />
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-gray-500">{t('noData')}</div>
              )}
            </div>
          </div>

          {/* Recent Sales */}
          <div className={`${theme.cards.flat} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">{t('recentSales')}</h2>
            </div>
            <div className="space-y-3">
              {status.loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="pb-3 border-b border-gray-100 last:border-0 animate-pulse">
                    <div className="bg-gray-200 h-4 w-24 rounded mb-2"></div>
                    <div className="bg-gray-200 h-3 w-32 rounded mb-1"></div>
                    <div className="bg-gray-200 h-3 w-20 rounded"></div>
                  </div>
                ))
              ) : stats.dashboardData?.recentSales && stats.dashboardData.recentSales.length > 0 ? (
                stats.dashboardData.recentSales.map((sale) => (
                  <div key={sale.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900">{sale.sale_number}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        sale.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {sale.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-green-600">฿{Number(sale.total_amount).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(sale.sale_date).toLocaleDateString('th-TH', { 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">{t('noSales')}</div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`${theme.cards.flat} p-6`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('quickActions.title')}</h2>
            <span className="text-sm text-gray-500">เข้าถึงฟีเจอร์หลักได้อย่างรวดเร็ว</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {actions.quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <button
                  key={index}
                  onClick={() => actions.handleQuickAction(action.href)}
                  className={`${action.colorClass} text-white rounded-xl p-6 flex flex-col items-center gap-3 transition-all hover:scale-105 hover:shadow-2xl shadow-lg group relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                  <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-bold text-center">{t(action.labelKey)}</span>
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
