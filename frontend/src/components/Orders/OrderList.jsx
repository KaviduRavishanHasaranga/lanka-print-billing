import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import {
    Plus,
    Edit2,
    Trash2,
    Search,
    Filter,
    CheckCircle,
    Clock,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();

    const customerIdFilter = searchParams.get('customer_id') || '';
    const statusFilter = searchParams.get('status') || '';

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [customerIdFilter, statusFilter]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers?limit=1000');
            setCustomers(response.data.customers);
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = {
                limit: 50,
                customer_id: customerIdFilter || undefined,
                status: statusFilter || undefined
            };

            const response = await api.get('/orders', { params });
            setOrders(response.data.orders);
        } catch (err) {
            console.error('Error fetching orders:', err);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            try {
                await api.delete(`/orders/${id}`);
                toast.success('Order deleted');
                fetchOrders();
            } catch (err) {
                toast.error('Failed to delete order');
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return 'badge-warning';
            case 'in_progress': return 'badge-info';
            case 'completed': return 'badge-success';
            case 'billed': return 'bg-gray-100 text-gray-800';
            default: return 'badge-secondary';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock size={14} className="mr-1" />;
            case 'in_progress': return <AlertCircle size={14} className="mr-1" />;
            case 'completed': return <CheckCircle size={14} className="mr-1" />;
            default: return null;
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Orders & Jobs</h2>
                <Link to="/orders/new" className="btn btn-primary">
                    <Plus size={18} /> New Job Order
                </Link>
            </div>

            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
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
                    <div className="w-full md:w-48">
                        <select
                            className="form-select"
                            value={statusFilter}
                            onChange={(e) => updateFilters('status', e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="billed">Billed</option>
                        </select>
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
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Job Description</th>
                                    <th className="text-right">Qty</th>
                                    <th className="text-right">Rate</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length > 0 ? (
                                    orders.map((order) => (
                                        <tr key={order.id}>
                                            <td className="font-medium text-gray-900">
                                                {order.order_date
                                                    ? new Date(order.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : '—'}
                                                {(order.received_at || order.order_date) && (
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        {new Date(order.received_at || order.order_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="font-medium text-gray-900">{order.customer_name}</div>
                                                <div className="text-xs text-gray-500">{order.customer_phone}</div>
                                            </td>
                                            <td>
                                                <div className="max-w-md">{order.job_description}</div>
                                                {order.notes && (
                                                    <div className="text-xs text-gray-500 mt-1 italic">{order.notes}</div>
                                                )}
                                            </td>
                                            <td className="text-right">{parseFloat(order.quantity || 1)}</td>
                                            <td className="text-right">
                                                {parseFloat(order.rate || 0) > 0
                                                    ? `LKR ${parseFloat(order.rate).toLocaleString('en-LK')}`
                                                    : <span className="text-gray-400">—</span>
                                                }
                                            </td>
                                            <td className="whitespace-nowrap">
                                                <span className={`badge ${getStatusBadge(order.status)} flex w-fit`}>
                                                    {getStatusIcon(order.status)}
                                                    {order.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <Link
                                                        to={`/orders/${order.id}/edit`}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </Link>
                                                    {order.status !== 'billed' && (
                                                        <button
                                                            onClick={() => handleDelete(order.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-gray-500">
                                            No orders found.
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

export default OrderList;
