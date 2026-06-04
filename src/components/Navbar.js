import { cn } from "@shadcn/ui";

const Navbar = () => {
  return (
    <nav
      className={cn(
        "flex items-center justify-between p-4 bg-gray-800 text-white"
      )}
    >
      <div className="text-lg font-bold">SaaS App</div>
      <div className="space-x-4">
        <a href="/" className="hover:underline">
          Home
        </a>
        <a href="/about" className="hover:underline">
          About
        </a>
        <a href="/contact" className="hover:underline">
          Contact
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
