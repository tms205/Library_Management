import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

import BookManagement from './pages/BookManagement';
import MemberManagement from './pages/MemberManagement';

import BorrowBook from './pages/BorrowBook';
import ReturnBook from './pages/ReturnBook';

import SystemConfig from './pages/SystemConfig';

import ChangePassword from './pages/ChangePassword';

import ChangeEmail from './pages/ChangeEmail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route path="/books" element={<BookManagement />} />

        <Route path="/members" element={<MemberManagement />} />

        <Route path="/borrow" element={<BorrowBook />} />

        <Route path="/return" element={<ReturnBook />} />

        <Route path="/system-config" element={<SystemConfig />} />

        <Route path="/change-password" element={<ChangePassword />} />

        <Route path="/change-email" element={<ChangeEmail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
