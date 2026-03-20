import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Banknote, Users, FileText, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/reports/dashboard');
                setStats(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
                setError('Failed to load dashboard data');
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                <AlertCircle className="inline-block mr-2" size={20} />
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Today's Sales */}
                <div className="card p-5 border-l-4 border-blue-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Today's Sales</p>
                            <h3 className="text-2xl font-bold text-gray-800">
                                LKR {stats?.today?.sales?.toLocaleString('en-LK') || '0'}
                            </h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Banknote size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{stats?.today?.bills || 0}</span>
                        <span className="ml-1">invoices generated</span>
                    </div>
                </div>

                {/* Month Revenue */}
                <div className="card p-5 border-l-4 border-green-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Monthly Revenue</p>
                            <h3 className="text-2xl font-bold text-gray-800">
                                LKR {stats?.month?.revenue?.toLocaleString('en-LK') || '0'}
                            </h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <ArrowUpRight size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{stats?.month?.bills || 0}</span>
                        <span className="ml-1">total invoices</span>
                    </div>
                </div>

                {/* Pending Payments */}
                <div className="card p-5 border-l-4 border-orange-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Pending Payments</p>
                            <h3 className="text-2xl font-bold text-gray-800">
                                LKR {stats?.pending?.amount?.toLocaleString('en-LK') || '0'}
                            </h3>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <Clock size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-gray-500">
                        <span className="font-medium text-orange-600">{stats?.pending?.count || 0}</span>
                        <span className="ml-1">unpaid invoices</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
                <Link to="/bills/new" className="btn btn-primary btn-lg shadow-sm">
                    <FileText className="mr-2" size={20} />
                    Create New Bill
                </Link>
                <Link to="/customers" className="btn btn-secondary btn-lg shadow-sm bg-white border border-gray-200">
                    <Users className="mr-2" size={20} />
                    Manage Customers
                </Link>
            </div>

            {/* Recent Bills */}
            <div className="card shadow-sm">
                <div className="card-header flex justify-between items-center">
                    <h3 className="card-title text-gray-800">Recent Invoices</h3>
                    <Link to="/bills" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        View All
                    </Link>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Bill No</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recentBills?.map((bill) => (
                                <tr key={bill.id}>
                                    <td className="font-medium text-gray-900">{bill.bill_number}</td>
                                    <td>{new Date(bill.bill_date).toLocaleDateString('en-LK')}</td>
                                    <td>
                                        <div className="font-medium text-gray-900">{bill.customer_name}</div>
                                    </td>
                                    <td className="font-medium">LKR {parseFloat(bill.total).toLocaleString('en-LK')}</td>
                                    <td>
                                        <span className={`badge ${bill.payment_status === 'paid' ? 'badge-success' :
                                                bill.payment_status === 'partial' ? 'badge-warning' : 'badge-danger'
                                            }`}>
                                            {bill.payment_status?.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <Link to={`/bills/${bill.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {(!stats?.recentBills || stats.recentBills.length === 0) && (
                                <tr>
                                    <td colSpan="6" className="text-center py-6 text-gray-500">
                                        No recent bills found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
