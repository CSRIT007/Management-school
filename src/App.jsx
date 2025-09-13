import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import DashboardHome from './pages/DashboardHome.jsx'
// Student pages
import StudentRegister from './pages/students/Register.jsx'
import ClassManagement from './pages/students/ClassManagement.jsx'
import StudentDateline from './pages/students/Dateline.jsx'
import StudentPayment from './pages/students/Payment.jsx'
import StudentBook from './pages/students/Book.jsx'
import StudentFinish from './pages/students/Finish.jsx'
// Stock pages
import CategoryManagement from './pages/stock/Category.jsx'
import ProductManagement from './pages/stock/Product.jsx'
import POS from './pages/stock/POS.jsx'
import StockReport from './pages/stock/Report.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          {/* Student Management */}
          <Route path="/students/register" element={<StudentRegister />} />
          <Route path="/students/classes" element={<ClassManagement />} />
          <Route path="/students/dateline" element={<StudentDateline />} />
          <Route path="/students/payment" element={<StudentPayment />} />
          <Route path="/students/book" element={<StudentBook />} />
          <Route path="/students/finish" element={<StudentFinish />} />
          {/* Stock Management */}
          <Route path="/stock/category" element={<CategoryManagement />} />
          <Route path="/stock/product" element={<ProductManagement />} />
          <Route path="/stock/pos" element={<POS />} />
          <Route path="/stock/report" element={<StockReport />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

