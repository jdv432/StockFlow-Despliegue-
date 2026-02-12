import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  History, 
  Settings, 
  HelpCircle, 
  Bell, 
  Menu,
  ChevronDown,
  LogOut,
  ChevronUp,
  X,
  Check,
  Info,
  AlertTriangle,
  ShoppingBag,
  Building2
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import AddProduct from './pages/AddProduct';
import Invoices from './pages/Invoices';
import Support from './pages/Support';
import FAQ from './pages/FAQ';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import RegisterSale from './pages/RegisterSale';
import HistoryPage from './pages/History';
import ChatBot from './components/ChatBot';

// --- Types ---

export interface Activity {
  id: number;
  user: string;
  action: string;
  target: string;
  time: Date;
  type: 'add' | 'sale' | 'edit' | 'alert' | 'invoice';
}

export interface CompanyData {
  name: string;
  id: string;
  logo: string;
}

// --- Helper Logic ---

const getStatus = (qty: number) => {
  if (qty === 0) return "Out of Stock";
  if (qty < 40) return "Low Stock";
  return "In Stock";
};

// --- Initial Data ---

const DEFAULT_COMPANY: CompanyData = {
  name: 'StockFlow Inc',
  id: 'team-728s-x912',
  logo: ''
};

const INITIAL_CATEGORIES = ["Electronics", "Accessories", "Monitors", "Furniture"];

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: "Low Stock Alert",
    message: "Wireless Optical Mouse is below 10 units.",
    time: "2 min ago",
    read: false,
    type: "alert"
  },
  {
    id: 2,
    title: "New Order Received",
    message: "Order #10234 has been placed successfully.",
    time: "15 min ago",
    read: false,
    type: "order"
  }
];

// Initial mock activities
const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 1,
    user: "Sarah J.",
    action: "added 50 units of",
    target: "HDMI Cables 2m",
    time: new Date(Date.now() - 1000 * 60 * 2), // 2 mins ago
    type: "add"
  },
  {
    id: 2,
    user: "System",
    action: "fulfilled order",
    target: "#10234 (3 items)",
    time: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    type: "sale"
  },
  {
    id: 3,
    user: "Mike T.",
    action: "updated price for",
    target: "Monitor Stand",
    time: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    type: "edit"
  },
  {
    id: 4,
    user: "System Alert",
    action: "Low stock for",
    target: "Wireless Mouse",
    time: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    type: "alert"
  }
];

const generateMockProducts = () => {
  const baseProducts = [
    {
      id: '1',
      name: "Wireless Optical Mouse",
      sku: "WM-001",
      category: "Electronics",
      price: "€25.00",
      qty: 150,
      status: getStatus(150),
      imgId: "4",
      date: "2023-10-15"
    },
    {
      id: '2',
      name: "Mechanical Keyboard RGB",
      sku: "KB-RGB-02",
      category: "Electronics",
      price: "€85.00",
      qty: 5,
      status: getStatus(5),
      imgId: "8",
      date: "2023-10-20"
    },
    {
      id: '3',
      name: "USB-C Cable 1m",
      sku: "CBL-C-01",
      category: "Accessories",
      price: "€12.00",
      qty: 0,
      status: getStatus(0),
      imgId: "0",
      date: "2023-11-01"
    },
    {
      id: '4',
      name: "Monitor 24 inch",
      sku: "MON-24-IPS",
      category: "Monitors",
      price: "€150.00",
      qty: 32,
      status: getStatus(32), // Now Low Stock based on < 40 rule
      imgId: "9",
      date: "2023-11-05"
    },
    {
      id: '5',
      name: "Laptop Stand",
      sku: "STND-LP-05",
      category: "Accessories",
      price: "€45.00",
      qty: 8,
      status: getStatus(8),
      imgId: "6",
      date: "2023-11-12"
    }
  ];

  const extraProducts = [];

  for (let i = 6; i <= 50; i++) {
    const category = INITIAL_CATEGORIES[Math.floor(Math.random() * INITIAL_CATEGORIES.length)];
    const price = (Math.random() * 200 + 10).toFixed(2);
    // Random qty between 0 and 100
    const qty = Math.floor(Math.random() * 100);
    const status = getStatus(qty);
    
    // Generate a random date within the last 3 months
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 90));
    const dateStr = date.toISOString().split('T')[0];

    extraProducts.push({
      id: i.toString(),
      name: `Product Sample ${i}`,
      sku: `SKU-${1000 + i}`,
      category: category,
      price: `€${price}`,
      qty: qty,
      status: status,
      imgId: (i % 50).toString(),
      date: dateStr
    });
  }

  return [...baseProducts, ...extraProducts];
};

