import { Outlet, NavLink } from "react-router-dom";
import { Link } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-muted/40 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r fixed h-full hidden md:block z-30">
        <div className="h-14 flex items-center px-6 border-b">
          <Link to="/" className="font-bold text-lg">PDI Admin</Link>
        </div>
        <nav className="p-4 space-y-2">
          <NavLink 
            to="/admin" 
            end
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`
            }
          >
            대시보드
          </NavLink>
          <NavLink 
            to="/admin/users" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`
            }
          >
            회원 관리
          </NavLink>
          <NavLink 
            to="/admin/payments" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`
            }
          >
            결제 내역
          </NavLink>
           <NavLink 
            to="/admin/report-logs" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`
            }
          >
            보고서 로그
          </NavLink>
          <NavLink 
            to="/admin/library" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`
            }
          >
            자료실 관리
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        <div className="h-14 border-b bg-background flex items-center px-6 sticky top-0 z-20">
          <h2 className="font-semibold">관리자 페이지</h2>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
