'use client';

import { use, useState, useEffect } from 'react';
import { CreditCard, History, Settings, Shield, Zap, RefreshCw, Check, X, Search, MoreVertical, DollarSign, Globe } from 'lucide-react';
import { api } from '@/utils/api';

export default function PaymentsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [activeTab, setActiveTab] = useState<'transactions' | 'methods' | 'products'>('transactions');
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Filtering & Pagination
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [gatewayFilter, setGatewayFilter] = useState('');
    const [datePreset, setDatePreset] = useState('all');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [stats, setStats] = useState<{ total_revenue: number; count: number }>({ total_revenue: 0, count: 0 });
    const [page, setPage] = useState(0);
    const transactionsPerPage = 50;

    // Modal States
    const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
    const [showProductModal, setShowProductModal] = useState<boolean>(false);
    const [productFormData, setProductFormData] = useState({
        gateway: 'google_play',
        product_id: '',
        name: '',
        description: '',
        amount: '',
        currency: 'INR'
    });
    const [formData, setFormData] = useState({
        api_key: '',
        api_secret: '',
        webhook_url: '',
        webhook_secret: '',
        is_enabled: true
    });

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/payments/${id}/config`);
            setConfigs(data || []);
        } catch (e) {
            console.error("Failed to fetch configs", e);
        } finally {
            setLoading(false);
        }
    };

    const getFilterParams = () => {
        const params = new URLSearchParams({
            limit: transactionsPerPage.toString(),
            offset: (page * transactionsPerPage).toString(),
            search,
            status: statusFilter,
            gateway: gatewayFilter
        });

        let startDate = '';
        let endDate = '';
        const now = new Date();

        if (datePreset === 'today') {
            startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        } else if (datePreset === 'yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            startDate = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
            endDate = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
        } else if (datePreset === '7days') {
            const d = new Date(now);
            d.setDate(now.getDate() - 7);
            startDate = d.toISOString();
        } else if (datePreset === '30days') {
            const d = new Date(now);
            d.setDate(now.getDate() - 30);
            startDate = d.toISOString();
        } else if (datePreset === '90days') {
            const d = new Date(now);
            d.setDate(now.getDate() - 90);
            startDate = d.toISOString();
        } else if (datePreset === 'this_month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        } else if (datePreset === 'last_month') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();
        } else if (datePreset === 'custom' && customRange.start && customRange.end) {
            startDate = new Date(customRange.start).toISOString();
            endDate = new Date(new Date(customRange.end).setHours(23, 59, 59, 999)).toISOString();
        }

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        return params;
    };

    const fetchTransactions = async () => {
        try {
            const params = getFilterParams();
            const data = await api.get(`/payments/${id}/transactions?${params.toString()}`);
            setTransactions(data || []);

            // Also fetch stats for the same filters
            const statsData = await api.get(`/payments/${id}/transactions/stats?${params.toString()}`);
            setStats(statsData || { total_revenue: 0, count: 0 });
        } catch (e) {
            console.error("Failed to fetch transactions", e);
        }
    };

    const fetchProducts = async () => {
        try {
            const params = getFilterParams();
            // Clear unnecessary params for products endpoint
            params.delete('limit');
            params.delete('offset');
            params.delete('search');
            params.delete('status');

            const data = await api.get(`/payments/${id}/products/active?${params.toString()}`);
            setProducts(data || []);
        } catch (e) {
            console.error("Failed to fetch products", e);
        }
    };

    useEffect(() => {
        if (id && activeTab === 'products') {
            fetchProducts();
        }
    }, [id, activeTab, gatewayFilter, datePreset, customRange]);

    useEffect(() => {
        if (id && activeTab === 'transactions') {
            fetchTransactions();
        }
    }, [id, activeTab, search, statusFilter, gatewayFilter, datePreset, customRange, page]);

    const openConfig = (gateway: string) => {
        const existing = configs.find(c => c.gateway === gateway);
        setFormData({
            api_key: existing?.api_key || '',
            api_secret: existing?.api_secret || '',
            webhook_url: existing?.webhook_url || '',
            webhook_secret: existing?.webhook_secret || '',
            is_enabled: existing?.is_enabled ?? true
        });
        setShowConfigModal(gateway);
    };

    const handleSaveConfig = async () => {
        if (!showConfigModal) return;
        setIsSaving(true);
        try {
            await api.post(`/payments/${id}/config`, {
                gateway: showConfigModal,
                ...formData
            });
            await fetchConfigs();
            setShowConfigModal(null);
        } catch (err: any) {
            alert("Error saving configuration: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProduct = async () => {
        setIsSaving(true);
        try {
            await api.post(`/payments/${id}/products`, productFormData);
            await fetchProducts();
            setShowProductModal(false);
            setProductFormData({
                gateway: 'google_play',
                product_id: '',
                name: '',
                description: '',
                amount: '',
                currency: 'INR'
            });
        } catch (err: any) {
            alert("Error saving product: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (productId: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            await api.delete(`/payments/${id}/products/${productId}`);
            await fetchProducts();
        } catch (err: any) {
            alert("Error deleting product");
        }
    };

    const getGatewayStatus = (gateway: string) => {
        const config = configs.find(c => c.gateway === gateway);
        return config?.is_enabled ? 'Enabled' : 'Disabled';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Suguna Payment</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage payment gateway integrations and track transactions.</p>
                    </div>
                </div>

                <div className="flex gap-8 mt-8 border-b border-gray-100">
                    <div
                        onClick={() => setActiveTab('transactions')}
                        className={`pb-3 text-sm font-medium cursor-pointer transition-all ${activeTab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        Transactions
                    </div>
                    <div
                        onClick={() => setActiveTab('methods')}
                        className={`pb-3 text-sm font-medium cursor-pointer transition-all ${activeTab === 'methods' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        Payment Methods
                    </div>
                    <div
                        onClick={() => setActiveTab('products')}
                        className={`pb-3 text-sm font-medium cursor-pointer transition-all ${activeTab === 'products' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        Products / SKUs
                    </div>
                </div>
            </div>

            {activeTab === 'methods' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <GatewayCard
                        name="Razorpay"
                        description="Seamless UPI and Card payments for Indian users."
                        icon={<img src="https://razorpay.com/favicon.png" className="h-8 w-8" alt="" />}
                        status={getGatewayStatus('razorpay')}
                        onConfigure={() => openConfig('razorpay')}
                    />
                    <GatewayCard
                        name="Cashfree"
                        description="Powerful checkout and auto-collect APIs."
                        icon={<img src="https://www.cashfree.com/favicon.ico" className="h-8 w-8" alt="" />}
                        status={getGatewayStatus('cashfree')}
                        onConfigure={() => openConfig('cashfree')}
                    />
                    <GatewayCard
                        name="Google Play"
                        description="Native Android billing for digital goods and subscriptions."
                        icon={<img src="https://www.gstatic.com/android/market_images/web/favicon_v2.ico" className="h-8 w-8" alt="" />}
                        status={getGatewayStatus('google_play')}
                        onConfigure={() => openConfig('google_play')}
                    />
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Activity</h3>
                                <div className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    Total: ₹ {Number(stats.total_revenue || 0).toLocaleString()} ({stats.count} Txns)
                                </div>
                            </div>
                            <button className="text-xs text-blue-600 font-bold hover:underline whitespace-nowrap">Download Report</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search UID / Txn ID"
                                    className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                />
                            </div>

                            <select
                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                                value={datePreset}
                                onChange={(e) => { setDatePreset(e.target.value); setPage(0); }}
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="7days">Last 7 Days</option>
                                <option value="30days">Last 30 Days</option>
                                <option value="90days">Last 90 Days</option>
                                <option value="this_month">This Month</option>
                                <option value="last_month">Last Month</option>
                                <option value="custom">Custom Range</option>
                            </select>

                            <select
                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                                value={gatewayFilter}
                                onChange={(e) => { setGatewayFilter(e.target.value); setPage(0); }}
                            >
                                <option value="">All Gateways</option>
                                <option value="razorpay">Razorpay</option>
                                <option value="cashfree">Cashfree</option>
                                <option value="google_play">Google In-App</option>
                            </select>

                            <select
                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                            >
                                <option value="">All Status</option>
                                <option value="CREATED">Created</option>
                                <option value="SUCCESS">Success</option>
                                <option value="PENDING">Pending</option>
                                <option value="FAILED">Failed</option>
                                <option value="REFUNDED">Refunded</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        {datePreset === 'custom' && (
                            <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-blue-800">Start:</label>
                                    <input
                                        type="date"
                                        className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs outline-none"
                                        value={customRange.start}
                                        onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-blue-800">End:</label>
                                    <input
                                        type="date"
                                        className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs outline-none"
                                        value={customRange.end}
                                        onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="min-h-[400px]">
                        {transactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 text-center">
                                <History className="h-12 w-12 text-gray-200 mb-4" />
                                <h3 className="text-gray-900 font-semibold">No transactions found</h3>
                                <p className="text-gray-500 text-sm mt-1">Transactions will appear here once users start paying.</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200 font-sans">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Transaction ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">User ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Gateway</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((txn: any) => (
                                        <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-mono text-gray-600">{txn.id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{txn.app_user_id || 'Anonymous'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                {new Date(txn.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{txn.currency} {txn.amount}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-500 capitalize">{txn.gateway}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${txn.status === 'SUCCESS' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    txn.status === 'FAILED' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        txn.status === 'REFUNDED' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                            txn.status === 'CANCELLED' ? 'bg-gray-50 text-gray-600 border-gray-100' :
                                                                txn.status === 'CREATED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                    'bg-orange-50 text-orange-600 border-orange-100'
                                                    }`}>
                                                    {txn.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {transactions.length > 0 && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-sm font-medium">
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                                className="px-4 py-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-gray-500">Page {page + 1}</span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={transactions.length < transactionsPerPage}
                                className="px-4 py-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'products' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-4">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Detected Products / SKUs</h3>
                                    <button
                                        onClick={() => fetchProducts()}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Refresh List"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowProductModal(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                                >
                                    <Zap className="h-3.5 w-3.5" />
                                    Add SKU Manually
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <select
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                                    value={datePreset}
                                    onChange={(e) => { setDatePreset(e.target.value); }}
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="7days">Last 7 Days</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="90days">Last 90 Days</option>
                                    <option value="this_month">This Month</option>
                                    <option value="last_month">Last Month</option>
                                    <option value="custom">Custom Range</option>
                                </select>

                                <select
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                                    value={gatewayFilter}
                                    onChange={(e) => { setGatewayFilter(e.target.value); }}
                                >
                                    <option value="">All Gateways</option>
                                    <option value="razorpay">Razorpay</option>
                                    <option value="cashfree">Cashfree</option>
                                    <option value="google_play">Google In-App</option>
                                </select>
                            </div>

                            {datePreset === 'custom' && (
                                <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-blue-800">Start:</label>
                                        <input
                                            type="date"
                                            className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs outline-none"
                                            value={customRange.start}
                                            onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-blue-800">End:</label>
                                        <input
                                            type="date"
                                            className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs outline-none"
                                            value={customRange.end}
                                            onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">SKU / Product ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Gateway</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Total Sales</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Revenue</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Last Sold</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic text-sm">
                                            No products detected yet. SKUs will appear here automatically after the first successful purchase.
                                        </td>
                                    </tr>
                                ) : (
                                    products.map(p => (
                                        <tr key={`${p.product_id}-${p.gateway}`} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-mono text-blue-600 font-bold">{p.product_id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 capitalize">{p.gateway.replace('_', ' ')}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 font-bold">{p.total_sales}</td>
                                            <td className="px-6 py-4 text-sm text-green-600 font-bold">₹ {p.total_revenue}</td>
                                            <td className="px-6 py-4 text-right text-xs text-gray-400">
                                                {new Date(p.last_sold).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Product Modal */}
            {showProductModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Add Product / SKU</h2>
                            <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Target Gateway</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
                                    value={productFormData.gateway}
                                    onChange={(e) => setProductFormData({ ...productFormData, gateway: e.target.value })}
                                >
                                    <option value="google_play">Google Play</option>
                                    <option value="razorpay">Razorpay</option>
                                    <option value="cashfree">Cashfree</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Product ID (SKU) from {productFormData.gateway === 'google_play' ? 'Play Console' : 'Gateway'}</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono text-sm"
                                    placeholder="e.g. premium_monthly"
                                    value={productFormData.product_id}
                                    onChange={(e) => setProductFormData({ ...productFormData, product_id: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Display Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
                                    placeholder="e.g. Monthly Premium"
                                    value={productFormData.name}
                                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Amount</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm"
                                        placeholder="0.00"
                                        value={productFormData.amount}
                                        onChange={(e) => setProductFormData({ ...productFormData, amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Currency</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
                                        placeholder="INR"
                                        value={productFormData.currency}
                                        onChange={(e) => setProductFormData({ ...productFormData, currency: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowProductModal(false)} className="px-6 py-2.5 text-sm font-bold text-gray-600">Cancel</button>
                            <button onClick={handleSaveProduct} disabled={isSaving} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Add SKU
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Configuration Modal */}
            {showConfigModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 capitalize">{showConfigModal} Setup</h2>
                            <button onClick={() => setShowConfigModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div>
                                    <p className="text-sm font-bold text-blue-900">Enable Gateway</p>
                                    <p className="text-xs text-blue-700">Allow users to pay using this method.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={formData.is_enabled} onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    {showConfigModal === 'google_play' ? 'Service Account JSON' : 'API Key / Client ID'}
                                </label>
                                {showConfigModal === 'google_play' ? (
                                    <textarea
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                                        rows={8}
                                        value={formData.api_key}
                                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                        placeholder="Paste your Google Service Account .json content here..."
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                                        value={formData.api_key}
                                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                        placeholder={`Enter ${showConfigModal} Key`}
                                    />
                                )}
                            </div>

                            {showConfigModal !== 'google_play' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">API Secret</label>
                                    <input
                                        type="password"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                                        value={formData.api_secret}
                                        onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                                        placeholder="Enter Secret"
                                    />
                                </div>
                            )}

                            {showConfigModal === 'google_play' && (
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                                    <Shield className="h-5 w-5 text-amber-600 shrink-0" />
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        For Google Play, you need to create a <b>Service Account</b> in the Google Cloud Console with the <b>Google Play Android Developer</b> role, then generate a JSON key and paste its content above.
                                    </p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="h-4 w-4 text-orange-500" />
                                    <h3 className="text-sm font-bold text-gray-900">App Webhook (Critical)</h3>
                                </div>
                                <p className="text-xs text-gray-500 mb-3">
                                    SugunaBase will send payment notifications to this URL.
                                </p>

                                <div className="space-y-4">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-blue-500" />
                                        SugunaBase Webhook Endpoint (Copy to {showConfigModal === 'razorpay' ? 'Razorpay' : showConfigModal === 'cashfree' ? 'Cashfree' : 'Google Play'} Console)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`https://api.suguna.co/webhook/payments/${showConfigModal}`}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-700 text-sm font-mono"
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`https://api.suguna.co/webhook/payments/${showConfigModal}`);
                                                alert("Webhook URL Copied!");
                                            }}
                                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs text-white font-bold"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 mt-4">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-orange-500" />
                                        Your Server Webhook (Target)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="https://your-server.com/api/suguna-webhook"
                                        value={formData.webhook_url}
                                        onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Where SugunaBase should notify your backend after successful payment.
                                    </p>
                                </div>

                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                    value={formData.webhook_secret}
                                    onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                                    placeholder="Custom Webhook Secret (HMAC)"
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowConfigModal(null)} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900">Cancel</button>
                            <button onClick={handleSaveConfig} disabled={isSaving} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2">
                                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Save Integration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function GatewayCard({ name, description, icon, status, onConfigure }: any) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    {icon}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${status === 'Enabled' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                    {status}
                </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{name}</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">{description}</p>
            <button onClick={onConfigure} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Settings className="h-4 w-4" />
                Configure
            </button>
        </div>
    );
}
