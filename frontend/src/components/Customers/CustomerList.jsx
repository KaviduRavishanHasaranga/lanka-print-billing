import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    Phone,
    Mail,
    FileText,
    Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerList = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [billingType, setBillingType] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const params = {
                limit: 50,
                offset: page * 50,
                search,
                billing_type: billingType || undefined
            };

            const response = await api.get('/customers', { params });
            setCustomers(response.data.customers);
            setTotal(response.data.total);
        } catch (err) {
            console.error('Error fetching customers:', err);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0);
            fetchCustomers();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, billingType]);

    // Handle page change
    useEffect(() => {
        fetchCustomers();
    }, [page]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this customer? This will also delete their order history.')) {
            try {
                await api.delete(`/customers/${id}`);
                toast.success('Customer deleted');
                fetchCustomers();
            } catch (err) {
                toast.error('Failed to delete customer');
            }
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Customers</h2>
                <Link to="/customers/new" className="btn btn-primary">
                    <Plus size={18} /> Add Customer
                </Link>
            </div>

            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or email..."
                            className="form-input pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <select
                            className="form-select"
                            value={billingType}
                            onChange={(e) => setBillingType(e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="instant">Instant Billing</option>
                            <option value="monthly">Monthly Billing</option>
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
                                    <th>Name</th>
                                    <th>Contact</th>
                                    <th>Billing Type</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.length > 0 ? (
                                    customers.map((customer) => (
                                        <tr key={customer.id}>
                                            <td>
                                                <div className="font-medium text-gray-900">{customer.name}</div>
                                                {customer.address && (
                                                    <div className="text-xs text-gray-500 truncate max-w-xs">{customer.address}</div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex flex-col gap-1">
                                                    {customer.phone && (
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Phone size={14} className="mr-1" /> {customer.phone}
                                                        </div>
                                                    )}
                                                    {customer.email && (
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Mail size={14} className="mr-1" /> {customer.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${customer.billing_type === 'monthly' ? 'badge-info' : 'badge-success'
                                                    }`}>
                                                    {customer.billing_type === 'monthly' ? 'Monthly' : 'Instant'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <Link
                                                        to={`/customers/${customer.id}/edit`}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </Link>
                                                    <Link
                                                        to={`/orders?customer_id=${customer.id}`}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                                                        title="View Orders"
                                                    >
                                                        <FileText size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(customer.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-gray-500">
                                            No customers found. Try changing the search filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination could be added here if needed */}
                    <div className="p-4 border-t border-gray-200 text-sm text-gray-500">
                        Showing {customers.length} of {total} customers
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerList;
