import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Save, X, AlertCircle, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PAPER_SIZE_OPTIONS = ['A3', 'A4', 'A5', 'Legal', 'Letter'];

const OrderForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const customerIdParam = searchParams.get('customer_id');
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        customer_id: customerIdParam || '',
        order_date: new Date().toISOString().split('T')[0],
        job_description: '',
        job_type: 'printing',
        quantity: 1,
        rate: 0,
        notes: '',
        status: 'pending',
        received_at: null
    });

    const [paperSizes, setPaperSizes] = useState([{ size: '', amount: '' }]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const response = await api.get('/customers?limit=1000');
                setCustomers(response.data.customers);
            } catch (err) {
                console.error('Error fetching customers:', err);
                toast.error('Failed to load customers');
            }
        };
        fetchCustomers();

        if (isEditMode) {
            const fetchOrder = async () => {
                try {
                    setLoading(true);
                    const response = await api.get(`/orders/${id}`);
                    const order = response.data;
                    setFormData({
                        ...order,
                        order_date: order.order_date.split('T')[0]
                    });
                    if (order.paper_sizes) {
                        try {
                            const parsed = typeof order.paper_sizes === 'string'
                                ? JSON.parse(order.paper_sizes)
                                : order.paper_sizes;
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                setPaperSizes(parsed);
                            }
                        } catch (e) {
                            console.error('Error parsing paper_sizes:', e);
                        }
                    }
                } catch (err) {
                    setError('Failed to fetch order details');
                    toast.error('Could not load order details');
                } finally {
                    setLoading(false);
                }
            };
            fetchOrder();
        }
    }, [id, isEditMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Fetch suggestions for job_description
        if (name === 'job_description' && value.length >= 2) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(async () => {
                try {
                    const res = await api.get('/orders/suggestions/descriptions', { params: { q: value } });
                    setSuggestions(res.data.suggestions || []);
                    setShowSuggestions(true);
                } catch (e) {
                    setSuggestions([]);
                }
            }, 300);
        } else if (name === 'job_description') {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (text) => {
        setFormData(prev => ({ ...prev, job_description: text }));
        setShowSuggestions(false);
        setSuggestions([]);
    };

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePaperSizeChange = (index, field, value) => {
        const updated = [...paperSizes];
        updated[index] = { ...updated[index], [field]: value };
        setPaperSizes(updated);
    };

    const addPaperSize = () => {
        setPaperSizes(prev => [...prev, { size: '', amount: '' }]);
    };

    const removePaperSize = (index) => {
        if (paperSizes.length === 1) {
            setPaperSizes([{ size: '', amount: '' }]);
            return;
        }
        setPaperSizes(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const validPaperSizes = paperSizes.filter(ps => ps.size);

        try {
            const payload = {
                ...formData,
                paper_sizes: validPaperSizes.length > 0 ? validPaperSizes : null
            };

            if (isEditMode) {
                await api.put(`/orders/${id}`, payload);
                toast.success('Order updated successfully');
            } else {
                await api.post('/orders', payload);
                toast.success('Order created successfully');
            }
            navigate('/orders');
        } catch (err) {
            console.error('Error saving order:', err);
            const msg = err.response?.data?.errors?.[0]?.msg ||
                err.response?.data?.error ||
                'Failed to save order';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (isEditMode && loading && !formData.job_description) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                    {isEditMode ? 'Edit Order' : 'New Order'}
                </h2>
                <button
                    onClick={() => navigate('/orders')}
                    className="btn btn-secondary"
                >
                    <X size={18} /> Cancel
                </button>
            </div>

            <div className="card">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center">
                        <AlertCircle size={20} className="mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Customer Selection */}
                        <div className="form-group md:col-span-2">
                            <label className="form-label">Customer *</label>
                            <select
                                name="customer_id"
                                value={formData.customer_id}
                                onChange={handleChange}
                                className="form-select"
                                required
                                disabled={isEditMode || customerIdParam}
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} {c.phone ? `(${c.phone})` : ''} - {c.billing_type === 'monthly' ? 'Monthly' : 'Instant'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Order Date */}
                        <div className="form-group">
                            <label className="form-label">Order Date *</label>
                            <input
                                type="date"
                                name="order_date"
                                value={formData.order_date}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                        </div>

                        {/* Job Type */}
                        <div className="form-group">
                            <label className="form-label">Job Type *</label>
                            <select
                                name="job_type"
                                value={formData.job_type}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
                                <option value="printing">🖨 Printing Job</option>
                                <option value="design">✏ Design Job</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed (Ready to Bill)</option>
                                <option value="billed">Billed</option>
                            </select>
                        </div>

                        {/* Received At (read-only in edit mode) */}
                        {isEditMode && formData.received_at && (
                            <div className="form-group md:col-span-2">
                                <label className="form-label">Received At</label>
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 font-medium">
                                    📅 {new Date(formData.received_at).toLocaleString('en-LK', {
                                        year: 'numeric', month: 'long', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Job Description */}
                        <div className="form-group md:col-span-2" ref={suggestionsRef}>
                            <label className="form-label">Job Description *</label>
                            <div className="relative">
                                <textarea
                                    name="job_description"
                                    value={formData.job_description}
                                    onChange={handleChange}
                                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                                    className="form-textarea"
                                    placeholder="Describe the job details..."
                                    rows="3"
                                    required
                                    autoComplete="off"
                                />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {suggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-0 transition-colors"
                                                onClick={() => selectSuggestion(s)}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Paper Sizes */}
                        <div className="form-group md:col-span-2">
                            <label className="form-label">Paper Size & Amount per Unit</label>
                            <p className="text-xs text-gray-500 mb-3">Optional — Select paper sizes and amount needed per unit</p>
                            <div className="space-y-2">
                                {paperSizes.map((ps, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <select
                                            value={ps.size}
                                            onChange={(e) => handlePaperSizeChange(index, 'size', e.target.value)}
                                            className="form-select flex-1"
                                        >
                                            <option value="">Select Paper Size</option>
                                            {PAPER_SIZE_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={ps.amount}
                                            onChange={(e) => handlePaperSizeChange(index, 'amount', e.target.value)}
                                            className="form-input w-24"
                                            placeholder="Amt"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePaperSize(index)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addPaperSize}
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                                >
                                    <Plus size={14} /> Add Paper Size
                                </button>
                            </div>
                        </div>

                        {/* Quantity */}
                        <div className="form-group">
                            <label className="form-label">Quantity</label>
                            <input
                                type="number"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                onFocus={(e) => { if (parseFloat(e.target.value) === 1) setFormData(prev => ({ ...prev, quantity: '' })); }}
                                onBlur={(e) => { if (e.target.value === '') setFormData(prev => ({ ...prev, quantity: 1 })); }}
                                className="form-input"
                                min="0.01"
                                step="0.01"
                                placeholder="1"
                            />
                            <p className="text-xs text-gray-500 mt-1">Optional — can set at billing time</p>
                        </div>

                        {/* Rate */}
                        <div className="form-group">
                            <label className="form-label">Rate (LKR)</label>
                            <input
                                type="number"
                                name="rate"
                                value={formData.rate}
                                onChange={handleChange}
                                onFocus={(e) => { if (parseFloat(e.target.value) === 0) setFormData(prev => ({ ...prev, rate: '' })); }}
                                onBlur={(e) => { if (e.target.value === '') setFormData(prev => ({ ...prev, rate: 0 })); }}
                                className="form-input"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                            />
                            <p className="text-xs text-gray-500 mt-1">Optional — can set at billing time</p>
                        </div>

                        {/* Notes */}
                        <div className="form-group md:col-span-2">
                            <label className="form-label">Internal Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                className="form-textarea"
                                placeholder="Any internal notes..."
                                rows="2"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/orders')}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : isEditMode ? 'Update Order' : 'Create Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrderForm;
