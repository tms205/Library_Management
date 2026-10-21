import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Forbidden from './pages/Forbidden';

import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';

import Dashboard from './pages/Dashboard';
import BookManagement from './pages/BookManagement';
import MemberManagement from './pages/MemberManagement';
import BorrowBook from './pages/BorrowBook';
import ReturnBook from './pages/ReturnBook';
import BorrowManagement from './pages/BorrowManagement';
import SystemConfig from './pages/SystemConfig';
import ChangePassword from './pages/ChangePassword';
import ChangeEmail from './pages/ChangeEmail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ========================================================
            PUBLIC AUTH ROUTES
            ======================================================== */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/403" element={<Forbidden />} />

        {/* ========================================================
            PROTECTED APPLICATION ROUTES (Wrapped in MainLayout)
            Sidebar remains permanently mounted across all nested routes
            ======================================================== */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Tra cứu danh sách sách: BOOK_VIEW */}
            <Route element={<PermissionRoute permissions={['BOOK_VIEW']} />}>
              <Route path="/books" element={<BookManagement />} />
            </Route>

            {/* Quản lý sách chuyên sâu (Staff/Admin): BOOK_CREATE, BOOK_UPDATE, BOOK_DELETE, BOOK_IMPORT */}
            <Route
              element={
                <PermissionRoute
                  permissions={['BOOK_CREATE', 'BOOK_UPDATE', 'BOOK_DELETE', 'BOOK_IMPORT']}
                />
              }
            >
              <Route path="/books/manage" element={<BookManagement />} />
            </Route>

            {/* Quản lý thành viên: MEMBER_VIEW */}
            <Route element={<PermissionRoute permissions={['MEMBER_VIEW']} />}>
              <Route path="/members" element={<MemberManagement />} />
            </Route>

            {/* Mượn sách: BORROW_BOOK */}
            <Route element={<PermissionRoute permissions={['BORROW_BOOK']} />}>
              <Route path="/borrow" element={<BorrowBook />} />
            </Route>

            {/* Sách của tôi: BORROW_BOOK hoặc RETURN_BOOK */}
            <Route element={<PermissionRoute permissions={['BORROW_BOOK', 'RETURN_BOOK']} />}>
              <Route path="/return" element={<ReturnBook />} />
              <Route path="/my-books" element={<ReturnBook />} />
            </Route>

            {/* Quản lý mượn/trả (Staff/Admin): BORROW_APPROVE hoặc RETURN_CONFIRM */}
            <Route
              element={
                <PermissionRoute permissions={['BORROW_APPROVE', 'RETURN_CONFIRM']} />
              }
            >
              <Route path="/borrow-management" element={<BorrowManagement />} />
            </Route>

            {/* Cấu hình hệ thống (Admin): SYSTEM_MAINTENANCE */}
            <Route element={<PermissionRoute permissions={['SYSTEM_MAINTENANCE']} />}>
              <Route path="/system-config" element={<SystemConfig />} />
            </Route>

            {/* Tiện ích tài khoản cá nhân */}
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/change-email" element={<ChangeEmail />} />
          </Route>
        </Route>

        {/* ========================================================
            FALLBACK ROUTE
            ======================================================== */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
