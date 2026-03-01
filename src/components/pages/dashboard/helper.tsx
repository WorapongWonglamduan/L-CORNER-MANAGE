import { 
  ShoppingCart, 
  Package, 
  AlertCircle,
  DollarSign,
  Users,
  BarChart3,
  LucideIcon 
} from 'lucide-react'

export interface StatCard {
  titleKey: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: string
    isPositive: boolean
  }
  colorClass: string
}

export interface QuickAction {
  labelKey: string
  icon: LucideIcon
  href: string
  colorClass: string
}

export const quickActions: QuickAction[] = [
  {
    labelKey: 'quickActions.newSale',
    icon: ShoppingCart,
    href: '/pos',
    colorClass: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    labelKey: 'quickActions.addProduct',
    icon: Package,
    href: '/products/new',
    colorClass: 'bg-green-500 hover:bg-green-600',
  },
  {
    labelKey: 'quickActions.viewReports',
    icon: BarChart3,
    href: '/reports',
    colorClass: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    labelKey: 'quickActions.manageInventory',
    icon: AlertCircle,
    href: '/inventory',
    colorClass: 'bg-orange-500 hover:bg-orange-600',
  },
]

export const getStatsCards = (data?: {
  todaySales?: number
  totalProducts?: number
  lowStockItems?: number
  totalCustomers?: number
}): StatCard[] => [
  {
    titleKey: 'stats.todaySales',
    value: `฿${data?.todaySales?.toLocaleString() || '0'}`,
    icon: DollarSign,
    trend: {
      value: '+12.5%',
      isPositive: true,
    },
    colorClass: 'bg-green-500',
  },
  {
    titleKey: 'stats.totalProducts',
    value: data?.totalProducts || 0,
    icon: Package,
    colorClass: 'bg-blue-500',
  },
  {
    titleKey: 'stats.lowStock',
    value: data?.lowStockItems || 0,
    icon: AlertCircle,
    trend: {
      value: 'ต้องเติมสต็อก',
      isPositive: false,
    },
    colorClass: 'bg-orange-500',
  },
  {
    titleKey: 'stats.customers',
    value: data?.totalCustomers || 0,
    icon: Users,
    trend: {
      value: '+8.2%',
      isPositive: true,
    },
    colorClass: 'bg-purple-500',
  },
]

export const chartConfig = {
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
}
