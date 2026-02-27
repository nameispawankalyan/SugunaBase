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

    const fetchTransactions = async () => {
        try {
            const data = await api.get(`/payments/${id}/transactions`);
            setTransactions(data || []);
        } catch (e) {
            console.error("Failed to fetch transactions", e);
        }
    };

    const fetchProducts = async () => {
        try {
            const data = await api.get(`/payments/${id}/products/active`);
            setProducts(data || []);
        } catch (e) {
            console.error("Failed to fetch products", e);
        }
    };

    useEffect(() => {
        if (id) {
            fetchConfigs();
            if (activeTab === 'transactions') fetchTransactions();
            if (activeTab === 'products') fetchProducts();
        }
    }, [id, activeTab]);

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
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Recent Activity</h3>
                        <button className="text-xs text-blue-600 font-bold hover:underline">Download Report</button>
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
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{txn.currency} {txn.amount}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-500 capitalize">{txn.gateway}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${txn.status === 'SUCCESS' ? 'bg-green-50 text-green-600 border-green-100' : txn.status === 'FAILED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                    {txn.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'products' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Detected Products / SKUs</h3>
                            <p className="text-xs text-gray-500">Automatically detected from your app's transaction history.</p>
                        </div>
                        <button
                            onClick={() => fetchProducts()}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Refresh List"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
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
