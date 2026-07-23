import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Contractors from './pages/Contractors';
import Payroll from './pages/Payroll';
import W2 from './pages/W2';
import Form1099 from './pages/Form1099';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
import Accounts from './pages/Accounts';
import Settings from './pages/Settings';
import IrsForms from './pages/IrsForms';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  if (!user || !token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/employees" element={<Protected><Employees /></Protected>} />
      <Route path="/contractors" element={<Protected><Contractors /></Protected>} />
      <Route path="/payroll" element={<Protected><Payroll /></Protected>} />
      <Route path="/w2" element={<Protected><W2 /></Protected>} />
      <Route path="/1099" element={<Protected><Form1099 /></Protected>} />
      <Route path="/invoices" element={<Protected><Invoices /></Protected>} />
      <Route path="/expenses" element={<Protected><Expenses /></Protected>} />
      <Route path="/accounts" element={<Protected><Accounts /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/irs-forms" element={<Protected><IrsForms /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
