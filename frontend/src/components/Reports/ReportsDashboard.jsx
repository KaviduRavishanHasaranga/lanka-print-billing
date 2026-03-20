import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
    BarChart2,
    PieChart,
    Calendar,
    Download,
    TrendingUp,
    Users,
    FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const ReportsDashboard = () => {
    const [activeTab, setActiveTab] = useState('sales'); // sales, customers, payments
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState(null);

    // Filters
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
        endDate: new Date().toISOString().split('T')[0]
    });
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customers, setCustomers] = useState([]);

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        fetchReport();
    }, [activeTab, dateRange, selectedCustomerId]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers?limit=1000');
            setCustomers(response.data.customers);
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setReportData(null);
        setError(null);
        try {
            let endpoint = '';
            let params = {};

            if (activeTab === 'sales') {
                endpoint = '/reports/sales';
                params = {
                    from_date: dateRange.startDate,
                    to_date: dateRange.endDate,
                    group_by: 'day'
                };
            } else if (activeTab === 'customers') {
                if (!selectedCustomerId) {
                    setLoading(false);
                    return;
                }
                endpoint = `/reports/customer/${selectedCustomerId}`;
            } else if (activeTab === 'payments') {
                endpoint = '/reports/payments';
                params = {
                    from_date: dateRange.startDate,
                    to_date: dateRange.endDate
                };
            }

            if (endpoint) {
                const response = await api.get(endpoint, { params });
                setReportData(response.data);
            }
        } catch (err) {
            console.error('Error fetching report:', err);
            setError('Failed to load report data. Please check the connection and try again.');
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const renderSalesStats = () => {
        if (!reportData || !reportData.summary || !reportData.breakdown) return null;

        const summary = reportData.summary;
        const breakdown = reportData.breakdown || [];

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card bg-blue-50 border-blue-100">
                        <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
                        <p className="text-3xl font-bold text-blue-700 mt-2">
                            LKR {parseFloat(summary.total_revenue || 0).toLocaleString('en-LK')}
                        </p>
                    </div>
                    <div className="card bg-green-50 border-green-100">
                        <h3 className="text-gray-500 text-sm font-medium">Bills Generated</h3>
                        <p className="text-3xl font-bold text-green-700 mt-2">
                            {summary.bill_count || 0}
                        </p>
                    </div>
                    <div className="card bg-purple-50 border-purple-100">
                        <h3 className="text-gray-500 text-sm font-medium">Average Bill Value</h3>
                        <p className="text-3xl font-bold text-purple-700 mt-2">
                            LKR {summary.bill_count > 0
                                ? (parseFloat(summary.total_revenue) / summary.bill_count).toFixed(0)
                                : 0}
                        </p>
                    </div>
                </div>

                <div className="card">
                    <h3 className="font-semibold mb-4 text-gray-700">Daily Sales Breakdown</h3>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th className="text-right">Bills</th>
                                    <th className="text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {breakdown.map((item, index) => (
                                    <tr key={index}>
                                        <td>{new Date(item.date).toLocaleDateString('en-LK')}</td>
                                        <td className="text-right">{item.count}</td>
                                        <td className="text-right font-medium">LKR {parseFloat(item.total).toLocaleString('en-LK')}</td>
                                    </tr>
                                ))}
                                {breakdown.length === 0 && (
                                    <tr><td colSpan="3" className="text-center py-4">No sales in this period</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderCustomerStatement = () => {
        if (!selectedCustomerId) {
            return (
                <div className="card p-12 text-center text-gray-500">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Select a customer to view their statement</p>
                </div>
            );
        }

        if (!reportData || !reportData.customer || !reportData.summary) return null;

        const bills = reportData.bills || [];
        const payments = reportData.payments || [];

        return (
            <div className="space-y-6">
                <div className="card bg-gray-50">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{reportData.customer.name}</h3>
                            <p className="text-gray-600">{reportData.customer.phone}</p>
                            <p className="text-gray-600 truncate max-w-md">{reportData.customer.address}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Outstanding Balance</p>
                            <p className={`text-2xl font-bold ${reportData.summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                LKR {parseFloat(reportData.summary.balance).toLocaleString('en-LK')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="font-semibold mb-4 text-gray-700">Recent Transactions</h3>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Details</th>
                                    <th className="text-right">Amount</th>
                                    <th className="text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Combine bills and payments if API supports, or just show bills for now as per API design */}
                                {bills.map(bill => (
                                    <tr key={`bill-${bill.id}`}>
                                        <td>{new Date(bill.bill_date).toLocaleDateString('en-LK')}</td>
                                        <td><span className="badge badge-info shadow-none">Invoice</span></td>
                                        <td>#{bill.bill_number}</td>
                                        <td className="text-right font-medium">LKR {parseFloat(bill.total).toLocaleString('en-LK')}</td>
                                        <td className="text-right">
                                            <span className={`badge ${bill.payment_status === 'paid' ? 'badge-success' :
                                                    bill.payment_status === 'partial' ? 'badge-warning' : 'badge-danger'
                                                }`}>
                                                {bill.payment_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {payments.map(payment => (
                                    <tr key={`payment-${payment.id}`}>
                                        <td>{new Date(payment.payment_date).toLocaleDateString('en-LK')}</td>
                                        <td><span className="badge badge-success shadow-none">Payment</span></td>
                                        <td>Ref: {payment.reference_number || '-'} ({payment.payment_method})</td>
                                        <td className="text-right font-medium text-green-600">-LKR {parseFloat(payment.amount).toLocaleString('en-LK')}</td>
                                        <td className="text-right"><span className="badge badge-success">Received</span></td>
                                    </tr>
                                ))}
                                {bills.length === 0 && payments.length === 0 && (
                                    <tr><td colSpan="5" className="text-center py-4">No transactions found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderPaymentStats = () => {
        if (!reportData) return null;

        const payments = reportData.payments || [];
        const totalCollection = payments.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
        const totalTransactions = payments.reduce((sum, p) => sum + parseInt(p.payment_count || 0), 0);
        
        // Group by method
        const methodStats = payments.reduce((acc, curr) => {
            const method = curr.payment_method || 'other';
            if (!acc[method]) acc[method] = 0;
            acc[method] += parseFloat(curr.total_amount || 0);
            return acc;
        }, {});

        return (
            <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card bg-green-50 border-green-100">
                        <h3 className="text-gray-500 text-sm font-medium">Total Collection</h3>
                        <p className="text-3xl font-bold text-green-700 mt-2">
                            LKR {totalCollection.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="card bg-blue-50 border-blue-100">
                        <h3 className="text-gray-500 text-sm font-medium">Total Transactions</h3>
                        <p className="text-3xl font-bold text-blue-700 mt-2">
                            {totalTransactions}
                        </p>
                    </div>
                    <div className="card bg-purple-50 border-purple-100">
                        <h3 className="text-gray-500 text-sm font-medium">Payment Methods</h3>
                        <div className="mt-2 space-y-1">
                            {Object.entries(methodStats).map(([method, amount]) => (
                                <div key={method} className="flex justify-between text-sm">
                                    <span className="capitalize text-gray-600">{(method || '').replace('_', ' ')}:</span>
                                    <span className="font-bold text-purple-700">LKR {amount.toLocaleString('en-LK', { minimumFractionDigits: 0 })}</span>
                                </div>
                            ))}
                             {Object.keys(methodStats).length === 0 && <span className="text-gray-400 text-sm">No data</span>}
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-700">Payment History</h3>
                         <button className="btn btn-sm btn-secondary">
                           <Download size={14} /> Export CSV
                        </button>
                    </div>
                   
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Ref / Bill</th>
                                    <th>Method</th>
                                    <th className="text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment, index) => (
                                    <tr key={index}>
                                        <td>{new Date(payment.payment_date).toLocaleDateString('en-LK')}</td>
                                        <td>{payment.customer_name || 'Unknown'}</td>
                                        <td>
                                            <span className="text-gray-500 text-xs block">Inv: {payment.bill_number || '-'}</span>
                                        </td>
                                        <td>
                                            <span className="capitalize badge badge-secondary">
                                                {(payment.payment_method || 'other').replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="text-right font-medium text-green-600">
                                            LKR {parseFloat(payment.total_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                {payments.length === 0 && (
                                    <tr><td colSpan="5" className="text-center py-4">No payments found in this period</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports & Analytics</h2>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                <button
                    className={`py-3 px-6 font-medium whitespace-nowrap ${activeTab === 'sales'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('sales')}
                >
                    <div className="flex items-center gap-2">
                        <TrendingUp size={18} /> Sales Report
                    </div>
                </button>
                <button
                    className={`py-3 px-6 font-medium whitespace-nowrap ${activeTab === 'customers'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('customers')}
                >
                    <div className="flex items-center gap-2">
                        <Users size={18} /> Customer Statements
                    </div>
                </button>
                <button
                    className={`py-3 px-6 font-medium whitespace-nowrap ${activeTab === 'payments'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('payments')}
                >
                    <div className="flex items-center gap-2">
                        <FileText size={18} /> Payment Collection
                    </div>
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    {activeTab !== 'customers' && (
                        <>
                            <div className="w-full md:w-40">
                                <label className="form-label text-xs">Start Date</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={dateRange.startDate}
                                    onChange={handleDateChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="w-full md:w-40">
                                <label className="form-label text-xs">End Date</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={dateRange.endDate}
                                    onChange={handleDateChange}
                                    className="form-input"
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'customers' && (
                        <div className="w-full md:w-80">
                            <label className="form-label text-xs">Select Customer</label>
                            <select
                                value={selectedCustomerId}
                                onChange={(e) => setSelectedCustomerId(e.target.value)}
                                className="form-select"
                            >
                                <option value="">-- Choose Customer --</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex-1"></div>
                    {/* <button className="btn btn-secondary">
               <Download size={18} /> Export
            </button> */}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : error ? (
                <div className="card p-12 text-center">
                    <div className="text-red-500 text-lg font-semibold mb-2">⚠️ Error Loading Report</div>
                    <p className="text-gray-500 mb-4">{error}</p>
                    <button onClick={fetchReport} className="btn btn-primary">Retry</button>
                </div>
            ) : (
                <div>
                    {activeTab === 'sales' && renderSalesStats()}
                    {activeTab === 'customers' && renderCustomerStatement()}
                    {activeTab === 'payments' && renderPaymentStats()}
                </div>
            )}
        </div>
    );

};

export default ReportsDashboard;
