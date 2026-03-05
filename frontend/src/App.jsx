import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/EmployeeList';
import EmployeeProfile from './pages/EmployeeProfile';
import LeaveManagement from './pages/LeaveManagement';
import Payroll from './pages/Payroll';
import Documents from './pages/Documents';
import PrivateRoute from './components/PrivateRoute';

import Recruitment from './pages/Recruitment';
import JobDetails from './pages/JobDetails';
import ApplyJob from './pages/ApplyJob';
import ResignationSubmission from './pages/ResignationSubmission';
import ResignationList from './pages/ResignationList';
import PayrollSettings from './pages/PayrollSettings';
import AuditLogViewer from './pages/AuditLogViewer';
import RoleManager from './pages/RoleManager';
import AttendanceManager from './pages/AttendanceManager';
import PerformanceManager from './pages/PerformanceManager';
import ComplianceManager from './pages/ComplianceManager';
import OrgManager from './pages/OrgManager';
import WelfareLedger from './pages/WelfareLedger';
import ManualEntry from './pages/financial/ManualEntry';
import PerformanceSummary from './pages/PerformanceSummary';
import Governance from './pages/Governance';
import ConsolidatedSalarySheet from './pages/ConsolidatedSalarySheet';
import EPFFormC from './pages/EPFFormC';
import ETFFormR4 from './pages/ETFFormR4';


function App() {
    return (
        <Router>
            <AuthProvider>
                <Toaster position="top-right" reverseOrder={false} />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/apply/:id" element={<ApplyJob />} />

                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/my-performance" element={<PrivateRoute><PerformanceSummary /></PrivateRoute>} />
                    <Route path="/profile" element={<PrivateRoute><EmployeeProfile isMe={true} /></PrivateRoute>} />
                    <Route path="/employees" element={<PrivateRoute roles={['Admin', 'HR Manager']}><EmployeeList /></PrivateRoute>} />
                    <Route path="/employees/:id" element={<PrivateRoute><EmployeeProfile /></PrivateRoute>} />
                    <Route path="/leaves" element={<PrivateRoute><LeaveManagement /></PrivateRoute>} />
                    <Route path="/payroll" element={<PrivateRoute><Payroll /></PrivateRoute>} />
                    <Route path="/payroll/consolidated-sheet" element={<PrivateRoute roles={['Admin', 'HR Manager']}><ConsolidatedSalarySheet /></PrivateRoute>} />
                    <Route path="/payroll/epf-form-c" element={<PrivateRoute roles={['Admin', 'HR Manager']}><EPFFormC /></PrivateRoute>} />
                    <Route path="/payroll/etf-form-r4" element={<PrivateRoute roles={['Admin', 'HR Manager']}><ETFFormR4 /></PrivateRoute>} />
                    <Route path="/documents" element={<PrivateRoute><Documents /></PrivateRoute>} />
                    <Route path="/recruitment" element={<PrivateRoute><Recruitment /></PrivateRoute>} />
                    <Route path="/recruitment/jobs/:id" element={<PrivateRoute><JobDetails /></PrivateRoute>} />
                    <Route path="/resignations" element={<PrivateRoute><ResignationList /></PrivateRoute>} />
                    <Route path="/resignations/submit" element={<PrivateRoute><ResignationSubmission /></PrivateRoute>} />
                    <Route path="/payroll/settings" element={<PrivateRoute roles={['Admin', 'HR Manager']}><PayrollSettings /></PrivateRoute>} />
                    <Route path="/governance" element={<PrivateRoute roles={['Admin', 'HR Manager']}><Governance /></PrivateRoute>} />
                    <Route path="/audit-logs" element={<PrivateRoute><AuditLogViewer /></PrivateRoute>} />
                    <Route path="/security/roles" element={<PrivateRoute><RoleManager /></PrivateRoute>} />
                    <Route path="/attendance" element={<PrivateRoute><AttendanceManager /></PrivateRoute>} />
                    <Route path="/performance-manager" element={<PrivateRoute roles={['Admin', 'HR Manager']}><PerformanceManager /></PrivateRoute>} />
                    <Route path="/compliance-manager" element={<PrivateRoute roles={['Admin', 'HR Manager']}><ComplianceManager /></PrivateRoute>} />
                    <Route path="/org-manager" element={<PrivateRoute roles={['Admin', 'HR Manager']}><OrgManager /></PrivateRoute>} />
                    <Route path="/welfare-ledger" element={<PrivateRoute roles={['Admin', 'HR Manager']}><WelfareLedger /></PrivateRoute>} />
                    <Route path="/finance/manual-deduction" element={<PrivateRoute roles={['Admin', 'HR Manager']}><ManualEntry /></PrivateRoute>} />

                    <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
