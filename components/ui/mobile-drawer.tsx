"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

interface MobileDrawerProps {
  children: React.ReactNode;
  brandName: string;
}

export function MobileDrawer({ children, brandName }: MobileDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClick = () => setIsOpen(false);
    const drawer = document.getElementById("mobile-drawer-content");
    if (drawer) {
      const links = drawer.querySelectorAll("a");
      links.forEach((link) => link.addEventListener("click", handleClick));
      return () =>
        links.forEach((link) => link.removeEventListener("click", handleClick));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-card border-b border-border">
        <button
          id="mobile-menu-btn"
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-foreground">{brandName}</span>
        <div className="w-9" />
      </header>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        id="mobile-drawer-content"
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end p-3 border-b border-border">
          <button
            id="close-drawer-btn"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-56px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
