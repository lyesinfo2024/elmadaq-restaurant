import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useRestaurant } from '../context/RestaurantContext.tsx';
import {
  Category,
  Product,
  DeliveryZone,
  Order,
  OrderStatus,
  DeliveryPerson,
  CreateDeliveryPersonInput,
  UpdateDeliveryPersonInput,
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatDZD, formatAlgerianPhone, isValidAlgerianPhone, formatAlgerianDateTime } from '../utils/formatters.ts';
import {
  ShieldCheck,
  Store,
  Utensils,
  Layers,
  Users,
  Settings,
  ArrowRight,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Truck,
  Eye,
  ClipboardList,
  Filter,
  RefreshCw,
  Phone,
  MapPin,
  Clock,
  Banknote,
  Check,
  XCircle,
  X,
  Bike,
  Plus,
  Edit3,
  UserCheck,
  UserX,
  Mail,
  Lock,
} from 'lucide-react';

interface AdminDashboardProps {
  categories: Category[];
  products: Product[];
  onClose: () => void;
}

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string; badge: string }> = {
  NEW: { label: 'طلب جديد', color: 'text-amber-700 bg-amber-50 border-amber-200', badge: 'bg-amber-500' },
  CONFIRMED: { label: 'تم التأكيد', color: 'text-blue-700 bg-blue-50 border-blue-200', badge: 'bg-blue-500' },
  PREPARING: { label: 'قيد التحضير', color: 'text-purple-700 bg-purple-50 border-purple-200', badge: 'bg-purple-500' },
  READY: { label: 'جاهز للتوصيل', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', badge: 'bg-indigo-500' },
  OUT_FOR_DELIVERY: { label: 'خرج للتوصيل', color: 'text-orange-700 bg-orange-50 border-orange-200', badge: 'bg-orange-500' },
  DELIVERED: { label: 'تم التوصيل', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', badge: 'bg-emerald-500' },
  CANCELLED: { label: 'ملغي', color: 'text-red-700 bg-red-50 border-red-200', badge: 'bg-red-500' },
};

export function AdminDashboard({ categories, products, onClose }: AdminDashboardProps) {
  const { user, token, logout, isAdmin, isManager } = useAuth();
  const { restaurant, updateSettings } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'drivers' | 'settings' | 'menu' | 'delivery' | 'roles'>('orders');
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);

  // Orders Management State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Delivery Staff Management State (Phase 3)
  const [deliveryStaff, setDeliveryStaff] = useState<DeliveryPerson[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DeliveryPerson | null>(null);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [selectedDriverIdForAssign, setSelectedDriverIdForAssign] = useState<string>('');

  // Sync selectedDriverIdForAssign when selectedOrder changes
  useEffect(() => {
    setSelectedDriverIdForAssign(selectedOrder?.deliveryPersonId || '');
  }, [selectedOrder]);

  // New Driver Form State (Name, Phone, Email, Password only)
  const [newDriver, setNewDriver] = useState<CreateDeliveryPersonInput>({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [newDriverError, setNewDriverError] = useState<string | null>(null);
  const [newDriverLoading, setNewDriverLoading] = useState(false);

  // Edit Driver Form State
  const [editDriverForm, setEditDriverForm] = useState<UpdateDeliveryPersonInput>({
    name: '',
    phone: '',
    vehicleType: '',
    vehiclePlateNumber: '',
    isActive: true,
  });
  const [editDriverError, setEditDriverError] = useState<string | null>(null);
  const [editDriverLoading, setEditDriverLoading] = useState(false);

  // Fetch orders
  const loadOrders = async () => {
    if (!token) return;
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const data = await api.getAdminOrders(token);
      setOrders(data);
      if (selectedOrder) {
        const refreshed = data.find((o) => o.id === selectedOrder.id);
        if (refreshed) setSelectedOrder(refreshed);
      }
    } catch (err: unknown) {
      setOrdersError(err instanceof Error ? err.message : 'فشل في تحميل الطلبات');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch delivery staff
  const loadStaff = async () => {
    if (!token) return;
    setLoadingStaff(true);
    try {
      const data = await api.getDeliveryStaff(token);
      setDeliveryStaff(data);
    } catch (err: unknown) {
      console.error('Failed to load delivery staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    loadOrders();
    loadStaff();
    api.getDeliveryZones(false).then(setDeliveryZones).catch(console.error);
  }, []);

  // Handle status update
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!token) return;
    setUpdatingOrderId(orderId);
    try {
      const updated = await api.updateOrderStatus(orderId, newStatus, token);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
      loadStaff();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'تعذر تحديث حالة الطلب');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handle driver assign
  const handleAssignDriver = async (orderId: string, deliveryPersonId: string | null) => {
    if (!token) return;
    setAssigningOrderId(orderId);
    try {
      const updated = await api.assignOrderToStaff(orderId, deliveryPersonId, token);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
      loadStaff();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'فشل في إسناد الطلب');
    } finally {
      setAssigningOrderId(null);
    }
  };

  // Handle create driver
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setNewDriverError(null);
    setNewDriverLoading(true);

    try {
      const created = await api.createDeliveryStaff(newDriver, token);
      setDeliveryStaff((prev) => [...prev, created]);
      setIsAddDriverModalOpen(false);
      setNewDriver({
        name: '',
        email: '',
        password: '',
        phone: '',
      });
    } catch (err: unknown) {
      setNewDriverError(err instanceof Error ? err.message : 'فشل في إضافة مندوب التوصيل');
    } finally {
      setNewDriverLoading(false);
    }
  };

  // Handle edit driver
  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingDriver) return;
    setEditDriverError(null);
    setEditDriverLoading(true);

    try {
      const updated = await api.updateDeliveryStaff(editingDriver.id, editDriverForm, token);
      setDeliveryStaff((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setEditingDriver(null);
      loadOrders(); // Refresh orders in case driver name changed
    } catch (err: unknown) {
      setEditDriverError(err instanceof Error ? err.message : 'فشل في تحديث بيانات عامل التوصيل');
    } finally {
      setEditDriverLoading(false);
    }
  };

  // Handle toggle driver status
  const handleToggleDriverStatus = async (driverId: string) => {
    if (!token) return;
    try {
      const updated = await api.toggleDeliveryStaffStatus(driverId, token);
      setDeliveryStaff((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'فشل في تغيير حالة التفعيل');
    }
  };

  // Restaurant Settings Form State
  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    description: restaurant?.description || '',
    phone: restaurant?.phone || '',
    wilaya: restaurant?.wilaya || 'الجزائر العاصمة',
    commune: restaurant?.commune || 'سيدي امحمد',
    address: restaurant?.address || '',
    currency: 'دج',
    openingHours: restaurant?.openingHours || '',
    isOpen: restaurant?.isOpen ?? true,
    defaultDeliveryFee: restaurant?.defaultDeliveryFee ?? 300,
    minOrderAmount: restaurant?.minOrderAmount ?? 800,
  });

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (formData.phone && !isValidAlgerianPhone(formData.phone)) {
      setSaveError('يرجى إدخال رقم هاتف جزائري صحيح (مثال: 0550123456 أو 0661234567 أو 0770123456)');
      return;
    }

    setSaveLoading(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateSettings(formData, token);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'فشل في حفظ التعديلات');
    } finally {
      setSaveLoading(false);
    }
  };

  // Filtered orders (Status & Driver Filter)
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    let matchesDriver = true;
    if (driverFilter === 'UNASSIGNED') {
      matchesDriver = !o.deliveryPersonId;
    } else if (driverFilter !== 'ALL') {
      matchesDriver = o.deliveryPersonId === driverFilter;
    }
    return matchesStatus && matchesDriver;
  });

  const newOrdersCount = orders.filter((o) => o.status === 'NEW').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-100 text-stone-900 animate-in fade-in">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 bg-stone-900 text-white border-b border-stone-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
              title="العودة لمتجر الزبائن"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-white">لوحة تحكم وإدارة المطعم</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  المرحلة الثالثة • نظام التوصيل وإدارة العمال 🇩🇿
                </span>
              </div>
              <p className="text-xs text-stone-400">
                المستخدم الحالي: <span className="text-white font-medium">{user?.name}</span> ({user?.role})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>معاينة متجر الزبائن</span>
            </button>
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-800/60 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto scrollbar-none py-2 border-t border-stone-800/80">
          <button
            onClick={() => setActiveTab('orders')}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>إدارة الطلبات</span>
            {newOrdersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                {newOrdersCount} جديد
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'drivers'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>عمال التوصيل ({deliveryStaff.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>نظرة عامة</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>هوية وإعدادات المطعم</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'menu'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>قائمة الوجبات ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('delivery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'delivery'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>مناطق التوصيل ({deliveryZones.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'roles'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>نظام الصلاحيات (RBAC)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ORDERS TAB (SECTION 19, 20, 21) */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-stone-400" />
                  <span className="text-xs font-bold text-stone-600">تصفية حسب الحالة:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-amber-500"
                  >
                    <option value="ALL">جميع الحالات ({orders.length})</option>
                    <option value="NEW">طلبات جديدة ({orders.filter((o) => o.status === 'NEW').length})</option>
                    <option value="CONFIRMED">تم التأكيد ({orders.filter((o) => o.status === 'CONFIRMED').length})</option>
                    <option value="PREPARING">قيد التحضير ({orders.filter((o) => o.status === 'PREPARING').length})</option>
                    <option value="READY">جاهز ({orders.filter((o) => o.status === 'READY').length})</option>
                    <option value="OUT_FOR_DELIVERY">خرج للتوصيل ({orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length})</option>
                    <option value="DELIVERED">تم التوصيل ({orders.filter((o) => o.status === 'DELIVERED').length})</option>
                    <option value="CANCELLED">ملغي ({orders.filter((o) => o.status === 'CANCELLED').length})</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Bike className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-stone-600">عامل التوصيل:</span>
                  <select
                    value={driverFilter}
                    onChange={(e) => setDriverFilter(e.target.value)}
                    className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-amber-500"
                  >
                    <option value="ALL">جميع العمال</option>
                    <option value="UNASSIGNED">غير مسند لأي عامل ({orders.filter((o) => !o.deliveryPersonId).length})</option>
                    {deliveryStaff.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({orders.filter((o) => o.deliveryPersonId === d.id).length} طلب)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={loadOrders}
                disabled={loadingOrders}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
                <span>تحديث الطلبات</span>
              </button>
            </div>

            {ordersError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {ordersError}
              </div>
            )}

            {/* Orders Table */}
            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-stone-400 space-y-2">
                  <ClipboardList className="w-10 h-10 mx-auto opacity-40" />
                  <p className="font-bold text-sm">لا توجد طلبات تطابق هذا التصنيف</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                      <tr>
                        <th className="p-4">رقم الطلب</th>
                        <th className="p-4">الزبون</th>
                        <th className="p-4">الهاتف الجزائري</th>
                        <th className="p-4">منطقة التوصيل</th>
                        <th className="p-4">المجموع</th>
                        <th className="p-4">عامل التوصيل</th>
                        <th className="p-4">الحالة الحالية</th>
                        <th className="p-4">التاريخ والوقت</th>
                        <th className="p-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredOrders.map((order) => {
                        const statusConfig = STATUS_LABELS[order.status] || {
                          label: order.status,
                          color: 'text-stone-700 bg-stone-100 border-stone-200',
                          badge: 'bg-stone-500',
                        };

                        return (
                          <tr key={order.id} className="hover:bg-stone-50/80 transition-colors">
                            <td className="p-4 whitespace-nowrap font-mono font-black text-amber-600 text-sm">
                              {order.orderNumber}
                            </td>
                            <td className="p-4 whitespace-nowrap font-bold text-stone-900">
                              {order.customerName}
                            </td>
                            <td className="p-4 whitespace-nowrap font-mono text-stone-600" dir="ltr">
                              {formatAlgerianPhone(order.customerPhone)}
                            </td>
                            <td className="p-4 whitespace-nowrap text-stone-600">
                              {order.commune} ({order.neighborhood})
                            </td>
                            <td className="p-4 whitespace-nowrap font-black text-stone-900 text-sm">
                              {formatDZD(order.total)}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              {order.deliveryPerson ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                  <Bike className="w-3 h-3 text-amber-600" />
                                  <span>{order.deliveryPerson.name}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-500">
                                  غير مسند
                                </span>
                              )}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusConfig.color}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.badge}`} />
                                <span>{statusConfig.label}</span>
                              </span>
                            </td>
                            <td className="p-4 whitespace-nowrap text-stone-500 text-[11px]">
                              {formatAlgerianDateTime(order.createdAt)}
                            </td>
                            <td className="p-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors shadow-xs"
                              >
                                عرض وتحديث
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DELIVERY DRIVERS TAB (PHASE 3) */}
        {activeTab === 'drivers' && (
          <div className="space-y-6">
            {/* Top Bar with Add Button and Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-stone-900">عمال التوصيل</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {deliveryStaff.length} مناديب
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  إدارة مناديب التوصيل، تفعيل أو تعطيل الحسابات، وإضافة مندوب جديد للمطعم.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadStaff}
                  disabled={loadingStaff}
                  className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
                  title="تحديث البيانات"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingStaff ? 'animate-spin text-amber-600' : ''}`} />
                </button>

                <button
                  onClick={() => {
                    setNewDriverError(null);
                    setIsAddDriverModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مندوب جديد</span>
                </button>
              </div>
            </div>

            {/* Drivers Cards Grid - Clean & Simple */}
            {deliveryStaff.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-stone-300 p-12 text-center text-stone-400 space-y-2">
                <Bike className="w-10 h-10 mx-auto opacity-40 text-amber-500" />
                <p className="font-bold text-sm text-stone-700">لا يوجد مناديب مسجلين حالياً</p>
                <p className="text-xs text-stone-500">اضغط على زر "إضافة مندوب جديد" لإضافة أول مندوب توصيل</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deliveryStaff.map((driver) => {
                  const driverOrders = orders.filter((o) => o.deliveryPersonId === driver.id);
                  const activeCount = driverOrders.filter((o) =>
                    ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)
                  ).length;

                  return (
                    <div
                      key={driver.id}
                      className={`bg-white rounded-3xl border p-5 transition-all shadow-xs space-y-3.5 ${
                        !driver.isActive
                          ? 'border-red-200 bg-stone-50/60 opacity-80'
                          : 'border-stone-200 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-base shadow-xs">
                            <Bike className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-base text-stone-900">{driver.name}</h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  driver.isActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {driver.isActive ? 'حساب نشط' : 'معطل'}
                              </span>
                            </div>

                            <p className="text-xs text-stone-600 font-mono mt-0.5" dir="ltr">
                              {formatAlgerianPhone(driver.phone)}
                            </p>

                            {driver.email && (
                              <p className="text-[11px] text-stone-400 font-mono">{driver.email}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Orders Count Info */}
                      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs flex items-center justify-between">
                        <span className="text-stone-500 font-medium">الطلبات المسندة حالياً:</span>
                        <span className="font-mono font-black text-sm text-stone-900">
                          {activeCount} طلبات
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                        <a
                          href={`tel:${driver.phone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 fill-emerald-600" />
                          <span>اتصال</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleToggleDriverStatus(driver.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                            driver.isActive
                              ? 'bg-red-50 hover:bg-red-100 text-red-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {driver.isActive ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>تعطيل</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>تفعيل</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-500">إجمالي الطلبات المسجلة</span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-stone-900">{orders.length}</div>
                <p className="text-xs text-stone-400 mt-1">طلبات محفوظة في النظام</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-500">طلبات جديدة بانتظار التأكيد</span>
                  <div className="p-2 rounded-xl bg-red-50 text-red-600">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-red-600">{newOrdersCount}</div>
                <p className="text-xs text-stone-400 mt-1">بحاجة لمعالجة المطبخ</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-500">الوجبات في القائمة</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Utensils className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-stone-900">{products.length}</div>
                <p className="text-xs text-stone-400 mt-1">وجبات نشطة بالدينار</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-500">طريقة الدفع الأساسية</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <Banknote className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-lg font-black text-stone-900">الدفع عند الاستلام</div>
                <p className="text-xs text-emerald-600 font-semibold mt-1">نقداً بالدينار الجزائري</p>
              </div>
            </div>

            {/* Architecture Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500 text-stone-950 shadow-xs">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    جاهزية المرحلة الثانية (نظام الطلبات الفعلي)
                  </h3>
                  <p className="text-xs text-stone-500">
                    تم تحويل السلة إلى نظام طلبات متكامل يحفظ البيانات تاريخياً مع معالجة الأسعار في الـ Backend
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-stone-100 text-xs">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>حساب الأسعار الموثوق (Backend Trust)</span>
                  </h4>
                  <p className="text-stone-500 leading-relaxed">
                    الخادم لا يثق بأي سعر قادم من الـ Frontend، بل يجلب الأسعار الأصلية ويحسب المجموع ورسوم المنطقة بنفسه داخل Transaction.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>التجميد التاريخي (Price Freeze)</span>
                  </h4>
                  <p className="text-stone-500 leading-relaxed">
                    يتم تخزين اسم وسعر كل وجبة داخل OrderItem وقت إنشاء الطلب؛ بحيث لا يتأثر الطلب إذا قام المطعم بتعديل أسعار الوجبات مستقبلاً.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>منع الطلبات المكررة (Idempotency)</span>
                  </h4>
                  <p className="text-stone-500 leading-relaxed">
                    تعطيل زر الإرسال مع مولد مفاتيح Idempotency Key يمنع تكرار إنشاء الطلبات عند ضغط الزبون المتكرر على زر التأكيد.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200">
              <div>
                <h3 className="text-lg font-bold text-stone-900">هوية وإعدادات المطعم في الجزائر</h3>
                <p className="text-xs text-stone-500">
                  تعديل اسم المطعم، العنوان، الهاتف وسعر التوصيل الافتراضي
                </p>
              </div>
              {!isAdmin && (
                <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  التعديل متاح فقط لحساب ADMIN
                </span>
              )}
            </div>

            {saveSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>تم تحديث إعدادات المطعم بنجاح وحفظها في قاعدة البيانات!</span>
              </div>
            )}

            {saveError && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">اسم المطعم</label>
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    رقم الهاتف الجزائري (05/06/07XXXXXXXX)
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    disabled={!isAdmin}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0550123456"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">وصف وشعار المطعم</label>
                <textarea
                  rows={3}
                  disabled={!isAdmin}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">الولاية</label>
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={formData.wilaya}
                    onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">البلدية</label>
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={formData.commune}
                    onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">العنوان التفصيلي (الشارع والحي)</label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">العملة (ثابتة)</label>
                  <input
                    type="text"
                    disabled
                    value="دينار جزائري (دج)"
                    className="w-full px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-sm font-bold text-stone-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">سعر التوصيل الافتراضي (دج)</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={formData.defaultDeliveryFee}
                    onChange={(e) => setFormData({ ...formData, defaultDeliveryFee: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">الحد الأدنى للطلب (دج)</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 disabled:opacity-60"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="pt-4 border-t border-stone-200 flex justify-end">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saveLoading ? 'جاري الحفظ...' : 'حفظ الإعدادات في قاعدة البيانات'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* MENU TAB */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-900">قائمة الوجبات والأسعار بالدينار الجزائري</h3>
                <p className="text-xs text-stone-500">
                  عرض {products.length} وجبة عبر {categories.length} تصنيفات
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                    <tr>
                      <th className="p-4">الوجبة</th>
                      <th className="p-4">التصنيف</th>
                      <th className="p-4">السعر (دج)</th>
                      <th className="p-4">التحضير</th>
                      <th className="p-4">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {products.map((prod) => {
                      const cat = categories.find((c) => c.id === prod.categoryId);
                      return (
                        <tr key={prod.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200"
                              />
                              <div>
                                <div className="font-bold text-stone-900 text-sm">{prod.name}</div>
                                <div className="text-stone-400 text-[11px] line-clamp-1">{prod.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-medium">
                              <span>{cat?.icon}</span>
                              <span>{cat?.name || 'عام'}</span>
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap font-black text-stone-900 text-sm">
                            {formatDZD(prod.price)}
                          </td>
                          <td className="p-4 whitespace-nowrap text-stone-500">
                            {prod.preparationTimeMinutes} دقيقة
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                prod.isAvailable
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {prod.isAvailable ? 'متوفر' : 'غير متوفر'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DELIVERY ZONES TAB */}
        {activeTab === 'delivery' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                    <tr>
                      <th className="p-4">البلدية / المنطقة</th>
                      <th className="p-4">الولاية</th>
                      <th className="p-4">سعر التوصيل</th>
                      <th className="p-4">الحد الأدنى للطلب</th>
                      <th className="p-4">الوقت المقدر</th>
                      <th className="p-4">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {deliveryZones.map((zone) => (
                      <tr key={zone.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="p-4 font-bold text-stone-900 text-sm">
                          {zone.commune}
                        </td>
                        <td className="p-4 text-stone-600">
                          {zone.wilaya} ({zone.wilayaCode})
                        </td>
                        <td className="p-4 font-black text-amber-600 text-sm">
                          {formatDZD(zone.deliveryFee)}
                        </td>
                        <td className="p-4 text-stone-700 font-semibold">
                          {formatDZD(zone.minOrderAmount)}
                        </td>
                        <td className="p-4 text-stone-500">
                          ~{zone.estimatedMinutes} دقيقة
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            نشط
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ROLES TAB */}
        {activeTab === 'roles' && (
          <div className="max-w-4xl space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-lg font-bold text-stone-900">نظام الصلاحيات والأدوار في المرحلة الثانية</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-amber-900 text-sm">ADMIN (مسير المطعم)</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-900">كامل الصلاحيات</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    إدارة الطلبات، تغيير الحالات، تعديل الأسعار، ومناطق التوصيل.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-blue-900 text-sm">MANAGER (مشرف الصالة)</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-200 text-blue-900">إدارة الطلبات</span>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    استعراض الطلبات الجديدة، تأكيدها، ونقلها إلى قيد التحضير وجاهزة للتوصيل.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-emerald-900 text-sm">DELIVERY (مندوب التوصيل)</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">المهام القادمة</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    سيتم تخصيص واجهة مهام التوصيل المستقلة له في المرحلة الثالثة.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ORDER DETAILS MODAL FOR ADMIN (SECTION 20 & 21) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400 font-bold">تفاصيل الطلب:</span>
                  <span className="text-xl font-mono font-black text-white">{selectedOrder.orderNumber}</span>
                </div>
                <p className="text-xs text-stone-400">
                  تاريخ التسجيل: {formatAlgerianDateTime(selectedOrder.createdAt)}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Status Controller (SECTION 21) */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                <label className="block text-xs font-black text-amber-950">
                  تغيير حالة الطلب الحالية:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {(['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as OrderStatus[]).map((st) => (
                    <button
                      key={st}
                      disabled={updatingOrderId === selectedOrder.id}
                      onClick={() => handleStatusChange(selectedOrder.id, st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                        selectedOrder.status === st
                          ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                      }`}
                    >
                      {STATUS_LABELS[st]?.label || st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Driver Assignment Section */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-950">مندوب التوصيل</h4>
                      <p className="text-[11px] text-amber-800">
                        اختر مندوب التوصيل من القائمة النشطة ثم اضغط على زر إسناد
                      </p>
                    </div>
                  </div>

                  {selectedOrder.deliveryPerson && (
                    <a
                      href={`tel:${selectedOrder.deliveryPerson.phone}`}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-2xs"
                    >
                      <Phone className="w-3.5 h-3.5 fill-white" />
                      <span>اتصال</span>
                    </a>
                  )}
                </div>

                {/* Current Assigned Driver Badge */}
                {selectedOrder.deliveryPerson && (
                  <div className="p-2.5 rounded-xl bg-white border border-amber-300 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-stone-500 font-medium">المندوب المسند حالياً: </span>
                      <span className="font-black text-stone-900">{selectedOrder.deliveryPerson.name}</span>
                      <span className="text-stone-600 font-mono mr-2" dir="ltr">
                        ({formatAlgerianPhone(selectedOrder.deliveryPerson.phone)})
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={assigningOrderId === selectedOrder.id}
                      onClick={() => handleAssignDriver(selectedOrder.id, null)}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline"
                    >
                      إلغاء الإسناد
                    </button>
                  </div>
                )}

                {/* Assignment Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <select
                    disabled={assigningOrderId === selectedOrder.id}
                    value={selectedDriverIdForAssign}
                    onChange={(e) => setSelectedDriverIdForAssign(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:border-amber-600 shadow-2xs"
                  >
                    <option value="">-- اختر أحد المندوبين النشطين --</option>
                    {deliveryStaff
                      .filter((staff) => staff.isActive)
                      .map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} ({staff.phone})
                        </option>
                      ))}
                  </select>

                  <button
                    type="button"
                    disabled={
                      assigningOrderId === selectedOrder.id ||
                      !selectedDriverIdForAssign ||
                      selectedDriverIdForAssign === (selectedOrder.deliveryPersonId || '')
                    }
                    onClick={() => handleAssignDriver(selectedOrder.id, selectedDriverIdForAssign)}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-200 disabled:text-stone-400 text-stone-950 rounded-xl text-xs font-black shadow-xs transition-colors shrink-0"
                  >
                    {assigningOrderId === selectedOrder.id
                      ? 'جاري الحفظ...'
                      : selectedOrder.deliveryPersonId
                      ? 'تغيير المندوب'
                      : 'إسناد'}
                  </button>
                </div>
              </div>

              {/* Customer and Delivery info (SECTION 20) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5 text-xs">
                  <span className="font-bold text-stone-400 block text-[11px]">معلومات الزبون</span>
                  <div className="font-black text-sm text-stone-900">{selectedOrder.customerName}</div>
                  <div className="font-mono text-stone-700 font-bold" dir="ltr">
                    {formatAlgerianPhone(selectedOrder.customerPhone)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5 text-xs">
                  <span className="font-bold text-stone-400 block text-[11px]">عنوان التوصيل</span>
                  <div className="font-bold text-stone-800">
                    {selectedOrder.commune}، {selectedOrder.wilaya}
                  </div>
                  <div className="text-stone-600">
                    {selectedOrder.neighborhood} • {selectedOrder.address}
                  </div>
                  {selectedOrder.notes && (
                    <div className="text-amber-800 bg-amber-100/60 px-2 py-1 rounded-md text-[11px] font-medium mt-1">
                      ملاحظة: {selectedOrder.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Breakdown (FROZEN HISTORICAL VALUES) */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                <h4 className="font-bold text-stone-700">الوجبات في الطلب:</h4>
                <div className="divide-y divide-stone-200/80">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-stone-900">{item.productName}</span>
                        <div className="text-stone-500 text-[11px]">
                          الكمية: {item.quantity} × {formatDZD(item.unitPrice)}
                        </div>
                        {item.notes && (
                          <div className="text-stone-400 italic text-[11px]">ملاحظات: {item.notes}</div>
                        )}
                      </div>
                      <span className="font-black text-stone-900 text-sm">
                        {formatDZD(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Calculation Summary */}
                <div className="pt-3 border-t border-stone-200 space-y-1.5 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>مجموع الوجبات:</span>
                    <span className="font-bold">{formatDZD(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>سعر التوصيل:</span>
                    <span className="font-bold">{formatDZD(selectedOrder.deliveryFee)}</span>
                  </div>
                  <div className="pt-2 border-t border-stone-200 flex justify-between text-base font-black text-stone-950">
                    <span>المجموع الإجمالي:</span>
                    <span className="text-amber-600 font-black">{formatDZD(selectedOrder.total)}</span>
                  </div>
                  <div className="text-emerald-700 font-bold flex items-center gap-1 pt-1 text-[11px]">
                    <Banknote className="w-3.5 h-3.5" />
                    <span>الدفع عند الاستلام نقداً بالدينار الجزائري</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD DRIVER MODAL (PHASE 3) */}
      {isAddDriverModalOpen && (
        <div className="fixed inset-0 z-60 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-stone-950">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">إضافة مندوب توصيل جديد 🇩🇿</h3>
                  <p className="text-xs text-stone-400">إنشاء حساب جديد لمندوب التوصيل في النظام</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddDriverModalOpen(false)}
                className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="p-6 space-y-4">
              {newDriverError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{newDriverError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">اسم المندوب (الاسم واللقب)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حسام الدين براهيمي"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">رقم الهاتف الجزائري</label>
                <input
                  type="tel"
                  required
                  placeholder="05XXXXXXXX / 06XXXXXXXX / 07XXXXXXXX"
                  value={newDriver.phone}
                  onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-amber-500 font-mono"
                  dir="ltr"
                />
                <p className="text-[10px] text-stone-400 mt-1">يجب أن يبدأ بـ 05، 06، أو 07 ويتكون من 10 أرقام.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">البريد الإلكتروني للدخول</label>
                  <input
                    type="email"
                    required
                    placeholder="driver@elbahdja.dz"
                    value={newDriver.email}
                    onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">كلمة المرور (6 أحرف فأكثر)</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newDriver.password}
                    onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDriverModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={newDriverLoading}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {newDriverLoading ? 'جاري الحفظ...' : 'إضافة المندوب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DRIVER MODAL (PHASE 3) */}
      {editingDriver && (
        <div className="fixed inset-0 z-60 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">تعديل بيانات عامل التوصيل</h3>
                <p className="text-xs text-stone-400">{editingDriver.name}</p>
              </div>
              <button
                onClick={() => setEditingDriver(null)}
                className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDriver} className="p-6 space-y-4">
              {editDriverError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{editDriverError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">الاسم واللقب</label>
                <input
                  type="text"
                  required
                  value={editDriverForm.name || ''}
                  onChange={(e) => setEditDriverForm({ ...editDriverForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">رقم الهاتف الجزائري</label>
                <input
                  type="tel"
                  required
                  value={editDriverForm.phone || ''}
                  onChange={(e) => setEditDriverForm({ ...editDriverForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-amber-500 font-mono"
                  dir="ltr"
                />
              </div>

              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editDriverLoading}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {editDriverLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
