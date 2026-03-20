import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const PAPER_SIZE_OPTIONS = ['A3', 'A4', 'A5', 'Legal', 'Letter'];

const CreateBill = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        customer_id: '',
        bill_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days later
        items: [
            { description: '', quantity: 1, rate: 0, amount: 0, paperSizes: [{ size: '', amount: '' }] }
        ],
        notes: ''
    });

    // Autocomplete state
    const [descSuggestions, setDescSuggestions] = useState([]);
    const [activeDescIndex, setActiveDescIndex] = useState(null); // which item index is showing suggestions
    const descDebounceRef = useRef(null);
    const descSuggestionsRef = useRef(null);

    const totals = {
        subtotal: formData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0),
        total: formData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers?limit=1000');
            setCustomers(response.data.customers);
        } catch {
            toast.error('Failed to load customers');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'quantity' || field === 'rate') {
            const qty = parseFloat(field === 'quantity' ? value : newItems[index].quantity) || 0;
            const rate = parseFloat(field === 'rate' ? value : newItems[index].rate) || 0;
            newItems[index].amount = (qty * rate).toFixed(2);
        }

        setFormData(prev => ({ ...prev, items: newItems }));

        // Fetch suggestions for description
        if (field === 'description' && value.length >= 2) {
            if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
            descDebounceRef.current = setTimeout(async () => {
                try {
                    const res = await api.get('/orders/suggestions/descriptions', { params: { q: value } });
                    setDescSuggestions(res.data.suggestions || []);
                    setActiveDescIndex(index);
                } catch {
                    setDescSuggestions([]);
                }
            }, 300);
        } else if (field === 'description') {
            setDescSuggestions([]);
            setActiveDescIndex(null);
        }
    };

    const selectDescSuggestion = (itemIndex, text) => {
        const newItems = [...formData.items];
        newItems[itemIndex] = { ...newItems[itemIndex], description: text };
        setFormData(prev => ({ ...prev, items: newItems }));
        setDescSuggestions([]);
        setActiveDescIndex(null);
    };

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (descSuggestionsRef.current && !descSuggestionsRef.current.contains(e.target)) {
                setActiveDescIndex(null);
                setDescSuggestions([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { description: '', quantity: 1, rate: 0, amount: 0, paperSizes: [{ size: '', amount: '' }] }]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            items: newItems
        }));
    };

    // Paper size handlers per item
    const handleItemPaperSizeChange = (itemIndex, psIndex, field, value) => {
        const newItems = [...formData.items];
        const ps = [...(newItems[itemIndex].paperSizes || [{ size: '', amount: '' }])];
        ps[psIndex] = { ...ps[psIndex], [field]: value };
        newItems[itemIndex] = { ...newItems[itemIndex], paperSizes: ps };
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItemPaperSize = (itemIndex) => {
        const newItems = [...formData.items];
        const ps = [...(newItems[itemIndex].paperSizes || [])];
        ps.push({ size: '', amount: '' });
        newItems[itemIndex] = { ...newItems[itemIndex], paperSizes: ps };
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const removeItemPaperSize = (itemIndex, psIndex) => {
        const newItems = [...formData.items];
        let ps = [...(newItems[itemIndex].paperSizes || [])];
        if (ps.length <= 1) {
            ps = [{ size: '', amount: '' }];
        } else {
            ps = ps.filter((_, i) => i !== psIndex);
        }
        newItems[itemIndex] = { ...newItems[itemIndex], paperSizes: ps };
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    // Build description with paper sizes appended
    const buildDescriptionWithPaperSizes = (item) => {
        const validSizes = (item.paperSizes || []).filter(ps => ps.size);
        if (validSizes.length === 0) return item.description;
        const sizePart = validSizes.map(ps => `${ps.size}:${ps.amount || 1}`).join(' ');
        return `${item.description} ( ${sizePart} )`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.customer_id) {
            toast.error('Please select a customer');
            return;
        }

        if (formData.items.some(item => !item.description || item.amount <= 0)) {
            toast.error('Please fill all item details correctly');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                ...formData,
                items: formData.items.map(item => ({
                    description: buildDescriptionWithPaperSizes(item),
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: item.amount
                })),
                ...totals
            };

            const response = await api.post('/bills', payload);
            toast.success('Bill created successfully');
            navigate(`/bills/${response.data.id}`);
        } catch (err) {
            console.error('Error creating bill:', err);
            toast.error('Failed to create bill');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/bills')} className="btn btn-secondary p-2">
                        <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">Create New Bill</h2>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer & Dates */}
                <div className="card">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="form-group">
                            <label className="form-label">Customer *</label>
                            <select
                                name="customer_id"
                                value={formData.customer_id}
                                onChange={handleInputChange}
                                className="form-select"
                                required
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} {c.phone ? `(${c.phone})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Bill Date</label>
                            <input
                                type="date"
                                name="bill_date"
                                value={formData.bill_date}
                                onChange={handleInputChange}
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Address</label>
                            <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm h-24 overflow-y-auto">
                                {formData.customer_id
                                    ? customers.find(c => c.id == formData.customer_id)?.address || 'No address found'
                                    : 'Select a customer to view address'}
                            </div>
                        </div>


                    </div>
                </div>

                {/* Line Items */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Bill Items</h3>

                    <div className="space-y-4">
                        {formData.items.map((item, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-4 items-start bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex-1 w-full" ref={activeDescIndex === index ? descSuggestionsRef : null}>
                                    <label className="form-label text-xs">Description</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            onFocus={() => { if (descSuggestions.length > 0 && activeDescIndex === index) setActiveDescIndex(index); }}
                                            className="form-input"
                                            placeholder="Item description"
                                            required
                                            autoComplete="off"
                                        />
                                        {activeDescIndex === index && descSuggestions.length > 0 && (
                                            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                {descSuggestions.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-0 transition-colors"
                                                        onClick={() => selectDescSuggestion(index, s)}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Paper Sizes for this item */}
                                    <div className="mt-2 space-y-1">
                                        {(item.paperSizes || [{ size: '', amount: '' }]).map((ps, psIdx) => (
                                            <div key={psIdx} className="flex items-center gap-2">
                                                <select
                                                    value={ps.size}
                                                    onChange={(e) => handleItemPaperSizeChange(index, psIdx, 'size', e.target.value)}
                                                    className="form-select text-xs py-1 flex-1"
                                                >
                                                    <option value="">Paper Size</option>
                                                    {PAPER_SIZE_OPTIONS.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={ps.amount}
                                                    onChange={(e) => handleItemPaperSizeChange(index, psIdx, 'amount', e.target.value)}
                                                    className="form-input text-xs py-1 w-16"
                                                    placeholder="Amt"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeItemPaperSize(index, psIdx)}
                                                    className="p-1 text-red-400 hover:text-red-600"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addItemPaperSize(index)}
                                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                            <Plus size={12} /> Add Size
                                        </button>
                                    </div>
                                </div>

                                <div className="w-full md:w-24">
                                    <label className="form-label text-xs">Qty</label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                        onFocus={(e) => { if (parseFloat(e.target.value) === 1) handleItemChange(index, 'quantity', ''); }}
                                        onBlur={(e) => { if (e.target.value === '' || e.target.value === undefined) handleItemChange(index, 'quantity', 1); }}
                                        className="form-input"
                                        required
                                    />
                                </div>

                                <div className="w-full md:w-32">
                                    <label className="form-label text-xs">Rate (LKR)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.rate}
                                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                        onFocus={(e) => { if (parseFloat(e.target.value) === 0) handleItemChange(index, 'rate', ''); }}
                                        onBlur={(e) => { if (e.target.value === '' || e.target.value === undefined) handleItemChange(index, 'rate', 0); }}
                                        className="form-input"
                                        required
                                    />
                                </div>

                                <div className="w-full md:w-32">
                                    <label className="form-label text-xs">Amount (LKR)</label>
                                    <input
                                        type="number"
                                        value={item.amount}
                                        className="form-input bg-gray-100"
                                        disabled
                                    />
                                </div>

                                <div className="md:mt-6">
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                                        disabled={formData.items.length === 1}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addItem}
                        className="btn btn-secondary mt-4 w-full border-dashed"
                    >
                        <Plus size={18} /> Add Another Item
                    </button>
                </div>

                {/* Totals & Notes */}
                <div className="card">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1">
                            <label className="form-label">Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                className="form-textarea"
                                placeholder="Thank you for your business!"
                                rows="4"
                            />
                        </div>

                        <div className="w-full md:w-80 space-y-3">
                            <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                                <span>Subtotal:</span>
                                <span>LKR {totals.subtotal.toFixed(2)}</span>
                            </div>

                            <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-lg font-bold text-gray-800">
                                <span>Total Amount:</span>
                                <span>LKR {totals.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 sticky bottom-4 bg-white p-4 shadow-lg rounded-lg border border-gray-200">
                    <button
                        type="button"
                        onClick={() => navigate('/bills')}
                        className="btn btn-secondary lg:px-8"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary lg:px-8"
                        disabled={loading}
                    >
                        <Save size={18} />
                        {loading ? 'Creating...' : 'Create Bill'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateBill;
