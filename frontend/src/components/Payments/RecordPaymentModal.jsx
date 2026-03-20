import React, { useState } from 'react';
import api from '../../services/api';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const RecordPaymentModal = ({ billId, billTotal, onPaymentRecorded, onClose }) => {
    const outstandingAmount = Math.max(parseFloat(billTotal) || 0, 0);
    const [formData, setFormData] = useState({
        bill_id: billId,
        amount: outstandingAmount || '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash', // cash, upi, bank_transfer, cheque, card
        reference_number: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'amount') {
            if (value === '') {
                setFormData(prev => ({ ...prev, amount: '' }));
                return;
            }

            const numeric = parseFloat(value);
            if (Number.isNaN(numeric)) return;

            const cappedAmount = Math.min(numeric, outstandingAmount);
            setFormData(prev => ({
                ...prev,
                amount: cappedAmount.toString()
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAmountBlur = () => {
        const numeric = parseFloat(formData.amount);
        if (!Number.isNaN(numeric) && numeric > outstandingAmount) {
            setFormData(prev => ({ ...prev, amount: outstandingAmount.toString() }));
        }
    };

    const fillRemainingAmount = () => {
        setFormData(prev => ({ ...prev, amount: outstandingAmount.toString() }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (parseFloat(formData.amount) <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }

        if (parseFloat(formData.amount) > outstandingAmount) {
            toast.error('Payment amount cannot exceed outstanding balance');
            return;
        }

        setLoading(true);
        try {
            await api.post('/payments', formData);
            toast.success('Payment recorded successfully');
            if (onPaymentRecorded) onPaymentRecorded();
            onClose();
        } catch (err) {
            console.error('Error recording payment:', err);
            toast.error('Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800">Record Payment</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="form-group">
                        <label className="form-label">Payment Amount (LKR) *</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">LKR</span>
                            </div>
                            <input
                                type="number"
                                name="amount"
                                required
                                min="0"
                                step="0.01"
                                max={outstandingAmount}
                                className="form-input pl-12"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={handleChange}
                                onBlur={handleAmountBlur}
                            />
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                                Outstanding Balance: LKR {outstandingAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                            </p>
                            <button
                                type="button"
                                onClick={fillRemainingAmount}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2 py-0.5 transition-colors cursor-pointer"
                                title="Click to fill the full remaining amount"
                            >
                                Fill: LKR {outstandingAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Payment Date *</label>
                        <input
                            type="date"
                            name="payment_date"
                            value={formData.payment_date}
                            onChange={handleChange}
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Payment Method *</label>
                        <select
                            name="payment_method"
                            value={formData.payment_method}
                            onChange={handleChange}
                            className="form-select"
                        >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI / GPay / PhonePe</option>
                            <option value="bank_transfer">Bank Transfer / NEFT</option>
                            <option value="cheque">Cheque</option>
                            <option value="card">Credit/Debit Card</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Reference Number / Transaction ID</label>
                        <input
                            type="text"
                            name="reference_number"
                            value={formData.reference_number}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="e.g. UPI Ref ID or Cheque No"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            className="form-textarea h-20"
                            placeholder="Optional notes"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || outstandingAmount <= 0}
                        >
                            <Save size={18} />
                            {loading ? 'Recording...' : 'Save Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RecordPaymentModal;
