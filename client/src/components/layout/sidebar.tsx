import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  FileText, 
  List, 
  Calculator, 
  Clock, 
  FolderOpen, 
  Upload, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/", icon: BarChart3, label: "Dashboard" },
  { href: "/generate-tender", icon: FileText, label: "Generate Tender" },
  { href: "/service-master", icon: List, label: "Service Master" },
  { href: "/pricing", icon: Calculator, label: "Pricing Schedule" },
  { href: "/well-times", icon: Clock, label: "Well Times" },
  { href: "/history", icon: FolderOpen, label: "Tender History" },
  { href: "/data-import", icon: Upload, label: "Data Import" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "text-industry-primary bg-industry-primary/10"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
