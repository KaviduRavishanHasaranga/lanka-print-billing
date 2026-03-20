import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    FileText,
    Printer,
    CreditCard,
    BarChart3,
    Menu,
    X, 
    LogOut
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Handle screen resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsMobile(true);
                setIsSidebarOpen(false);
            } else {
                setIsMobile(false);
                setIsSidebarOpen(true);
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: '/customers', label: 'Customers', icon: <Users size={20} /> },
        { path: '/orders', label: 'Orders & Jobs', icon: <FileText size={20} /> },
        { path: '/bills', label: 'Billing', icon: <Printer size={20} /> },
        { path: '/payments', label: 'Payments', icon: <CreditCard size={20} /> },
        { path: '/reports', label: 'Reports', icon: <BarChart3 size={20} /> },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">
            {/* Mobile Overlay */}
            {isMobile && isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed md:static inset-y-0 left-0 z-30
                    bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col
                    ${isSidebarOpen ? 'w-64 translate-x-0' : (isMobile ? '-translate-x-full w-64' : 'w-20 translate-x-0')}
                `}
            >
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
                    <div className={`flex items-center gap-2 ${!isSidebarOpen && !isMobile ? 'justify-center w-full' : ''}`}>
                         <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                            <Printer />
                         </div>
                         {(isSidebarOpen || isMobile) && (
                            <h1 className="font-bold text-xl text-gray-800 truncate">Lanka Print Studio</h1>
                         )}
                    </div>
                    {/* Only show toggle button on desktop here, mobile toggle is in header */}
                    {!isMobile && (
                        <button onClick={toggleSidebar} className="p-1 rounded-md hover:bg-gray-100 text-gray-600">
                            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    )}
                    {isMobile && (
                         <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-md hover:bg-gray-100 text-gray-600">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-2">
                        {navItems.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    onClick={() => isMobile && setIsSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group
                                    ${location.pathname === item.path
                                            ? 'bg-blue-50 text-blue-600 font-medium shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                    title={!isSidebarOpen && !isMobile ? item.label : ''}
                                >
                                    <span className={`shrink-0 transition-colors ${location.pathname === item.path ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                        {item.icon}
                                    </span>
                                    {(isSidebarOpen || isMobile) && (
                                        <span className="truncate">{item.label}</span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-red-600 hover:bg-red-50 transition-colors ${!isSidebarOpen && !isMobile ? 'justify-center' : ''}`}
                    >
                        <LogOut size={20} />
                        {(isSidebarOpen || isMobile) && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col w-full relative">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        {isMobile && (
                            <button onClick={toggleSidebar} className="p-2 -ml-2 rounded-md hover:bg-gray-100 text-gray-600">
                                <Menu size={24} />
                            </button>
                        )}
                        <h2 className="text-lg font-semibold text-gray-800">
                            {navItems.find(item => item.path === location.pathname)?.label || 'Billing System'}
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-sm font-medium text-gray-700">{user?.displayName || 'User'}</span>
                            <span className="text-xs text-gray-500">{new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white">
                            {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-6 flex-1 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
