import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Search, Filter, Trash2, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';

const PaymentList = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    useEffect(() => {
        fetchPayments();
    }, [fromDate, toDate]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const params = {
                limit: 50,
                from_date: fromDate || undefined,
                to_date: toDate || undefined
            };

            const response = await api.get('/payments', { params });
            setPayments(response.data.payments);
        } catch (err) {
            console.error('Error fetching payments:', err);
            toast.error('Failed to load payments');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this payment record? Will roll back bill status.')) {
            try {
                await api.delete(`/payments/${id}`);
                toast.success('Payment deleted');
                fetchPayments();
            } catch (err) {
                toast.error('Failed to delete payment');
            }
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Payments</h2>
            </div>

            <div className="card mb-6">
                <div className="flex items-center gap-4">
                    <span className="text-gray-600 font-medium">Filter Date:</span>
                    <input
                        type="date"
                        className="form-input w-40"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                    <span className="text-gray-400">to</span>
                    <input
                        type="date"
                        className="form-input w-40"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Bill No</th>
                                    <th>Method</th>
                                    <th>Ref No</th>
                                    <th>Amount</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.length > 0 ? (
                                    payments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td>{new Date(payment.payment_date).toLocaleDateString('en-IN')}</td>
                                            <td>{new Date(payment.payment_date).toLocaleDateString('en-LK')}</td>
                                            <td className="font-medium text-gray-900">{payment.customer_name}</td>
                                            <td>
                                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                    {payment.bill_number}
                                                </span>
                                            </td>
                                            <td className="capitalize">{payment.payment_method?.replace('_', ' ')}</td>
                                            <td className="text-sm text-gray-500">{payment.reference_number || '-'}</td>
                                            <td className="font-bold text-green-600">LKR {parseFloat(payment.amount).toLocaleString('en-LK')}</td>
                                            <td>
                                                <button
                                                    onClick={() => handleDelete(payment.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete Payment"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-gray-500">
                                            No payments found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentList;
