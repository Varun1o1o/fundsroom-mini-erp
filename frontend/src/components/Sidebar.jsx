import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Boxes, 
  FileSpreadsheet, 
  LogOut,
  Sliders
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Sliders className="sidebar-logo-icon" size={24} />
          <span>FUNDSROOM ERP</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        <NavLink 
          to="/" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          end
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/customers" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>CRM Customers</span>
        </NavLink>

        <NavLink 
          to="/inventory" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Boxes size={20} />
          <span>Warehouse Stock</span>
        </NavLink>

        <NavLink 
          to="/challans" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <FileSpreadsheet size={20} />
          <span>Sales Challans</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar" title={user.name}>
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Sign Out">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
}
