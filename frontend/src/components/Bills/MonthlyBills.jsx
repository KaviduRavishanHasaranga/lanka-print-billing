import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Calendar, ChevronDown, ChevronUp, Save, ArrowLeft, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const MonthlyBills = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const [customers, setCustomers] = useState([]);
    const [expandedCustomers, setExpandedCustomers] = useState({});

    useEffect(() => {
        fetchUnbilledOrders();
    }, [month, year]);

    // Helper to format paper sizes into description suffix
    const formatPaperSizes = (paperSizesRaw) => {
        if (!paperSizesRaw) return '';
        try {
            const parsed = typeof paperSizesRaw === 'string' ? JSON.parse(paperSizesRaw) : paperSizesRaw;
            if (!Array.isArray(parsed) || parsed.length === 0) return '';
            const validSizes = parsed.filter(ps => ps.size);
            if (validSizes.length === 0) return '';
            return ' ( ' + validSizes.map(ps => `${ps.size}:${ps.amount || 1}`).join(' ') + ' )';
        } catch (e) {
            return '';
        }
    };

    const fetchUnbilledOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/orders/unbilled/monthly', {
                params: { month, year }
            });

            // Transform data: add editable qty/rate to each order
        const transformedCustomers = response.data.customers.map(c => ({
            ...c,
            selected: true,
            orders: c.orders
                // Sort: printing first, design second (backend already does this, just ensure consistency)
                .sort((a, b) => {
                    const typeOrder = (t) => t === 'printing' ? 0 : 1;
                    return typeOrder(a.job_type) - typeOrder(b.job_type) || new Date(a.order_date) - new Date(b.order_date);
                })
                .map(o => {
                    // Format order date as DD-MMM (e.g. 19-Mar)
                    const d = new Date(o.order_date);
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const dateStr = String(d.getDate()).padStart(2, '0') + '-' + months[d.getMonth()];
                    const baseDesc = (o.job_description || '') + formatPaperSizes(o.paper_sizes);
                    return {
                        ...o,
                        quantity: parseFloat(o.quantity) || 1,
                        rate: parseFloat(o.rate) || 0,
                        description: baseDesc + ' | ' + dateStr,
                        job_type: o.job_type || 'printing',
                    };
                })
        }));

            setCustomers(transformedCustomers);

            // Expand all by default
            const expanded = {};
            transformedCustomers.forEach(c => { expanded[c.customer_id] = true; });
            setExpandedCustomers(expanded);

        } catch (err) {
            console.error('Error fetching unbilled orders:', err);
            toast.error('Failed to load unbilled orders');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (customerId) => {
        setExpandedCustomers(prev => ({
            ...prev,
            [customerId]: !prev[customerId]
        }));
    };

    const toggleCustomerSelect = (customerId) => {
        setCustomers(prev => prev.map(c =>
            c.customer_id === customerId ? { ...c, selected: !c.selected } : c
        ));
    };

    const updateOrderField = (customerId, orderId, field, value) => {
        setCustomers(prev => prev.map(c => {
            if (c.customer_id !== customerId) return c;
            return {
                ...c,
                orders: c.orders.map(o => {
                    if (o.id !== orderId) return o;
                    return { ...o, [field]: value };
                })
            };
        }));
    };

    const getCustomerTotal = (customer) => {
        return customer.orders.reduce((sum, o) => {
            return sum + (parseFloat(o.quantity) || 0) * (parseFloat(o.rate) || 0);
        }, 0);
    };

    const getGrandTotal = () => {
        return customers
            .filter(c => c.selected)
            .reduce((sum, c) => sum + getCustomerTotal(c), 0);
    };

    const selectedCount = customers.filter(c => c.selected).length;

    const hasUnpricedItems = () => {
        return customers
            .filter(c => c.selected)
            .some(c => c.orders.some(o => parseFloat(o.rate) <= 0));
    };

    const generateBills = async () => {
        if (selectedCount === 0) {
            toast.error('Please select at least one customer');
            return;
        }

        if (hasUnpricedItems()) {
            if (!window.confirm('Some items have LKR 0 rate. Do you want to continue anyway?')) {
                return;
            }
        }

        if (!window.confirm(`Generate bills for ${selectedCount} customer(s) totaling LKR ${getGrandTotal().toLocaleString('en-LK', { minimumFractionDigits: 2 })}?`)) {
            return;
        }

        try {
            setGenerating(true);

            const payload = {
                month,
                year,
                customers: customers
                    .filter(c => c.selected)
                    .map(c => ({
                        customer_id: c.customer_id,
                        items: c.orders.map(o => ({
                            order_id: o.id,
                            description: o.description || o.job_description,
                            quantity: parseFloat(o.quantity) || 1,
                            rate: parseFloat(o.rate) || 0,
                        }))
                    }))
            };

            const response = await api.post('/bills/monthly/generate', payload);
            toast.success(`Successfully generated ${response.data.count} bill(s)!`);
            navigate('/bills');
        } catch (err) {
            console.error('Error generating bills:', err);
            toast.error('Failed to generate bills');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/bills')} className="btn btn-secondary p-2">
                        <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">Monthly Consolidated Billing</h2>
                </div>
            </div>

            {/* Month/Year Picker */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="w-full md:w-48">
                        <label className="form-label">Month</label>
                        <select
                            className="form-select"
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                        >
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-32">
                        <label className="form-label">Year</label>
                        <input
                            type="number"
                            className="form-input"
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            min="2020"
                            max="2100"
                        />
                    </div>
                    <div className="flex-1"></div>
                    <button
                        onClick={fetchUnbilledOrders}
                        className="btn btn-secondary"
                        disabled={loading}
                    >
                        Refresh List
                    </button>
                </div>
            </div>

            {/* Customer List with Editable Orders */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : customers.length === 0 ? (
                <div className="card p-12 text-center text-gray-500">
                    <div className="flex justify-center mb-4 text-gray-300">
                        <Calendar size={48} />
                    </div>
                    <p className="text-lg">No unbilled monthly orders found for {new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}</p>
                    <p className="text-sm mt-2">Check if orders are created with "Monthly Billing" customers.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {customers.map((customer) => (
                        <div key={customer.customer_id} className={`card p-0 overflow-hidden border-2 transition-colors ${customer.selected ? 'border-blue-200' : 'border-gray-100 opacity-60'}`}>
                            {/* Customer Header */}
                            <div
                                className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-4 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => toggleExpand(customer.customer_id)}
                            >
                                <input
                                    type="checkbox"
                                    checked={customer.selected}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        toggleCustomerSelect(customer.customer_id);
                                    }}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-800 text-lg">{customer.customer_name}</h3>
                                    <p className="text-sm text-gray-500">{customer.phone || customer.email || ''} · {customer.orders.length} order(s)</p>
                                </div>
                                <div className="text-right mr-4">
                                    <p className="text-sm text-gray-500">Subtotal</p>
                                    <p className="text-lg font-bold text-green-700">
                                        LKR {getCustomerTotal(customer).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                {expandedCustomers[customer.customer_id]
                                    ? <ChevronUp size={20} className="text-gray-400" />
                                    : <ChevronDown size={20} className="text-gray-400" />
                                }
                            </div>

                            {/* Expanded: Editable Order Items */}
                            {expandedCustomers[customer.customer_id] && (
                                <div className="p-4">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b">
                                                    <th className="pb-2 pr-2">Date</th>
                                                    <th className="pb-2 pr-2">Type</th>
                                                    <th className="pb-2 pr-2">Job Description</th>
                                                    <th className="pb-2 pr-2 w-28 text-right">Qty</th>
                                                    <th className="pb-2 pr-2 w-36 text-right">Rate (LKR)</th>
                                                    <th className="pb-2 w-36 text-right">Amount (LKR)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {customer.orders.map((order) => {
                                                    const amount = (parseFloat(order.quantity) || 0) * (parseFloat(order.rate) || 0);
                                                    const isPrinting = (order.job_type || 'printing') === 'printing';
                                                    return (
                                                        <tr key={order.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                                                            <td className="py-3 pr-2 text-gray-500 whitespace-nowrap">
                                                                {new Date(order.order_date).toLocaleDateString('en-LK')}
                                                            </td>
                                                            <td className="py-3 pr-2 whitespace-nowrap">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                                    isPrinting
                                                                        ? 'bg-blue-100 text-blue-700'
                                                                        : 'bg-purple-100 text-purple-700'
                                                                }`}>
                                                                    {isPrinting ? '🖨' : '✏'} {isPrinting ? 'Print' : 'Design'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 pr-2">
                                                                <input
                                                                    type="text"
                                                                    value={order.description}
                                                                    onChange={(e) => updateOrderField(customer.customer_id, order.id, 'description', e.target.value)}
                                                                    className="form-input py-1 text-sm w-full"
                                                                />
                                                            </td>
                                                            <td className="py-3 pr-2">
                                                                <input
                                                                    type="number"
                                                                    value={order.quantity}
                                                                    onChange={(e) => updateOrderField(customer.customer_id, order.id, 'quantity', e.target.value)}
                                                                    onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateOrderField(customer.customer_id, order.id, 'quantity', ''); }}
                                                                    onBlur={(e) => { if (e.target.value === '') updateOrderField(customer.customer_id, order.id, 'quantity', 1); }}
                                                                    className="form-input py-1 text-sm text-right w-full"
                                                                    min="0.01"
                                                                    step="0.01"
                                                                />
                                                            </td>
                                                            <td className="py-3 pr-2">
                                                                <input
                                                                    type="number"
                                                                    value={order.rate}
                                                                    onChange={(e) => updateOrderField(customer.customer_id, order.id, 'rate', e.target.value)}
                                                                    onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateOrderField(customer.customer_id, order.id, 'rate', ''); }}
                                                                    onBlur={(e) => { if (e.target.value === '') updateOrderField(customer.customer_id, order.id, 'rate', 0); }}
                                                                    className={`form-input py-1 text-sm text-right w-full ${parseFloat(order.rate) <= 0 ? 'border-orange-300 bg-orange-50' : ''}`}
                                                                    min="0"
                                                                    step="0.01"
                                                                    placeholder="Enter rate"
                                                                />
                                                            </td>
                                                            <td className="py-3 text-right font-medium text-gray-800">
                                                                {amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t-2 border-gray-300">
                                                    <td colSpan="5" className="pt-3 text-right font-semibold text-gray-600 pr-4">
                                                        Customer Total:
                                                    </td>
                                                    <td className="pt-3 text-right font-bold text-lg text-green-700">
                                                        LKR {getCustomerTotal(customer).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Summary & Generate */}
                    <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 sticky bottom-4">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <p className="text-gray-600 text-sm">{selectedCount} customer(s) selected</p>
                                <p className="text-2xl font-bold text-gray-800">
                                    Grand Total: <span className="text-blue-700">LKR {getGrandTotal().toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                                </p>
                                {hasUnpricedItems() && (
                                    <p className="text-orange-600 text-sm flex items-center gap-1 mt-1">
                                        <AlertCircle size={14} /> Some items have LKR 0 rate
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={generateBills}
                                className="btn btn-primary btn-lg px-8"
                                disabled={generating || selectedCount === 0}
                            >
                                <Save size={18} />
                                {generating ? 'Generating...' : `Generate ${selectedCount} Bill(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyBills;
