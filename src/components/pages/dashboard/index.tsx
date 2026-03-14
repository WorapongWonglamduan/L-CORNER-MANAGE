'use client'

import { ArrowUpRight, ArrowDownRight, TrendingUp, Clock } from 'lucide-react'
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
  const { t, loading, statsCards, quickActions, handleQuickAction, dashboardData } = useDashboard()

  return (
    <div className={`min-h-screen ${theme.gradients.background} flex`}>
      <Sidebar userName={userName} />

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-8 overflow-auto">

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
          {loading ? (
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
            statsCards.map((stat, index) => {
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
              {loading ? (
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
              ) : dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
                dashboardData.topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-4 p-3 bg-gradient-to-r from-blue-50 to-transparent rounded-lg hover:from-blue-100 transition-colors">
                    <div className="bg-blue-600 text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{product.name_i18n.th}</p>
                      <p className="text-xs text-gray-500">{product.code} • {product.totalQuantity.toLocaleString()} {t('units')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">฿{product.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))
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
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="pb-3 border-b border-gray-100 last:border-0 animate-pulse">
                    <div className="bg-gray-200 h-4 w-24 rounded mb-2"></div>
                    <div className="bg-gray-200 h-3 w-32 rounded mb-1"></div>
                    <div className="bg-gray-200 h-3 w-20 rounded"></div>
                  </div>
                ))
              ) : dashboardData?.recentSales && dashboardData.recentSales.length > 0 ? (
                dashboardData.recentSales.map((sale) => (
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
