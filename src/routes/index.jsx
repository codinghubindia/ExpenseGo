import { Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import Accounts from '../pages/Accounts';
import Transactions from '../pages/Transactions';
import Categories from '../pages/Categories';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';

const AppRoutes = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
};

export default AppRoutes; 