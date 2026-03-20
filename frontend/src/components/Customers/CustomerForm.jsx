import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        billing_type: 'instant'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEditMode) {
            const fetchCustomer = async () => {
                try {
                    setLoading(true);
                    const response = await api.get(`/customers/${id}`);
                    setFormData(response.data);
                } catch (err) {
                    setError('Failed to fetch customer details');
                    toast.error('Could not load customer details');
                } finally {
                    setLoading(false);
                }
            };
            fetchCustomer();
        }
    }, [id, isEditMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isEditMode) {
                await api.put(`/customers/${id}`, formData);
                toast.success('Customer updated successfully');
            } else {
                await api.post('/customers', formData);
                toast.success('Customer created successfully');
            }
            navigate('/customers');
        } catch (err) {
            console.error('Error saving customer:', err);
            const msg = err.response?.data?.errors?.[0]?.msg ||
                err.response?.data?.error ||
                'Failed to save customer';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (isEditMode && loading && !formData.name) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                    {isEditMode ? 'Edit Customer' : 'New Customer'}
                </h2>
                <button
                    onClick={() => navigate('/customers')}
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
                        {/* Name */}
                        <div className="form-group md:col-span-2">
                            <label className="form-label">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Enter customer name"
                                required
                            />
                        </div>

                        {/* Phone */}
                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. 9876543210"
                            />
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. customer@example.com"
                            />
                        </div>

                        {/* Address */}
                        <div className="form-group md:col-span-2">
                            <label className="form-label">Address</label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="form-textarea"
                                placeholder="Enter full address"
                                rows="3"
                            />
                        </div>

                        {/* Billing Type */}
                        <div className="form-group">
                            <label className="form-label">Billing Type</label>
                            <select
                                name="billing_type"
                                value={formData.billing_type}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="instant">Instant Billing (Walk-in)</option>
                                <option value="monthly">Monthly Billing (Regular)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Monthly billing customers get consolidated bills at month end.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/customers')}
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
                            {loading ? 'Saving...' : isEditMode ? 'Update Customer' : 'Create Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerForm;
