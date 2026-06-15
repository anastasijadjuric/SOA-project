import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import BlogsPage from './pages/BlogsPage.jsx';
import BlogDetailPage from './pages/BlogDetailPage.jsx';
import CreateBlogPage from './pages/CreateBlogPage.jsx';
import ToursPage from './pages/ToursPage.jsx';
import TourDetailPage from './pages/TourDetailPage.jsx';
import CreateTourPage from './pages/CreateTourPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import PositionSimulatorPage from './pages/PositionSimulatorPage.jsx';
import ShoppingCartPage from './pages/ShoppingCartPage.jsx';
import TourExecutionPage from './pages/TourExecutionPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/blogs" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/blogs" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/blogs" element={<ProtectedRoute><BlogsPage /></ProtectedRoute>} />
        <Route path="/blogs/create" element={<ProtectedRoute><CreateBlogPage /></ProtectedRoute>} />
        <Route path="/blogs/:id" element={<ProtectedRoute><BlogDetailPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/tours" element={<ProtectedRoute><ToursPage /></ProtectedRoute>} />
        <Route path="/tours/create" element={<ProtectedRoute roles={['guide']}><CreateTourPage /></ProtectedRoute>} />
        <Route path="/tours/:id" element={<ProtectedRoute><TourDetailPage /></ProtectedRoute>} />
        <Route path="/position" element={<ProtectedRoute roles={['tourist']}><PositionSimulatorPage /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute roles={['tourist']}><ShoppingCartPage /></ProtectedRoute>} />
        <Route path="/execution" element={<ProtectedRoute roles={['tourist']}><TourExecutionPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
