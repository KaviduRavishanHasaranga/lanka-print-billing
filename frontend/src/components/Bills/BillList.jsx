import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import {
    Plus,
    Eye,
    Trash2,
    Search,
    Filter,
    Calendar,
    AlertCircle,
    FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const BillList = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();

    const customerIdFilter = searchParams.get('customer_id') || '';
    const statusFilter = searchParams.get('payment_status') || '';
    const fromDate = searchParams.get('from_date') || '';
    const toDate = searchParams.get('to_date') || '';

    const [customers, setCustomers] = useState([]);

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        fetchBills();
    }, [customerIdFilter, statusFilter, fromDate, toDate]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers?limit=1000');
            setCustomers(response.data.customers);
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    };

    const fetchBills = async () => {
        try {
            setLoading(true);
            const params = {
                limit: 50,
                customer_id: customerIdFilter || undefined,
                payment_status: statusFilter || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined
            };

            const response = await api.get('/bills', { params });
            setBills(response.data.bills);
        } catch (err) {
            console.error('Error fetching bills:', err);
            toast.error('Failed to load bills');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this bill? This will specificy associated orders as unbilled.')) {
            try {
                await api.delete(`/bills/${id}`);
                toast.success('Bill deleted');
                fetchBills();
            } catch (err) {
                toast.error('Failed to delete bill');
            }
        }
    };

    const updateFilters = (key, value) => {
        if (value) {
            searchParams.set(key, value);
        } else {
            searchParams.delete(key);
        }
        setSearchParams(searchParams);
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Bills & Invoices</h2>
                <div className="flex gap-2">
                    <Link to="/bills/monthly" className="btn btn-secondary">
                        <Calendar size={18} /> Monthly Bills
                    </Link>
                    <Link to="/bills/new" className="btn btn-primary">
                        <Plus size={18} /> Create Instant Bill
                    </Link>
                </div>
            </div>

            <div className="card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <select
                            className="form-select"
                            value={customerIdFilter}
                            onChange={(e) => updateFilters('customer_id', e.target.value)}
                        >
                            <option value="">All Customers</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <select
                            className="form-select"
                            value={statusFilter}
                            onChange={(e) => updateFilters('payment_status', e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="partial">Partial</option>
                            <option value="unpaid">Unpaid</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            className="form-input"
                            value={fromDate}
                            onChange={(e) => updateFilters('from_date', e.target.value)}
                            placeholder="From"
                        />
                    </div>
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
                                    <th>Bill No</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bills.length > 0 ? (
                                    bills.map((bill) => (
                                        <tr key={bill.id}>
                                    <td className="font-medium text-gray-900">{bill.bill_number}</td>
                                    <td>{new Date(bill.bill_date).toLocaleDateString('en-LK')}</td>
                                    <td>
                                        <div className="font-medium text-gray-900">{bill.customer_name}</div>
                                        <div className="text-xs text-gray-500">{bill.customer_phone}</div>
                                    </td>
                                    <td>
                                        {bill.billing_period_start ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                                📅 Monthly
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                                ⚡ Instant
                                            </span>
                                        )}
                                    </td>
                                    <td className="font-medium">LKR {parseFloat(bill.total).toLocaleString('en-LK')}</td>
                                    <td>
                                        <div className="flex flex-col gap-1">
                                            <span className={`badge w-fit ${
                                                bill.payment_status === 'paid' ? 'badge-success' : 
                                                bill.payment_status === 'partial' ? 'badge-warning' : 'badge-danger'
                                            }`}>
                                                {bill.payment_status.toUpperCase()}
                                            </span>
                                            {parseFloat(bill.balance_amount) > 0 && (
                                                <span className="text-xs text-red-500 font-medium">
                                                    Bal: LKR {parseFloat(bill.balance_amount).toLocaleString('en-LK')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <Link to={`/bills/${bill.id}`} className="text-blue-500 hover:text-blue-700" title="View Bill">
                                                <Eye size={18} />
                                            </Link>
                                            <button 
                                                onClick={() => handleDelete(bill.id)}
                                                className="text-red-500 hover:text-red-700" 
                                                title="Delete Bill"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-gray-500">
                                            No bills found.
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

export default BillList;
