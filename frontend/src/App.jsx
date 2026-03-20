import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';

import CustomerList from './components/Customers/CustomerList';
import CustomerForm from './components/Customers/CustomerForm';
import OrderList from './components/Orders/OrderList';
import OrderForm from './components/Orders/OrderForm';
import BillList from './components/Bills/BillList';
import CreateBill from './components/Bills/CreateBill';
import BillPreview from './components/Bills/BillPreview';
import MonthlyBills from './components/Bills/MonthlyBills';
import PaymentList from './components/Payments/PaymentList';
import ReportsDashboard from './components/Reports/ReportsDashboard';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/customers/new" element={<CustomerForm />} />
              <Route path="/customers/:id/edit" element={<CustomerForm />} />
              <Route path="/orders" element={<OrderList />} />
              <Route path="/orders/new" element={<OrderForm />} />
              <Route path="/orders/:id/edit" element={<OrderForm />} />
              <Route path="/bills" element={<BillList />} />
              <Route path="/bills/new" element={<CreateBill />} />
              <Route path="/bills/monthly" element={<MonthlyBills />} />
              <Route path="/bills/:id" element={<BillPreview />} />
              <Route path="/payments" element={<PaymentList />} />
              <Route path="/reports" element={<ReportsDashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
}

export default App;
