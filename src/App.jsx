import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RoleRoute from './components/RoleRoute.jsx'
import Login from './pages/Login.jsx'
import DashboardHome from './pages/DashboardHome.jsx'
import StudentRegister from './pages/students/Register.jsx'
import ClassManagement from './pages/students/ClassManagement.jsx'
import StudentDateline from './pages/students/Dateline.jsx'
import StudentPayment from './pages/students/Payment.jsx'
import StudentBook from './pages/students/Book.jsx'
import StudentFinish from './pages/students/Finish.jsx'
import CategoryManagement from './pages/stock/Category.jsx'
import ProductManagement from './pages/stock/Product.jsx'
import POS from './pages/stock/POS.jsx'
import StockReport from './pages/stock/Report.jsx'
import UserManagement from './pages/admin/UserManagement.jsx'
import TeacherInfo from './pages/admin/TeacherInfo.jsx'
import StaffInfo from './pages/admin/StaffInfo.jsx'
import AuditLog from './pages/admin/AuditLog.jsx'
import FinanceOverview from './pages/finance/FinanceOverview.jsx'
import TuitionReport from './pages/finance/TuitionReport.jsx'
import PosRevenue from './pages/finance/PosRevenue.jsx'
import PendingPayments from './pages/finance/PendingPayments.jsx'
import CashFlowReport from './pages/finance/CashFlowReport.jsx'
import PaymentMethodReport from './pages/finance/PaymentMethodReport.jsx'
import FeePurposeReport from './pages/finance/FeePurposeReport.jsx'
import MonthlySummary from './pages/finance/MonthlySummary.jsx'
import StudentLedger from './pages/finance/StudentLedger.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route element={<RoleRoute />}>
              <Route index element={<DashboardHome />} />
              <Route path="/students/register" element={<StudentRegister />} />
              <Route path="/students/classes" element={<ClassManagement />} />
              <Route path="/students/dateline" element={<StudentDateline />} />
              <Route path="/students/payment" element={<StudentPayment />} />
              <Route path="/students/book" element={<StudentBook />} />
              <Route path="/students/finish" element={<StudentFinish />} />
              <Route path="/stock/category" element={<CategoryManagement />} />
              <Route path="/stock/product" element={<ProductManagement />} />
              <Route path="/stock/pos" element={<POS />} />
              <Route path="/stock/report" element={<StockReport />} />
              <Route path="/finance/overview" element={<FinanceOverview />} />
              <Route path="/finance/tuition" element={<TuitionReport />} />
              <Route path="/finance/pos-revenue" element={<PosRevenue />} />
              <Route path="/finance/pending" element={<PendingPayments />} />
              <Route path="/finance/cash-flow" element={<CashFlowReport />} />
              <Route path="/finance/methods" element={<PaymentMethodReport />} />
              <Route path="/finance/purpose" element={<FeePurposeReport />} />
              <Route path="/finance/monthly" element={<MonthlySummary />} />
              <Route path="/finance/student-ledger" element={<StudentLedger />} />
              <Route path="/admin/teachers" element={<TeacherInfo />} />
              <Route path="/admin/staff" element={<StaffInfo />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/audit-log" element={<AuditLog />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
