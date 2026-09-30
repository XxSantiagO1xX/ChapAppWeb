/**
 * ChapApp - Librería de Íconos Vectoriales Minimalistas React
 * Trazo geométrico fino (1.6px), estética Lucide/Feather con soporte de variantes.
 */

import React from 'react';
import {
  Menu,
  X,
  Plus,
  Search,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Moon,
  Sun,
  Users,
  User,
  UserPlus,
  Receipt,
  Wallet,
  Banknote,
  BarChart3,
  TrendingUp,
  Camera,
  Sparkles,
  FileText,
  Download,
  Upload,
  Archive,
  Trash2,
  Check,
  Edit2,
  Info,
  AlertTriangle,
  Utensils,
  Home,
  Bus,
  Wine,
  Folder,
  Calendar,
  Clock,
  Printer,
  LayoutGrid,
  RefreshCw,
  Settings,
  Key,
} from 'lucide-react';

const ICON_MAP = {
  menu: Menu,
  close: X,
  plus: Plus,
  search: Search,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  moon: Moon,
  sun: Sun,
  users: Users,
  user: User,
  'user-plus': UserPlus,
  receipt: Receipt,
  wallet: Wallet,
  cash: Banknote,
  chart: BarChart3,
  'trending-up': TrendingUp,
  camera: Camera,
  sparkles: Sparkles,
  file: FileText,
  download: Download,
  upload: Upload,
  archive: Archive,
  trash: Trash2,
  check: Check,
  edit: Edit2,
  info: Info,
  alert: AlertTriangle,
  food: Utensils,
  home: Home,
  bus: Bus,
  drink: Wine,
  folder: Folder,
  calendar: Calendar,
  clock: Clock,
  print: Printer,
  grid: LayoutGrid,
  refresh: RefreshCw,
  settings: Settings,
  key: Key,
};

export const Icon = ({ name, size = 18, strokeWidth = 1.6, className = '', color = 'currentColor', ...props }) => {
  if (name === 'whatsapp') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        className={`sculpted-svg-icon ${className}`}
        aria-hidden="true"
        {...props}
      >
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 01-1.25-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.83c.01 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.49-.4-.42-.56-.43-.14-.01-.31-.01-.47-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.71 4.29 3.8.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29z"/>
      </svg>
    );
  }

  const Component = ICON_MAP[name] || Info;
  return <Component size={size} strokeWidth={strokeWidth} className={`sculpted-svg-icon ${className}`} color={color} aria-hidden="true" {...props} />;
};

export default Icon;