const INITIAL_PRODUCTS = generateMockProducts();

// --- Components ---

const SidebarItem = ({ 
  to, 
  icon: Icon, 
  label, 
  active 
}: { 
  to: string; 
  icon: React.ElementType; 
  label: string; 
  active: boolean 
}) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
      active
        ? 'bg-primary-light text-primary dark:bg-primary/20 dark:text-blue-400'
        : 'text-text-secondary hover:bg-gray-100 hover:text-text-main dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
  </Link>
);

const NotificationItem = ({ notification, onClick }: { notification: any, onClick: () => void }) => {
  let Icon = Info;
  let bgClass = "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";

  if (notification.type === 'alert') {
    Icon = AlertTriangle;
    bgClass = "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
  } else if (notification.type === 'order') {
    Icon = ShoppingBag;
    bgClass = "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
  }

  return (
    <div 
      onClick={onClick}
      className={`p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
    >
      <div className="flex gap-3">
        <div className={`w-8 h-8 rounded-full ${bgClass} flex items-center justify-center shrink-0 mt-1`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-start gap-2">
            <h4 className={`text-sm font-semibold ${!notification.read ? 'text-text-main dark:text-white' : 'text-text-secondary dark:text-gray-400'}`}>
              {notification.title}
            </h4>
            <span className="text-[10px] text-gray-400 whitespace-nowrap">{notification.time}</span>
          </div>
          <p className="text-xs text-text-secondary dark:text-gray-500 leading-snug">
            {notification.message}
          </p>
          {!notification.read && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-primary mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Unread
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Redefine Layout to accept notifications props
interface LayoutProps {
  children?: React.ReactNode;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  onLogout: () => void;
  userRole: 'admin' | 'user';
  company: CompanyData;
}

const LayoutWithProps = ({ children, notifications, setNotifications, onLogout, userRole, company }: LayoutProps) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  // Initialize theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogoutClick = () => {
    setIsProfileMenuOpen(false);
    onLogout();
  };

  // Logic for notifications
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-text-main dark:text-gray-100 transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface-light dark:bg-surface-dark border-r border-gray-200 dark:border-gray-800 flex-shrink-0 z-20 transition-colors duration-300">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-primary">
            <div className="p-1 bg-primary rounded-lg text-white">
              <Package className="w-5 h-5" />
            </div>
            <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight tracking-tight">StockFlow</h2>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={isActive('/')} />
          <SidebarItem to="/inventory" icon={Package} label="Inventory" active={isActive('/inventory')} />
          <SidebarItem to="/invoices" icon={FileText} label="Invoices" active={isActive('/invoices')} />
          <SidebarItem to="/history" icon={History} label="History" active={isActive('/history')} />
          
          <div className="my-2 border-t border-gray-100 dark:border-gray-800"></div>
          
          <SidebarItem to="/settings" icon={Settings} label="Settings" active={isActive('/settings')} />
          <SidebarItem to="/support" icon={HelpCircle} label="Support" active={isActive('/support')} />
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 relative">
          
          {/* Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
              <div className="py-1">
                <button
                  onClick={handleLogoutClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </div>
          )}

          <button 
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left group ${isProfileMenuOpen ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <img 
              src="https://picsum.photos/id/64/100/100" 
              alt="Profile" 
              className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0" 
            />
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-sm font-medium truncate text-text-main dark:text-gray-200">
                {userRole === 'admin' ? 'John Doe' : 'Team User'}
              </p>
              <p className="text-xs truncate text-text-secondary dark:text-gray-400 capitalize">{userRole}</p>
            </div>
            <ChevronUp className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark px-4 lg:px-8 h-16 flex-shrink-0 z-10 transition-colors duration-300">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="lg:hidden p-2 -ml-2 text-text-secondary dark:text-gray-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Company Info Display (Replaces Search Bar) */}
            <div className="flex items-center gap-3">
              {company.logo ? (
                <img src={company.logo} alt="Company Logo" className="w-8 h-8 object-contain rounded-md" />
              ) : (
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Building2 className="w-4 h-4" />
                </div>
              )}
              <h1 className="font-bold text-lg text-text-main dark:text-white hidden md:block">
                {company.name}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Added VARONA Logo Image - Using Data URI to ensure visibility and removing hidden class */}
            <img 
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9ImJsYWNrIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiBsZXR0ZXItc3BhY2luZz0iMiI+VkFST05BPC90ZXh0Pjwvc3ZnPg==" 
              alt="VARONA" 
              className="h-8 w-auto object-contain rounded shadow-sm border border-gray-200 dark:border-gray-700" 
            />
            
            <button 
              onClick={() => setIsNotificationPanelOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-main dark:text-gray-200 transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-surface-light dark:border-surface-dark">
                  {unreadCount}
                </span>
              )}
            </button>
            <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></div>
            <Link to="/settings">
              <img 
                src="https://picsum.photos/id/64/100/100" 
                alt="Profile" 
                className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer" 
              />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth bg-background-light dark:bg-background-dark transition-colors duration-300 relative">
          {children}
          {/* ChatBot is placed here to be available on all pages */}
          <ChatBot />
        </main>
      </div>

      {/* Notification Panel (Right Sidebar) */}
      {isNotificationPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end isolate">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
            onClick={() => setIsNotificationPanelOpen(false)}
          ></div>
          
          {/* Panel */}
          <aside className="relative w-full max-w-sm h-full bg-surface-light dark:bg-surface-dark shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-surface-dark z-10">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-text-main dark:text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="p-2 text-text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Mark all as read"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={() => setIsNotificationPanelOpen(false)}
                  className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1">
              {notifications.length > 0 ? (
                <div className="flex flex-col">
                  {notifications.map(n => (
                    <NotificationItem 
                      key={n.id} 
                      notification={n} 
                      onClick={() => markAsRead(n.id)} 
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-text-secondary dark:text-gray-500">
                  <Bell className="w-12 h-12 mb-4 opacity-20" />
                  <p>No notifications yet</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex flex-col w-64 bg-surface-light dark:bg-surface-dark h-full shadow-xl">
             <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 text-primary">
                <Package className="w-6 h-6" />
                <h2 className="text-text-main dark:text-white text-lg font-bold">StockFlow</h2>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
              <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={isActive('/')} />
              <SidebarItem to="/inventory" icon={Package} label="Inventory" active={isActive('/inventory')} />
              <SidebarItem to="/invoices" icon={FileText} label="Invoices" active={isActive('/invoices')} />
              <SidebarItem to="/history" icon={History} label="History" active={isActive('/history')} />
              <div className="my-2 border-t border-gray-100 dark:border-gray-800"></div>
              <SidebarItem to="/settings" icon={Settings} label="Settings" active={isActive('/settings')} />
              <SidebarItem to="/support" icon={HelpCircle} label="Support" active={isActive('/support')} />
            </nav>
            {/* Mobile Logout Button (always visible at bottom) */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <button 
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const App = () => {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('admin');
  
  // Initialize Company state from LocalStorage to persist changes across sessions/users
  const [company, setCompany] = useState<CompanyData>(() => {
    try {
      const saved = localStorage.getItem('app_company_data');
      return saved ? JSON.parse(saved) : DEFAULT_COMPANY;
    } catch (e) {
      return DEFAULT_COMPANY;
    }
  });

  // Listen for storage changes (to sync across tabs/windows)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('app_company_data');
      if (saved) {
        setCompany(JSON.parse(saved));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const navigate = useNavigate();

  // Current user display name
  const currentUserName = userRole === 'admin' ? "John Doe" : "Team User";

  // Check auth state from localStorage on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    const storedRole = localStorage.getItem('userRole');
    
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
      if (storedRole === 'admin' || storedRole === 'user') {
        setUserRole(storedRole);
      }
    }
  }, []);

  const handleLogin = (role: 'admin' | 'user' = 'admin') => {
    setIsAuthenticated(true);
    setUserRole(role);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('admin'); // Reset to default
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    navigate('/login', { state: { fromLogout: true } });
  };

  const handleUpdateCompany = (data: Partial<CompanyData>) => {
    setCompany(prev => {
      const updated = { ...prev, ...data };
      // Persist to local storage so it affects all users (simulating backend)
      localStorage.setItem('app_company_data', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddCategory = (newCategory: string) => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories(prev => [...prev, newCategory]);
    }
  };

  const logActivity = (type: Activity['type'], user: string, action: string, target: string) => {
    const newActivity: Activity = {
      id: Date.now(),
      user,
      action,
      target,
      time: new Date(),
      type
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  const handleSaveProduct = (product: any) => {
    // Calculate changes and log activity BEFORE updating state
    const qty = Number(product.qty);
    const existingProduct = products.find(p => p.id === product.id);
    
    if (existingProduct) {
        const oldQty = Number(existingProduct.qty);
        if (qty > oldQty) {
            logActivity('add', currentUserName, `added ${qty - oldQty} units of`, product.name);
        } else if (qty < oldQty) {
             logActivity('edit', currentUserName, `removed ${oldQty - qty} units from`, product.name);
        } else if (existingProduct.price !== product.price) {
             logActivity('edit', currentUserName, 'updated price for', product.name);
        }

        // Logic for Alerts
        if (oldQty >= 40 && qty < 40 && qty > 0) {
             logActivity('alert', 'System Alert', 'Low stock warning for', product.name);
        }
        // Logic for Stock depleted
        if (oldQty > 0 && qty === 0) {
             logActivity('alert', 'System Alert', 'Stock depleted for', product.name);
        }
    } else {
        logActivity('add', currentUserName, 'created new product', product.name);
    }

    const status = getStatus(qty);
    const productWithStatus = {
      ...product,
      status: status
    };

    setProducts((prev) => {
      if (product.id) {
        return prev.map((p) => (p.id === productWithStatus.id ? productWithStatus : p));
      } else {
        const newProduct = {
          ...productWithStatus,
          id: Date.now().toString(),
        };
        return [newProduct, ...prev];
      }
    });

    // Check for user notifications (Toast/Panel)
    let newNotification = null;
    if (qty === 0) {
      newNotification = {
        id: Date.now(),
        title: "Out of Stock Alert",
        message: `${product.name} is now out of stock.`,
        time: "Just now",
        read: false,
        type: "alert"
      };
    } else if (qty < 40) {
      newNotification = {
        id: Date.now(),
        title: "Low Stock Alert",
        message: `${product.name} is running low (${qty} units remaining).`,
        time: "Just now",
        read: false,
        type: "alert"
      };
    }

    if (newNotification) {
      setNotifications(prev => [newNotification, ...prev]);
    }
  };

  const handleProcessSale = (soldItems: any[]) => {
    const newNotifications: any[] = [];

    // 1. Check for alerts based on current state BEFORE updating
    soldItems.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) {
        const newQty = Math.max(0, product.qty - item.qty);
        
        // Alert if stock becomes 0
        if (product.qty > 0 && newQty === 0) {
           logActivity('alert', 'System Alert', 'Stock depleted for', product.name);
           newNotifications.push({
             id: Date.now() + Math.random(), // Ensure unique ID
             title: "Out of Stock Alert",
             message: `${product.name} is now out of stock.`,
             time: "Just now",
             read: false,
             type: "alert"
           });
        } 
        // Alert if stock becomes low (< 40)
        else if (product.qty >= 40 && newQty < 40) {
           logActivity('alert', 'System Alert', 'Low stock warning for', product.name);
           newNotifications.push({
             id: Date.now() + Math.random(),
             title: "Low Stock Alert",
             message: `${product.name} is running low (${newQty} units remaining).`,
             time: "Just now",
             read: false,
             type: "alert"
           });
        }
      }
    });

    // 2. Update Products
    setProducts((currentProducts) => {
      return currentProducts.map((p) => {
        const soldItem = soldItems.find((item) => item.id === p.id);
        if (soldItem) {
          const newQty = Math.max(0, p.qty - soldItem.qty);
          const newStatus = getStatus(newQty);
          return {
            ...p,
            qty: newQty,
            status: newStatus
          };
        }
        return p;
      });
    });

    // 3. Log Sale Activity
    const totalItems = soldItems.reduce((acc, item) => acc + item.qty, 0);
    const orderId = `#${Math.floor(10000 + Math.random() * 90000)}`;
    logActivity('sale', currentUserName, 'fulfilled order', `${orderId} (${totalItems} items)`);

    // 4. Add Sale Completed notification
    newNotifications.push({
      id: Date.now(),
      title: "Sale Completed",
      message: `Sale registered for ${totalItems} items.`,
      time: "Just now",
      read: false,
      type: "order" // Using 'order' type for success/sale messages based on NotificationItem logic (shows green bag)
    });
    
    setNotifications(prev => [...newNotifications, ...prev]);
  };

  const handleAddInvoice = () => {
    // Simulation for invoice addition
    const invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`;
    logActivity('invoice', currentUserName, 'uploaded new invoice', invoiceId);
    
    const newNotification = {
      id: Date.now(),
      title: "Invoice Uploaded",
      message: `Invoice ${invoiceId} has been added successfully.`,
      time: "Just now",
      read: false,
      type: "success"
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/*" element={
        isAuthenticated ? (
          <LayoutWithProps 
            notifications={notifications} 
            setNotifications={setNotifications} 
            onLogout={handleLogout}
            userRole={userRole}
            company={company}
          >
            <Routes>
              <Route path="/" element={<Dashboard products={products} activities={activities} />} />
              <Route path="/register-sale" element={<RegisterSale products={products} onProcessSale={handleProcessSale} />} />
              <Route path="/inventory" element={<Inventory products={products} categories={categories} onDelete={handleDeleteProduct} />} />
              <Route 
                path="/add-product" 
                element={<AddProduct onSave={handleSaveProduct} products={products} categories={categories} onAddCategory={handleAddCategory} />} 
              />
              <Route 
                path="/edit-product/:id" 
                element={<AddProduct onSave={handleSaveProduct} products={products} categories={categories} onAddCategory={handleAddCategory} />} 
              />
              <Route path="/invoices" element={<Invoices onAddInvoice={handleAddInvoice} />} />
              <Route path="/history" element={<HistoryPage activities={activities} />} />
              <Route path="/support" element={<Support />} />
              <Route path="/faq" element={<FAQ />} />
              <Route 
                path="/settings" 
                element={
                  <SettingsPage 
                    userRole={userRole} 
                    company={company} 
                    onUpdateCompany={handleUpdateCompany} 
                  />
                } 
              />
              <Route path="*" element={<Dashboard products={products} activities={activities} />} />
            </Routes>
          </LayoutWithProps>
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  );
};

const AppWrapper = () => {
  return (
    <HashRouter>
      <App />
    </HashRouter>
  );
};

export default AppWrapper;