import { cn } from "@shadcn/ui";

const Button = ({ children, className, ...props }) => {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-md text-white bg-blue-500 hover:bg-blue-600",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
