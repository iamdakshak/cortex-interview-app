import { Link, NavLink, useNavigate } from "react-router-dom";
import { Brain, Code2, LogOut, Plus, Terminal, Layout as LayoutIcon, Compass, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Questions", icon: LayoutIcon },
  { to: "/daily", label: "Daily", icon: Calendar },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/compiler", label: "JS Compiler", icon: Terminal },
  { to: "/sandbox", label: "React Sandbox", icon: Code2 },
];

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4">
        <Link to="/" className="group flex items-center gap-2 font-semibold">
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <Brain className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            Cortex
          </span>
        </Link>

        <nav className="ml-4 hidden md:flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground",
                )
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" onClick={() => navigate("/new")} className="shadow-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          )}
          <ThemeToggle />
          {user ? (
            <>
              <NavLink
                to="/profile"
                className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors"
                title={user.email}
              >
                {user.email.split("@")[0]}
              </NavLink>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
