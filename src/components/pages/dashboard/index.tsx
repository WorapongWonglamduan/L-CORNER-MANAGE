'use client'

import dynamic from 'next/dynamic'
import { ArrowUpRight, ArrowDownRight, TrendingUp, Clock, RefreshCw, Calendar, MapPin, BarChart3 } from 'lucide-react'
import { useLocale } from 'next-intl'
import { Sidebar } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import { DynamicFormFields } from '@/components/dynamic-form/dynamic-form-fields'
import { INPUT_TYPES } from '@/constants/input-types'
import { SalesTrendChart } from './sales-trend-chart'
import { TopProductsChart } from './top-products-chart'
import { useDashboard } from './helper'
import { theme } from '@/lib/theme'
import type { Locale } from '@/types/i18n'

// Leaflet touches `window`/`document` at module scope — this page is a
// client component but Next still server-renders it once, so the map must
// be excluded from that pass entirely.
const BranchesMap = dynamic(
  () => import('./branches-map').then((mod) => mod.BranchesMap),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700" /> },
)

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
  const { t, status, stats, actions, warehouse, filterForm } = useDashboard()
  const locale = useLocale() as Locale

  const currentDate = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })

  return (
    <div className={`min-h-screen ${theme.gradients.background} dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex`}>
      <Sidebar userName={userName} />

      {/* Main Content */}
      <div className="flex-1 p-6 pt-20 md:pt-6 lg:p-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {t('welcome')}, {userName}!
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>{currentDate}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start">
              {warehouse.warehouses.length > 0 && (
                <DynamicFormFields<{ warehouseId: string }>
                  fields={[
                    {
                      name: "warehouseId",
                      type: INPUT_TYPES.SELECT,
                      options: [
                        { value: "all", label: t('allBranches') },
                        ...warehouse.warehouses.map((w) => ({
                          value: w.id,
                          label: `${w.code} - ${w.name_i18n[locale]}`,
                        })),
                      ],
                      className: "py-2!",
                    },
                  ]}
                  control={filterForm.control}
                  errors={filterForm.errors}
                />
              )}
              <Button
                onClick={actions.handleRefresh}
                disabled={status.refreshing}
                variant="outline"
                className="shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${status.refreshing ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
            </div>
          </div>

          {userRoles && userRoles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('role')}:</span>
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
              <div key={index} className={`${theme.cards.flat} p-6 animate-pulse`}>
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
                  className={`${theme.cards.flat} p-6 hover:shadow-xl transition-all hover:-translate-y-1`}
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
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t(stat.titleKey)}</p>
                </div>
              )
            })
          )}
        </div>

        {/* Sales Trend */}
        <div className={`${theme.cards.flat} p-6 mb-8`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              {t('salesChart')}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">7 {t('days')}</span>
          </div>
          {status.loading ? (
            <div className="h-64 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700" />
          ) : (
            <SalesTrendChart
              data={stats.dashboardData?.salesByDay || []}
              locale={locale}
              seriesLabel={t('stats.todaySales')}
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Products */}
          <div className={`lg:col-span-2 ${theme.cards.flat} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                {t('topProducts')}
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">30 {t('days')}</span>
            </div>
            {status.loading ? (
              <div className="h-64 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700" />
            ) : stats.dashboardData?.topProducts && stats.dashboardData.topProducts.length > 0 ? (
              <TopProductsChart
                data={stats.dashboardData.topProducts}
                locale={locale}
                seriesLabel={t('revenue')}
              />
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">{t('noData')}</div>
            )}
          </div>

          {/* Recent Sales */}
          <div className={`${theme.cards.flat} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('recentSales')}</h2>
            </div>
            <div className="space-y-3">
              {status.loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 animate-pulse">
                    <div className="bg-gray-200 h-4 w-24 rounded mb-2"></div>
                    <div className="bg-gray-200 h-3 w-32 rounded mb-1"></div>
                    <div className="bg-gray-200 h-3 w-20 rounded"></div>
                  </div>
                ))
              ) : stats.dashboardData?.recentSales && stats.dashboardData.recentSales.length > 0 ? (
                stats.dashboardData.recentSales.map((sale) => (
                  <div key={sale.id} className="pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{sale.sale_number}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        sale.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {sale.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-green-600">฿{Number(sale.total_amount).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">{t('noSales')}</div>
              )}
            </div>
          </div>
        </div>

        {/* Branches Map */}
        <div className={`${theme.cards.flat} p-6 mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('branchesMap')}</h2>
          </div>
          <BranchesMap
            warehouses={warehouse.visibleWarehouses}
            locale={locale}
            emptyLabel={t('noBranchLocation')}
          />
        </div>

        {/* Quick Actions */}
        <div className={`${theme.cards.flat} p-6`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('quickActions.title')}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">เข้าถึงฟีเจอร์หลักได้อย่างรวดเร็ว</span>
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
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
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
